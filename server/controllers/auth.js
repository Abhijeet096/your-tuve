import mongoose from "mongoose";
import crypto from "crypto";
import users from "../Modals/Auth.js";
import { sendOtpEmail } from "../lib/mailer.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_GAP_MS = 30 * 1000;

export const themeforist = (now = new Date()) => {
  const ist = new Date(now.getTime() + 330 * 60 * 1000);
  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return minutes >= 600 && minutes < 720 ? "light" : "dark";
};

const hashotp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

const same = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

const safeuser = (u) => {
  const obj = u.toObject();
  delete obj.pendingotp;
  return obj;
};

const maskemail = (email) => {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 3))}@${domain}`;
};

const remember = (u, { city, state, country, deviceid, devicelabel }) => {
  const now = new Date();
  if (city || state) {
    const loc = u.knownlocations.find((l) => same(l.city, city) && same(l.state, state));
    if (loc) loc.lastseen = now;
    else u.knownlocations.push({ city, state, country, lastseen: now });
  }
  if (deviceid) {
    const dev = u.knowndevices.find((d) => d.deviceid === deviceid);
    if (dev) {
      dev.lastseen = now;
      if (devicelabel) dev.label = devicelabel;
    } else u.knowndevices.push({ deviceid, label: devicelabel, lastseen: now });
  }
};

const finishlogin = async (u, context) => {
  remember(u, context);
  u.pendingotp = undefined;
  if (u.themesource !== "manual") u.theme = themeforist();
  await u.save();
  return safeuser(u);
};

const startotp = async (u, context) => {
  const otp = crypto.randomInt(100000, 1000000).toString();
  u.pendingotp = {
    hash: hashotp(otp),
    expires: new Date(Date.now() + OTP_TTL_MS),
    attempts: 0,
    city: context.city,
    state: context.state,
    country: context.country,
    deviceid: context.deviceid,
    devicelabel: context.devicelabel,
    sentat: new Date(),
  };
  await u.save();
  const mail = await sendOtpEmail({
    to: u.email,
    otp,
    city: context.city,
    state: context.state,
    device: context.devicelabel,
  });
  return mail.previewUrl;
};

const readcontext = (body) => ({
  city: (body.city || "").slice(0, 80),
  state: (body.state || "").slice(0, 80),
  country: (body.country || "").slice(0, 80),
  deviceid: (body.deviceid || "").slice(0, 80),
  devicelabel: (body.devicelabel || "").slice(0, 80),
});

export const login = async (req, res) => {
  const { email, name, image } = req.body;
  const context = readcontext(req.body);

  try {
    const existingUser = await users.findOne({ email });

    if (!existingUser) {
      const newUser = await users.create({ email, name, image });
      const result = await finishlogin(newUser, context);
      return res.status(201).json({ result });
    }

    const firsttime = !existingUser.knownlocations.length && !existingUser.knowndevices.length;
    const newlocation =
      (context.city || context.state) &&
      !existingUser.knownlocations.some(
        (l) => same(l.city, context.city) && same(l.state, context.state)
      );
    const newdevice =
      context.deviceid && !existingUser.knowndevices.some((d) => d.deviceid === context.deviceid);

    if (!firsttime && (newlocation || newdevice)) {
      let previewUrl;
      try {
        previewUrl = await startotp(existingUser, context);
      } catch (mailError) {
        console.error("OTP email failed:", mailError);
        return res.status(503).json({
          message: "We couldn't send your verification code right now. Please try again in a minute.",
        });
      }
      return res.status(200).json({
        otpRequired: true,
        userId: existingUser._id,
        email: maskemail(existingUser.email),
        reason: newdevice && newlocation ? "device and location" : newdevice ? "device" : "location",
        previewUrl: process.env.NODE_ENV === "production" ? null : previewUrl,
      });
    }

    const result = await finishlogin(existingUser, context);
    return res.status(200).json({ result });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const verifyotp = async (req, res) => {
  const { userId, otp } = req.body;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid request" });
  }
  try {
    const u = await users.findById(userId);
    const pending = u?.pendingotp;
    if (!u || !pending?.hash) {
      return res.status(400).json({ message: "No verification in progress, please sign in again" });
    }
    if (pending.expires < new Date()) {
      return res.status(410).json({ message: "Code expired, request a new one" });
    }
    if (pending.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Too many wrong attempts, request a new code" });
    }
    if (hashotp((otp || "").trim()) !== pending.hash) {
      u.pendingotp.attempts = pending.attempts + 1;
      await u.save();
      const left = OTP_MAX_ATTEMPTS - u.pendingotp.attempts;
      return res.status(401).json({ message: `Wrong code, ${left} attempt${left === 1 ? "" : "s"} left` });
    }
    const result = await finishlogin(u, {
      city: pending.city,
      state: pending.state,
      country: pending.country,
      deviceid: pending.deviceid,
      devicelabel: pending.devicelabel,
    });
    return res.status(200).json({ result });
  } catch (error) {
    console.error("OTP error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const resendotp = async (req, res) => {
  const { userId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid request" });
  }
  try {
    const u = await users.findById(userId);
    const pending = u?.pendingotp;
    if (!u || !pending?.hash) {
      return res.status(400).json({ message: "No verification in progress, please sign in again" });
    }
    if (pending.sentat && Date.now() - pending.sentat.getTime() < OTP_RESEND_GAP_MS) {
      return res.status(429).json({ message: "Please wait a few seconds before requesting another code" });
    }
    const previewUrl = await startotp(u, {
      city: pending.city,
      state: pending.state,
      country: pending.country,
      deviceid: pending.deviceid,
      devicelabel: pending.devicelabel,
    });
    return res.status(200).json({
      sent: true,
      previewUrl: process.env.NODE_ENV === "production" ? null : previewUrl,
    });
  } catch (error) {
    console.error("OTP error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updatetheme = async (req, res) => {
  const { id: _id } = req.params;
  const { theme } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "User unavailable..." });
  }
  if (!["light", "dark", "auto"].includes(theme)) {
    return res.status(400).json({ message: "Theme must be light, dark or auto" });
  }
  try {
    const update =
      theme === "auto"
        ? { theme: themeforist(), themesource: "auto" }
        : { theme, themesource: "manual" };
    const updated = await users.findByIdAndUpdate(_id, { $set: update }, { new: true });
    return res.status(200).json(safeuser(updated));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true }
    );
    return res.status(201).json(safeuser(updatedata));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

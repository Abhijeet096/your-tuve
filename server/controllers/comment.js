import comment from "../Modals/comment.js";
import mongoose from "mongoose";
import { checkcomment } from "../lib/moderation.js";

const REPORTS_TO_FLAG = 3;

const publiccomment = (c, viewer) => {
  const obj = c.toObject ? c.toObject() : c;
  const { likes = [], dislikes = [], reports = [], ...rest } = obj;
  const has = (list) => !!viewer && list.some((id) => String(id?.userid ?? id) === String(viewer));
  return {
    ...rest,
    likecount: likes.length,
    dislikecount: dislikes.length,
    likedbyme: has(likes),
    dislikedbyme: has(dislikes),
    reportedbyme: has(reports),
  };
};

export const postcomment = async (req, res) => {
  const { videoid, userid, commentbody, usercommented, userimage, city } = req.body;
  if (!mongoose.Types.ObjectId.isValid(userid) || !mongoose.Types.ObjectId.isValid(videoid)) {
    return res.status(400).json({ message: "Invalid comment" });
  }
  try {
    const lastminute = await comment.countDocuments({
      userid,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
    });
    if (lastminute >= 5) {
      return res.status(429).json({ message: "You're commenting too fast, slow down a bit" });
    }
    const recent = await comment
      .find({ userid, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
      .select("commentbody");
    const problem = checkcomment(commentbody, recent.map((c) => c.commentbody || ""));
    if (problem) {
      return res.status(422).json({ message: problem, blocked: true });
    }
    const postcomment = await comment.create({
      videoid,
      userid,
      commentbody: commentbody.trim(),
      usercommented,
      userimage,
      city: city ? String(city).slice(0, 60) : undefined,
    });
    return res.status(200).json({ comment: publiccomment(postcomment, userid) });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  const { userId } = req.query;
  try {
    const commentvideo = await comment.find({ videoid: videoid }).sort({ createdAt: -1 });
    return res.status(200).json(commentvideo.map((c) => publiccomment(c, userId)));
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  const problem = checkcomment(commentbody);
  if (problem) {
    return res.status(422).json({ message: problem, blocked: true });
  }
  try {
    const updatecomment = await comment.findByIdAndUpdate(
      _id,
      { $set: { commentbody: commentbody.trim() } },
      { new: true }
    );
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const react = (field, opposite) => async (req, res) => {
  const { id: _id } = req.params;
  const { userId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid request" });
  }
  try {
    const existing = await comment.findById(_id);
    if (!existing) return res.status(404).json({ message: "Comment not found" });
    const already = existing[field].some((id) => String(id) === String(userId));
    const update = already
      ? { $pull: { [field]: userId } }
      : { $addToSet: { [field]: userId }, $pull: { [opposite]: userId } };
    const updated = await comment.findByIdAndUpdate(_id, update, { new: true });
    return res.status(200).json(publiccomment(updated, userId));
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const likecomment = react("likes", "dislikes");
export const dislikecomment = react("dislikes", "likes");

export const reportcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId, reason } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid request" });
  }
  try {
    const existing = await comment.findById(_id);
    if (!existing) return res.status(404).json({ message: "Comment not found" });
    if (String(existing.userid) === String(userId)) {
      return res.status(400).json({ message: "You can't report your own comment" });
    }
    if (existing.reports.some((r) => String(r.userid) === String(userId))) {
      return res.status(409).json({ message: "You already reported this comment" });
    }
    existing.reports.push({ userid: userId, reason: (reason || "other").slice(0, 200) });
    if (existing.reports.length >= REPORTS_TO_FLAG) existing.flagged = true;
    await existing.save();
    return res.status(200).json(publiccomment(existing, userId));
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getflaggedcomments = async (req, res) => {
  try {
    const flagged = await comment
      .find({ reports: { $exists: true, $ne: [] } })
      .sort({ flagged: -1, updatedAt: -1 })
      .populate({ path: "videoid", model: "videofiles", select: "videotitle" });
    return res.status(200).json(flagged);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const reviewcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { action } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    if (action === "remove") {
      await comment.findByIdAndDelete(_id);
      return res.status(200).json({ removed: true });
    }
    const kept = await comment.findByIdAndUpdate(
      _id,
      { $set: { flagged: false, reports: [] } },
      { new: true }
    );
    return res.status(200).json(kept);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const translatecache = new Map();

export const translatecomment = async (req, res) => {
  const { text, target } = req.body;
  if (!text || !target) return res.status(400).json({ message: "text and target are required" });
  const key = `${target}:${text}`;
  if (translatecache.has(key)) return res.status(200).json(translatecache.get(key));
  try {
    const contact = process.env.MYMEMORY_EMAIL || process.env.SMTP_USER;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text.slice(0, 500)
    )}&langpair=Autodetect|${encodeURIComponent(target)}${
      contact ? `&de=${encodeURIComponent(contact)}` : ""
    }`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.quotaFinished || data.responseStatus !== 200 || !data.responseData?.translatedText) {
      return res.status(502).json({ message: data.responseDetails || "Translation failed" });
    }
    const result = {
      translated: data.responseData.translatedText,
      detected: data.responseData.detectedLanguage || null,
    };
    translatecache.set(key, result);
    return res.status(200).json(result);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Translation service unavailable" });
  }
};

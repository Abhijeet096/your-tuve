import crypto from "crypto";
import Razorpay from "razorpay";
import payment from "../Modals/payment.js";
import users from "../Modals/Auth.js";
import { plans, isPaidPlan } from "../lib/plans.js";
import { sendInvoiceEmail } from "../lib/mailer.js";

const getRazorpay = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

export const createOrder = async (req, res) => {
  const { plan, userId } = req.body;
  if (!isPaidPlan(plan)) {
    return res.status(400).json({ message: "Invalid plan" });
  }
  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: plans[plan].price,
      currency: "INR",
      receipt: `${plan}_${userId}_${Date.now()}`,
    });
    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Couldn't start payment" });
  }
};

export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    plan,
    userId,
  } = req.body;

  if (!isPaidPlan(plan)) {
    return res.status(400).json({ message: "Invalid plan" });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ message: "Payment verification failed" });
  }

  try {
    const viewer = await users.findByIdAndUpdate(
      userId,
      { $set: { plan } },
      { new: true }
    );
    if (!viewer) {
      return res.status(404).json({ message: "User not found" });
    }

    await payment.create({
      viewer: userId,
      plan,
      amount: plans[plan].price,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });

    let emailPreview = null;
    try {
      const mail = await sendInvoiceEmail({
        to: viewer.email,
        plan,
        amount: plans[plan].price,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      });
      emailPreview = mail.previewUrl;
    } catch (mailError) {
      console.error("invoice email failed:", mailError);
    }

    return res.status(200).json({ user: viewer, emailPreview });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getplans = async (req, res) => {
  return res.status(200).json(plans);
};

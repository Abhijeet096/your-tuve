import crypto from "crypto";
import Razorpay from "razorpay";
import payment from "../Modals/payment.js";
import users from "../Modals/Auth.js";
import { plans, isPaidPlan, planrank, syncplan, PLAN_DAYS } from "../lib/plans.js";
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
    const viewer = await syncplan(await users.findById(userId));
    if (!viewer) {
      return res.status(404).json({ message: "Sign in to upgrade your plan" });
    }
    if (planrank(plan) <= planrank(viewer.plan)) {
      return res.status(400).json({
        message: `You're already on the ${plans[viewer.plan].label} plan, which includes everything in ${plans[plan].label}`,
      });
    }
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: plans[plan].price,
      currency: "INR",
      receipt: `${plan}-${Date.now()}`,
      notes: { plan, userId: String(viewer._id) },
    });
    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay order error:", error);
    const reason = error?.error?.description;
    return res.status(500).json({
      message: reason ? `Couldn't start payment: ${reason}` : "Couldn't start payment",
    });
  }
};

export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (!razorpay_signature || expectedSignature !== razorpay_signature) {
    return res.status(400).json({ message: "Payment verification failed" });
  }

  try {
    const order = await getRazorpay().orders.fetch(razorpay_order_id);
    const plan = order?.notes?.plan;
    if (!isPaidPlan(plan) || String(order.notes.userId) !== String(userId)) {
      return res.status(400).json({ message: "This payment doesn't belong to your account" });
    }
    if (Number(order.amount) !== plans[plan].price) {
      return res.status(400).json({ message: "Payment amount doesn't match the plan" });
    }

    const alreadyused = await payment.exists({ paymentId: razorpay_payment_id });
    if (alreadyused) {
      const current = await users.findById(userId, { pendingotp: 0 });
      return res.status(200).json({ user: current });
    }

    const planexpires = new Date(Date.now() + PLAN_DAYS * 24 * 60 * 60 * 1000);
    const viewer = await users.findByIdAndUpdate(
      userId,
      { $set: { plan, planexpires } },
      { new: true, projection: { pendingotp: 0 } }
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

    sendInvoiceEmail({
      to: viewer.email,
      plan,
      amount: plans[plan].price,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      validtill: planexpires,
    }).catch((mailError) => console.error("invoice email failed:", mailError));

    return res.status(200).json({ user: viewer });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getplans = async (req, res) => {
  return res.status(200).json(plans);
};

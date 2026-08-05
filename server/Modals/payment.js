import mongoose from "mongoose";
const paymentschema = mongoose.Schema(
  {
    viewer: { type: String, required: true },
    plan: { type: String, required: true },
    amount: { type: Number, required: true },
    orderId: { type: String, required: true },
    paymentId: { type: String, required: true },
    status: { type: String, default: "paid" },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("payment", paymentschema);

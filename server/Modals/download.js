import mongoose from "mongoose";
const downloadschema = mongoose.Schema(
  {
    viewer: { type: String, required: true },
    videoid: { type: mongoose.Schema.Types.ObjectId, ref: "videofiles" },
    plan: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("download", downloadschema);

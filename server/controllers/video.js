import video from "../Modals/video.js";
import mongoose from "mongoose";
import { storevideo, removevideo } from "../lib/storage.js";

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      const filepath = await storevideo(req.file);
      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        filepath: filepath,
        filetype: req.file.mimetype,
        filesize: req.file.size,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
      });
      await file.save();
      return res.status(201).json(file);
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({
        message: `Upload failed: ${error?.message || error?.error?.message || "unknown error"}`,
      });
    }
  }
};
export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletevideo = async (req, res) => {
  const { id: _id } = req.params;
  const { userId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "Video not found" });
  }
  try {
    const existing = await video.findById(_id);
    if (!existing) return res.status(404).json({ message: "Video not found" });
    if (!userId || String(existing.uploader) !== String(userId)) {
      return res.status(403).json({ message: "You can only delete your own videos" });
    }
    await video.findByIdAndDelete(_id);
    await removevideo(existing.filepath);
    return res.status(200).json({ deleted: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

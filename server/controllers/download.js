import download from "../Modals/download.js";
import users from "../Modals/Auth.js";
import { plans } from "../lib/plans.js";

const downloadlimit = (plan) => plans[plan]?.downloadsPerDay ?? plans.free.downloadsPerDay;

const startofday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const handledownload = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  try {
    const viewer = await users.findById(userId);
    if (!viewer) {
      return res.status(404).json({ message: "User not found" });
    }
    const limit = downloadlimit(viewer.plan);

    const todaycount = await download.countDocuments({
      viewer: userId,
      createdAt: { $gte: startofday() },
    });

    if (todaycount >= limit) {
      return res.status(403).json({
        message: `You've hit your ${viewer.plan} plan limit of ${limit} download${
          limit === 1 ? "" : "s"
        } per day`,
        limitReached: true,
      });
    }

    const newdownload = await download.create({
      viewer: userId,
      videoid: videoId,
      plan: viewer.plan,
    });
    return res.status(201).json({
      download: newdownload,
      remaining: limit - todaycount - 1,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getalldownloads = async (req, res) => {
  const { userId } = req.params;
  try {
    const downloads = await download
      .find({ viewer: userId })
      .populate({ path: "videoid", model: "videofiles" })
      .sort({ createdAt: -1 })
      .exec();
    return res.status(200).json(downloads);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getdownloadstatus = async (req, res) => {
  const { userId } = req.params;
  try {
    const viewer = await users.findById(userId);
    if (!viewer) {
      return res.status(404).json({ message: "User not found" });
    }
    const limit = downloadlimit(viewer.plan);
    const used = await download.countDocuments({
      viewer: userId,
      createdAt: { $gte: startofday() },
    });
    return res.status(200).json({
      plan: viewer.plan,
      limit,
      used,
      remaining: Math.max(limit - used, 0),
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

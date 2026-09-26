import video from "../Modals/video.js";
import like from "../Modals/like.js";

const counts = async (videoId, userId) => {
  const v = await video.findById(videoId).select("Like Dislike dislikers");
  const liked = userId ? !!(await like.exists({ viewer: userId, videoid: videoId })) : false;
  return {
    likes: Math.max(v?.Like || 0, 0),
    dislikes: Math.max(v?.Dislike || 0, 0),
    liked,
    disliked: !!userId && (v?.dislikers || []).includes(String(userId)),
  };
};

const cleardislike = async (videoId, userId) => {
  const res = await video.updateOne(
    { _id: videoId, dislikers: String(userId) },
    { $pull: { dislikers: String(userId) }, $inc: { Dislike: -1 } }
  );
  return res.modifiedCount > 0;
};

export const handlelike = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  if (!userId) {
    return res.status(401).json({ message: "Sign in to like videos" });
  }
  try {
    const exisitinglike = await like.findOne({
      viewer: userId,
      videoid: videoId,
    });
    if (exisitinglike) {
      await like.findByIdAndDelete(exisitinglike._id);
      await video.findByIdAndUpdate(videoId, { $inc: { Like: -1 } });
    } else {
      await like.create({ viewer: userId, videoid: videoId });
      await video.findByIdAndUpdate(videoId, { $inc: { Like: 1 } });
      await cleardislike(videoId, userId);
    }
    return res.status(200).json(await counts(videoId, userId));
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const handledislike = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  if (!userId) {
    return res.status(401).json({ message: "Sign in to dislike videos" });
  }
  try {
    const removed = await cleardislike(videoId, userId);
    if (!removed) {
      await video.updateOne(
        { _id: videoId, dislikers: { $ne: String(userId) } },
        { $addToSet: { dislikers: String(userId) }, $inc: { Dislike: 1 } }
      );
      const exisitinglike = await like.findOneAndDelete({ viewer: userId, videoid: videoId });
      if (exisitinglike) await video.findByIdAndUpdate(videoId, { $inc: { Like: -1 } });
    }
    return res.status(200).json(await counts(videoId, userId));
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const likestatus = async (req, res) => {
  const { videoId } = req.params;
  const { userId } = req.query;
  try {
    return res.status(200).json(await counts(videoId, userId));
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallLikedVideo = async (req, res) => {
  const { userId } = req.params;
  try {
    const likevideo = await like
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .exec();
    return res.status(200).json(likevideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

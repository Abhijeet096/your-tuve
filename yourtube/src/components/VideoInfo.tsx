import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { downloadurl } from "@/lib/media";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadsLeft, setDownloadsLeft] = useState<number | null>(null);

  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  const [popped, setPopped] = useState({ like: 0, dislike: 0 });
  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
    axiosInstance
      .get(`/like/status/${video._id}`, { params: { userId: user?._id } })
      .then((res) => applycounts(res.data))
      .catch(() => {});
  }, [video, user?._id]);

  useEffect(() => {
    const handleviews = async () => {
      if (user) {
        try {
          return await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          return console.log(error);
        }
      } else {
        return await axiosInstance.post(`/history/views/${video?._id}`);
      }
    };
    handleviews();
  }, [user]);
  useEffect(() => {
    if (!user) {
      setDownloadsLeft(null);
      return;
    }
    axiosInstance
      .get(`/download/status/${user._id}`)
      .then((res) => setDownloadsLeft(res.data.remaining))
      .catch(() => {});
  }, [user]);
  const handleDownload = async () => {
    if (!user) {
      toast.error("Sign in to download videos");
      return;
    }
    setDownloading(true);
    try {
      const res = await axiosInstance.post(`/download/${video._id}`, {
        userId: user._id,
      });
      const link = document.createElement("a");
      link.href = downloadurl(video.filepath);
      link.download = video.filename || video.videotitle;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloadsLeft(res.data.remaining);
      toast.success(`Downloaded — ${res.data.remaining} left today`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Couldn't download this video");
    } finally {
      setDownloading(false);
    }
  };
  const applycounts = (data: any) => {
    setlikes(data.likes);
    setDislikes(data.dislikes);
    setIsLiked(data.liked);
    setIsDisliked(data.disliked);
  };
  const react = async (type: "like" | "dislike") => {
    if (!user) {
      toast.error(`Sign in to ${type} this video`);
      return;
    }
    const before = { likes, dislikes, liked: isLiked, disliked: isDisliked };
    const next = { ...before };
    if (type === "like") {
      next.liked = !before.liked;
      next.likes += next.liked ? 1 : -1;
      if (next.liked && before.disliked) {
        next.disliked = false;
        next.dislikes -= 1;
      }
    } else {
      next.disliked = !before.disliked;
      next.dislikes += next.disliked ? 1 : -1;
      if (next.disliked && before.liked) {
        next.liked = false;
        next.likes -= 1;
      }
    }
    applycounts(next);
    setPopped((p) => ({ ...p, [type]: p[type] + 1 }));
    try {
      const res = await axiosInstance.post(
        type === "like" ? `/like/${video._id}` : `/like/dislike/${video._id}`,
        { userId: user._id }
      );
      applycounts(res.data);
    } catch (error) {
      applycounts(before);
      toast.error("Couldn't update, please try again");
    }
  };
  const handleLike = () => react("like");
  const handleWatchLater = async () => {
    if (!user) {
      toast.error("Sign in to save videos for later");
      return;
    }
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleDislike = () => react("dislike");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{video.videochanel[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{video.videochanel}</h3>
            <p className="text-sm text-gray-600">1.2M subscribers</p>
          </div>
          <Button className="ml-4">Subscribe</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-l-full active:scale-95 transition-transform ${
                isLiked ? "text-blue-600" : ""
              }`}
              onClick={handleLike}
              aria-pressed={isLiked}
              title={isLiked ? "Unlike" : "I like this"}
            >
              <ThumbsUp
                key={`like-${popped.like}`}
                className={`w-5 h-5 mr-2 ${popped.like ? "animate-pop" : ""}`}
                fill={isLiked ? "currentColor" : "none"}
              />
              <span className="tabular-nums">{likes.toLocaleString()}</span>
            </Button>
            <div className="w-px h-6 bg-gray-300" />
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-r-full active:scale-95 transition-transform ${
                isDisliked ? "text-blue-600" : ""
              }`}
              onClick={handleDislike}
              aria-pressed={isDisliked}
              title={isDisliked ? "Remove dislike" : "I dislike this"}
            >
              <ThumbsDown
                key={`dislike-${popped.dislike}`}
                className={`w-5 h-5 mr-2 ${popped.dislike ? "animate-pop" : ""}`}
                fill={isDisliked ? "currentColor" : "none"}
              />
              <span className="tabular-nums">{dislikes.toLocaleString()}</span>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 rounded-full ${
              isWatchLater ? "text-primary" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full"
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full"
            onClick={handleDownload}
            disabled={downloading || downloadsLeft === 0}
            title={
              downloadsLeft !== null
                ? `${downloadsLeft} download${downloadsLeft === 1 ? "" : "s"} left today`
                : undefined
            }
          >
            <Download className="w-5 h-5 mr-2" />
            {downloading
              ? "Downloading..."
              : downloadsLeft === 0
              ? "Limit reached"
              : "Download"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-gray-100 rounded-full"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
    </div>
  );
};

export default VideoInfo;

import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwner = !!user && user._id === id;

  const loadVideos = useCallback(async () => {
    if (!id) return;
    try {
      const res = await axiosInstance.get("/video/getall");
      setVideos(
        res.data
          .filter((v: any) => v.uploader === id)
          .sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt))
      );
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleDelete = async (videoId: string) => {
    if (!user || !confirm("Delete this video? This can't be undone.")) return;
    try {
      await axiosInstance.delete(`/video/${videoId}`, { data: { userId: user._id } });
      setVideos((prev) => prev.filter((v) => v._id !== videoId));
      toast.success("Video deleted");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Couldn't delete the video");
    }
  };

  const channel = isOwner
    ? user
    : {
        _id: id,
        channelname: videos[0]?.videochanel || "Channel",
      };

  return (
    <div className="flex-1 min-h-screen bg-white">
      <div className="max-w-full mx-auto">
        <ChannelHeader channel={channel} user={user} />
        <Channeltabs />
        {isOwner && (
          <div className="px-4 pb-8">
            <VideoUploader
              channelId={user._id}
              channelName={user.channelname}
              onUploaded={loadVideos}
            />
          </div>
        )}
        <div className="px-4 pb-8">
          {loading ? (
            <p className="text-gray-600">Loading videos...</p>
          ) : (
            <ChannelVideos videos={videos} onDelete={isOwner ? handleDelete : undefined} />
          )}
        </div>
      </div>
    </div>
  );
};

export default index;

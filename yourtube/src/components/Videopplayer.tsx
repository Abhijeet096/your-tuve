"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "./ui/button";
import { useUser } from "@/lib/AuthContext";

const FREE_WATCH_CAP_SECONDS = 60;

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(function VideoPlayer(
  { video },
  forwardedRef
) {
  const { user } = useUser();
  const localRef = useRef<HTMLVideoElement>(null);
  const [capped, setCapped] = useState(false);

  const isFreePlan = !user?.plan || user.plan === "free";

  useEffect(() => {
    if (typeof forwardedRef === "function") {
      forwardedRef(localRef.current);
    } else if (forwardedRef) {
      forwardedRef.current = localRef.current;
    }
  });

  useEffect(() => {
    setCapped(false);
    const el = localRef.current;
    if (!el || !isFreePlan) return;

    const onTimeUpdate = () => {
      if (el.currentTime >= FREE_WATCH_CAP_SECONDS) {
        el.pause();
        setCapped(true);
      }
    };
    el.addEventListener("timeupdate", onTimeUpdate);
    return () => el.removeEventListener("timeupdate", onTimeUpdate);
  }, [video?._id, isFreePlan]);

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={localRef}
        className="w-full h-full"
        controls
        poster={`/placeholder.svg?height=480&width=854`}
      >
        <source
          src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${video?.filepath}`}
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>
      {capped && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-3 text-white text-center p-4">
          <Lock className="w-8 h-8" />
          <p className="font-medium">
            Free plan preview ends at {FREE_WATCH_CAP_SECONDS}s
          </p>
          <p className="text-sm text-gray-300">
            Upgrade for unlimited watch time on every video.
          </p>
          <Link href="/subscription">
            <Button>Upgrade plan</Button>
          </Link>
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;

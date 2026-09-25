"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Loader2,
  Lock,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "./ui/button";
import { useUser } from "@/lib/AuthContext";

const FREE_WATCH_CAP_SECONDS = 60;
const SEEK_STEP = 10;

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  nextVideo?: {
    _id: string;
    videotitle: string;
    videochanel?: string;
  } | null;
}

const formatTime = (secs: number) => {
  if (!isFinite(secs) || secs < 0) secs = 0;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60)
    .toString()
    .padStart(2, "0");
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s}` : `${m}:${s}`;
};

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(function VideoPlayer(
  { video, nextVideo },
  forwardedRef
) {
  const { user } = useUser();
  const router = useRouter();
  const localRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const lastTap = useRef({ time: 0, side: "" });
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const [capped, setCapped] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [ended, setEnded] = useState(false);
  const [seekFlash, setSeekFlash] = useState<"back" | "forward" | null>(null);

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
    setEnded(false);
    setCurrent(0);
    setBuffering(true);
  }, [video?._id]);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;

    const onTime = () => {
      setCurrent(el.currentTime);
      if (el.buffered.length) setBuffered(el.buffered.end(el.buffered.length - 1));
      if (isFreePlan && el.currentTime >= FREE_WATCH_CAP_SECONDS) {
        el.pause();
        setCapped(true);
      }
    };
    const onMeta = () => setDuration(el.duration);
    const onPlay = () => {
      setPlaying(true);
      setEnded(false);
    };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onReady = () => setBuffering(false);
    const onEnded = () => {
      setPlaying(false);
      setEnded(true);
    };
    const onVolume = () => {
      setVolume(el.volume);
      setMuted(el.muted);
    };

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("progress", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("durationchange", onMeta);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("canplay", onReady);
    el.addEventListener("playing", onReady);
    el.addEventListener("ended", onEnded);
    el.addEventListener("volumechange", onVolume);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("progress", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("durationchange", onMeta);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("canplay", onReady);
      el.removeEventListener("playing", onReady);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("volumechange", onVolume);
    };
  }, [video?._id, isFreePlan]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const bumpControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (localRef.current && !localRef.current.paused) setShowControls(false);
    }, 2500);
  }, []);

  useEffect(() => {
    if (!playing) setShowControls(true);
    else bumpControls();
  }, [playing, bumpControls]);

  const togglePlay = useCallback(() => {
    const el = localRef.current;
    if (!el || capped) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, [capped]);

  const seekBy = useCallback(
    (delta: number) => {
      const el = localRef.current;
      if (!el) return;
      let target = Math.min(Math.max(el.currentTime + delta, 0), el.duration || 0);
      if (isFreePlan) target = Math.min(target, FREE_WATCH_CAP_SECONDS);
      el.currentTime = target;
      setSeekFlash(delta < 0 ? "back" : "forward");
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setSeekFlash(null), 600);
      bumpControls();
    },
    [isFreePlan, bumpControls]
  );

  const toggleMute = useCallback(() => {
    const el = localRef.current;
    if (!el) return;
    el.muted = !el.muted;
    if (!el.muted && el.volume === 0) el.volume = 0.5;
  }, []);

  const changeVolume = (value: number) => {
    const el = localRef.current;
    if (!el) return;
    el.volume = value;
    el.muted = value === 0;
  };

  const toggleFullscreen = useCallback(() => {
    const wrap = wrapperRef.current;
    if (!wrap) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else wrap.requestFullscreen?.().catch(() => {});
  }, []);

  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = localRef.current;
    if (!el) return;
    let t = Number(e.target.value);
    if (isFreePlan) t = Math.min(t, FREE_WATCH_CAP_SECONDS);
    el.currentTime = t;
    setCurrent(t);
  };

  const playNext = useCallback(() => {
    if (nextVideo) router.push(`/watch/${nextVideo._id}`);
  }, [nextVideo, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
        case "l":
          seekBy(SEEK_STEP);
          break;
        case "ArrowLeft":
        case "j":
          seekBy(-SEEK_STEP);
          break;
        case "f":
          toggleFullscreen();
          break;
        case "m":
          toggleMute();
          break;
        case "N":
          if (e.shiftKey) playNext();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, toggleFullscreen, toggleMute, playNext]);

  const onSurfaceTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.changedTouches[0].clientX - rect.left;
    const side = x < rect.width / 3 ? "left" : x > (rect.width * 2) / 3 ? "right" : "center";
    const now = Date.now();
    const isDouble = now - lastTap.current.time < 300 && lastTap.current.side === side;
    lastTap.current = { time: now, side };

    if (isDouble && side !== "center") {
      e.preventDefault();
      seekBy(side === "left" ? -SEEK_STEP : SEEK_STEP);
      return;
    }
    if (!showControls) {
      e.preventDefault();
      bumpControls();
    }
  };

  const playedPct = duration ? (current / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={wrapperRef}
      className={`relative aspect-video bg-black overflow-hidden select-none group/player ${
        fullscreen ? "" : "rounded-lg"
      } ${!showControls && playing ? "cursor-none" : ""}`}
      onMouseMove={bumpControls}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={localRef}
        src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${video?.filepath}`}
        className="w-full h-full"
        playsInline
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>

      <div
        className="absolute inset-0"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onTouchEnd={onSurfaceTouch}
      />

      {seekFlash && (
        <div
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 text-white bg-black/50 rounded-full px-5 py-4 ${
            seekFlash === "back" ? "left-[12%]" : "right-[12%]"
          }`}
        >
          {seekFlash === "back" ? <RotateCcw className="w-6 h-6" /> : <RotateCw className="w-6 h-6" />}
          <span className="text-xs font-medium">{SEEK_STEP} seconds</span>
        </div>
      )}

      {buffering && !capped && !ended && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {!playing && !buffering && !capped && !ended && (
        <button
          className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
          onClick={togglePlay}
          aria-label="Play"
        >
          <Play className="w-8 h-8 ml-1" fill="currentColor" />
        </button>
      )}

      {ended && nextVideo && !capped && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 text-white text-center p-4">
          <p className="text-sm text-gray-300">Up next</p>
          <p className="font-medium line-clamp-2 max-w-md">{nextVideo.videotitle}</p>
          {nextVideo.videochanel && (
            <p className="text-xs text-gray-400">{nextVideo.videochanel}</p>
          )}
          <div className="flex gap-2 mt-1">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => {
                const el = localRef.current;
                if (el) {
                  el.currentTime = 0;
                  el.play().catch(() => {});
                }
              }}
            >
              Replay
            </Button>
            <Button className="bg-white text-black hover:bg-gray-200" onClick={playNext}>
              Play next
            </Button>
          </div>
        </div>
      )}

      <div
        className={`absolute bottom-0 inset-x-0 px-3 pb-2 pt-10 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-200 ${
          showControls && !capped ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="relative h-1 hover:h-1.5 transition-all rounded bg-white/30 mb-2">
          <div
            className="absolute inset-y-0 left-0 bg-white/50 rounded"
            style={{ width: `${bufferedPct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-red-600 rounded"
            style={{ width: `${playedPct}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={onScrub}
            className="absolute -inset-y-1.5 inset-x-0 w-full opacity-0 cursor-pointer"
            aria-label="Seek"
          />
        </div>

        <div className="flex items-center gap-1 sm:gap-2 text-white">
          <button className="p-1.5 hover:bg-white/10 rounded" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
          </button>
          <button className="p-1.5 hover:bg-white/10 rounded" onClick={() => seekBy(-SEEK_STEP)} title="Back 10s (←)">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button className="p-1.5 hover:bg-white/10 rounded" onClick={() => seekBy(SEEK_STEP)} title="Forward 10s (→)">
            <RotateCw className="w-5 h-5" />
          </button>
          {nextVideo && (
            <button className="p-1.5 hover:bg-white/10 rounded" onClick={playNext} title={`Next: ${nextVideo.videotitle}`}>
              <SkipForward className="w-5 h-5" fill="currentColor" />
            </button>
          )}

          <div className="flex items-center group/vol">
            <button className="p-1.5 hover:bg-white/10 rounded" onClick={toggleMute} aria-label="Mute">
              <VolumeIcon className="w-5 h-5" />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              className="w-0 opacity-0 group-hover/vol:w-20 group-hover/vol:opacity-100 focus:w-20 focus:opacity-100 transition-all accent-white cursor-pointer hidden sm:block"
              aria-label="Volume"
            />
          </div>

          <span className="text-xs sm:text-sm tabular-nums ml-1">
            {formatTime(current)} / {formatTime(duration)}
          </span>

          <button className="p-1.5 hover:bg-white/10 rounded ml-auto" onClick={toggleFullscreen} aria-label="Fullscreen">
            {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>

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

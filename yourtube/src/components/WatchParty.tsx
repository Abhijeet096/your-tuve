"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MonitorUp,
  Users,
  Circle,
  Square,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useUser } from "@/lib/AuthContext";
import useWatchParty from "@/hooks/useWatchParty";

const controlBtn = "border bg-white text-gray-700 hover:bg-gray-100";
const controlBtnActive = "border bg-black text-white hover:bg-black/90";

function Tile({ stream, muted, label, cameraOff }: any) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);

  return (
    <div className="relative aspect-video bg-gray-900 rounded overflow-hidden">
      {!cameraOff ? (
        <video ref={ref} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
          Camera off
        </div>
      )}
      <span className="absolute bottom-1 left-1 text-xs text-white bg-black/60 px-1.5 py-0.5 rounded">
        {label}
      </span>
    </div>
  );
}

export default function WatchParty({ videoId, videoRef, onClose }: any) {
  const { user } = useUser();
  const [chatInput, setChatInput] = useState("");
  const [joining, setJoining] = useState(false);
  const applyingRemoteRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const {
    joined,
    participants,
    messages,
    localStream,
    muted,
    cameraOff,
    screenSharing,
    recording,
    join,
    leave,
    sendMessage,
    toggleMute,
    toggleCamera,
    shareScreen,
    startRecording,
    stopRecording,
    notifyVideoSync,
  } = useWatchParty({
    onVideoSync: (action: string, time: number) => {
      const el = videoRef?.current;
      if (!el) return;
      applyingRemoteRef.current = true;
      if (typeof time === "number" && Math.abs(el.currentTime - time) > 0.5) {
        el.currentTime = time;
      }
      if (action === "play") el.play();
      if (action === "pause") el.pause();
      setTimeout(() => (applyingRemoteRef.current = false), 300);
    },
  });

  useEffect(() => {
    const el = videoRef?.current;
    if (!joined || !el) return;

    const onPlay = () => !applyingRemoteRef.current && notifyVideoSync("play", el.currentTime);
    const onPause = () => !applyingRemoteRef.current && notifyVideoSync("pause", el.currentTime);
    const onSeeked = () => !applyingRemoteRef.current && notifyVideoSync("seek", el.currentTime);

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("seeked", onSeeked);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("seeked", onSeeked);
    };
  }, [joined, videoRef, notifyVideoSync]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (joined) leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await join(videoId, user?.name || "Guest");
    } catch (err: any) {
      toast.error(err?.message || "Couldn't access camera/mic. Check browser permissions.");
    } finally {
      setJoining(false);
    }
  };

  const copyInvite = async () => {
    const url = `${window.location.origin}/watch/${videoId}?party=1`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied");
    } catch {
      toast.error("Couldn't copy — copy it manually: " + url);
    }
  };

  const participantList = Object.entries(participants);

  return (
    <div className="border rounded-lg bg-white flex flex-col h-[520px] w-full max-w-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2 font-medium text-sm">
          <Users className="w-4 h-4" />
          Watch party
          {joined && <span className="text-gray-500">({participantList.length + 1})</span>}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {!joined ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
          <p className="text-sm text-gray-600 text-center">
            Invite friends to watch this video together with live video and chat.
          </p>
          <Button onClick={handleJoin} disabled={joining}>
            {joining ? "Joining..." : "Join call"}
          </Button>
          <Button size="sm" className={`gap-2 ${controlBtn}`} onClick={copyInvite}>
            <Copy className="w-4 h-4" />
            Copy invite link
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1 p-2 overflow-y-auto max-h-40">
            <Tile stream={localStream} muted label="You" cameraOff={cameraOff} />
            {participantList.map(([id, p]: any) => (
              <Tile
                key={id}
                stream={p.stream}
                label={p.name || "Guest"}
                cameraOff={p.cameraOff}
                muted={false}
              />
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 py-2 border-b">
            <Button
              size="icon"
              className={muted ? controlBtnActive : controlBtn}
              onClick={toggleMute}
            >
              {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              className={cameraOff ? controlBtnActive : controlBtn}
              onClick={toggleCamera}
            >
              {cameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              className={screenSharing ? controlBtnActive : controlBtn}
              onClick={shareScreen}
            >
              <MonitorUp className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              className={recording ? controlBtnActive : controlBtn}
              onClick={recording ? stopRecording : startRecording}
              title="Record locally"
            >
              {recording ? <Square className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            </Button>
            <Button size="icon" className="bg-red-600 text-white hover:bg-red-700" onClick={leave}>
              <PhoneOff className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 text-sm">
            {messages.map((m: any, i: number) => (
              <div key={i}>
                <span className="font-medium">{m.name}: </span>
                <span>{m.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form
            className="flex gap-2 p-2 border-t"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(chatInput);
              setChatInput("");
            }}
          >
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Say something..."
              className="text-sm"
            />
            <Button type="submit" size="sm">
              Send
            </Button>
          </form>
        </>
      )}
    </div>
  );
}

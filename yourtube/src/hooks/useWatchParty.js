import { useCallback, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function useWatchParty({ onVideoSync } = {}) {
  const [joined, setJoined] = useState(false);
  const [participants, setParticipants] = useState({});
  const [messages, setMessages] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [recording, setRecording] = useState(false);

  const socketRef = useRef(null);
  const roomIdRef = useRef(null);
  const peersRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const joiningRef = useRef(false);
  const onVideoSyncRef = useRef(onVideoSync);
  onVideoSyncRef.current = onVideoSync;

  // Perfect-negotiation pattern so two peers offering at nearly the same
  // moment don't leave a connection stuck mid-negotiation.
  const createPeer = useCallback((socketId, initiator) => {
    const socket = socketRef.current;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const entry = { pc, polite: socket.id < socketId, makingOffer: false, ignoreOffer: false };

    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("signal", { to: socketId, data: { candidate: e.candidate } });
      }
    };

    pc.ontrack = (e) => {
      setParticipants((prev) => ({
        ...prev,
        [socketId]: { ...prev[socketId], stream: e.streams[0] },
      }));
    };

    peersRef.current.set(socketId, entry);

    if (initiator) {
      entry.makingOffer = true;
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit("signal", { to: socketId, data: { sdp: pc.localDescription } });
        })
        .catch(() => {})
        .finally(() => {
          entry.makingOffer = false;
        });
    }

    return entry;
  }, []);

  const join = useCallback(
    async (roomId, name) => {
      if (joiningRef.current || joined) return;
      joiningRef.current = true;

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      cameraTrackRef.current = stream.getVideoTracks()[0];
      setLocalStream(stream);

      const socket = getSocket();
      socketRef.current = socket;
      roomIdRef.current = roomId;
      socket.connect();

      socket.on("existing-participants", (list) => {
        setParticipants((prev) => {
          const next = { ...prev };
          list.forEach((p) => {
            next[p.socketId] = { name: p.name };
          });
          return next;
        });
        list.forEach((p) => createPeer(p.socketId, true));
      });

      socket.on("participant-joined", ({ socketId, name }) => {
        setParticipants((prev) => ({ ...prev, [socketId]: { name } }));
      });

      socket.on("signal", async ({ from, data }) => {
        let entry = peersRef.current.get(from);
        if (!entry) entry = createPeer(from, false);
        const { pc, polite } = entry;

        try {
          if (data.sdp) {
            const isOffer = data.sdp.type === "offer";
            const collision = isOffer && (entry.makingOffer || pc.signalingState !== "stable");
            entry.ignoreOffer = !polite && collision;
            if (entry.ignoreOffer) return;

            if (collision) {
              await Promise.all([
                pc.setLocalDescription({ type: "rollback" }),
                pc.setRemoteDescription(new RTCSessionDescription(data.sdp)),
              ]);
            } else {
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            }

            if (isOffer) {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.emit("signal", { to: from, data: { sdp: pc.localDescription } });
            }
          } else if (data.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (err) {
              if (!entry.ignoreOffer) throw err;
            }
          }
        } catch {}
      });

      socket.on("participant-left", ({ socketId }) => {
        peersRef.current.get(socketId)?.pc.close();
        peersRef.current.delete(socketId);
        setParticipants((prev) => {
          const next = { ...prev };
          delete next[socketId];
          return next;
        });
      });

      socket.on("chat-message", (msg) => {
        setMessages((prev) => [...prev, msg]);
      });

      socket.on("media-state", ({ socketId, muted: m, cameraOff: c }) => {
        setParticipants((prev) => ({
          ...prev,
          [socketId]: { ...prev[socketId], muted: m, cameraOff: c },
        }));
      });

      socket.on("video-sync", ({ action, time }) => {
        onVideoSyncRef.current?.(action, time);
      });

      socket.emit("join-party", { roomId, name });
      setJoined(true);
      joiningRef.current = false;
    },
    [createPeer, joined]
  );

  const leave = useCallback(() => {
    const socket = socketRef.current;
    socket?.emit("leave-party");
    socket?.off("existing-participants");
    socket?.off("participant-joined");
    socket?.off("signal");
    socket?.off("participant-left");
    socket?.off("chat-message");
    socket?.off("media-state");
    socket?.off("video-sync");
    socket?.disconnect();

    peersRef.current.forEach((entry) => entry.pc.close());
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());

    setJoined(false);
    setParticipants({});
    setMessages([]);
    setLocalStream(null);
    setScreenSharing(false);
  }, []);

  const sendMessage = useCallback((text) => {
    if (!text.trim()) return;
    const socket = socketRef.current;
    socket.emit("chat-message", { roomId: roomIdRef.current, text });
    setMessages((prev) => [
      ...prev,
      { from: socket.id, name: "You", text: text.trim(), at: Date.now() },
    ]);
  }, []);

  const broadcastMediaState = useCallback((nextMuted, nextCameraOff) => {
    socketRef.current?.emit("media-state", {
      roomId: roomIdRef.current,
      muted: nextMuted,
      cameraOff: nextCameraOff,
    });
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
      broadcastMediaState(next, cameraOff);
      return next;
    });
  }, [broadcastMediaState, cameraOff]);

  const toggleCamera = useCallback(() => {
    setCameraOff((prev) => {
      const next = !prev;
      localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
      broadcastMediaState(muted, next);
      return next;
    });
  }, [broadcastMediaState, muted]);

  const shareScreen = useCallback(async () => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];

    peersRef.current.forEach((entry) => {
      const sender = entry.pc.getSenders().find((s) => s.track?.kind === "video");
      sender?.replaceTrack(screenTrack);
    });

    setScreenSharing(true);
    screenTrack.onended = () => {
      peersRef.current.forEach((entry) => {
        const sender = entry.pc.getSenders().find((s) => s.track?.kind === "video");
        sender?.replaceTrack(cameraTrackRef.current);
      });
      setScreenSharing(false);
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!localStreamRef.current) return;
    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(localStreamRef.current);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `watch-party-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    setRecording(false);
  }, []);

  const notifyVideoSync = useCallback((action, time) => {
    socketRef.current?.emit("video-sync", { roomId: roomIdRef.current, action, time });
  }, []);

  return {
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
  };
}

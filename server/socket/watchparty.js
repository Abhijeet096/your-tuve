const rooms = new Map();

export default function attachWatchParty(io) {
  io.on("connection", (socket) => {
    socket.on("join-party", ({ roomId, name }) => {
      socket.data.roomId = roomId;
      socket.data.name = name || "Guest";
      socket.join(roomId);

      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      const room = rooms.get(roomId);

      const existing = [...room].map((id) => ({
        socketId: id,
        name: io.sockets.sockets.get(id)?.data.name || "Guest",
      }));
      socket.emit("existing-participants", existing);

      room.add(socket.id);
      socket.to(roomId).emit("participant-joined", {
        socketId: socket.id,
        name: socket.data.name,
      });
    });

    socket.on("signal", ({ to, data }) => {
      io.to(to).emit("signal", { from: socket.id, data });
    });

    socket.on("chat-message", ({ roomId, text }) => {
      if (!text || !text.trim()) return;
      socket.to(roomId).emit("chat-message", {
        from: socket.id,
        name: socket.data.name,
        text: text.trim().slice(0, 500),
        at: Date.now(),
      });
    });

    socket.on("media-state", ({ roomId, muted, cameraOff }) => {
      socket.to(roomId).emit("media-state", { socketId: socket.id, muted, cameraOff });
    });

    socket.on("video-sync", ({ roomId, action, time }) => {
      socket.to(roomId).emit("video-sync", { action, time });
    });

    socket.on("leave-party", () => leaveRoom(socket));
    socket.on("disconnect", () => leaveRoom(socket));
  });

  function leaveRoom(socket) {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) rooms.delete(roomId);
    }
    socket.to(roomId).emit("participant-left", { socketId: socket.id });
    socket.data.roomId = null;
  }
}

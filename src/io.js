const socketIO = require("socket.io")

const io = new socketIO.Server({
  path: "/io",
  serveClient: false,
  // below are engine.IO options
  pingInterval: 10000,
  pingTimeout: 5000,
  cookie: false,
  cors: {
    origin: '*'
  }
});

io.on("connection", (socket) => {
  console.log('> io::connection', socket.id)
  socket.on("JOIN_ROOM", ({ roomId, account, data }) => {
    console.log('socket::JOIN_ROOM', { roomId, account, data })
    socket.join(roomId);
    socket.to(roomId).emit("USER_JOINED", { roomId, account, data: null });
  });

  socket.on("NEW_MESSAGE", ({ roomId, account, data }) => {
    console.log('socket::NEW_MESSAGE', { roomId, account, data })
    io.to(roomId).emit("USER_MESSAGE", { roomId, account, data });
  });

  socket.on("disconnect", (message) => {
    console.log('socket::disconnect', socket.id, message)
    socket.broadcast.emit('USER_LEAVE', { data: socket.id });
  });
});

module.exports = io
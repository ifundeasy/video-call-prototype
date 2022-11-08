const socketIO = require('socket.io')

const manager = require('./manager')

const io = new socketIO.Server({
  path: '/io',
  serveClient: false,
  // below are engine.IO options
  pingInterval: 10000,
  pingTimeout: 5000,
  cookie: false,
  cors: {
    origin: '*'
  }
});

io.on('connection', (socket) => {
  console.log('> io::connection', socket.id)

  socket.on('GET_ROOM_INFO', async ({ roomId }) => {
    console.log('socket::GET_ROOM_INFO', { roomId })

    const users = await manager.getUsers(roomId);
    console.log(users)
    socket.emit('ROOM_INFO', { data: users });
  });

  socket.on('JOIN_ROOM', async ({
    roomId, peerId, userId, userName
  }) => {
    console.log('socket::JOIN_ROOM', {
      roomId, peerId, socketId: socket.id, userId, userName
    })

    await manager.addUser(roomId, {
      socketId: socket.id, peerId, userId, userName
    });
    const users = await manager.getUsers(roomId);

    socket.join(roomId);
    socket.emit('ADDED_TO_ROOM', { room: users });
    socket.broadcast.to(roomId).emit('USER_JOINED', {
      roomId, peerId, socketId: socket.id, userId, userName, room: users
    });
  });

  socket.on('NEW_MESSAGE', ({
    roomId, peerId, socketId, userId, userName, data
  }) => {
    console.log('socket::NEW_MESSAGE', {
      roomId, peerId, socketId, userId, userName, data
    })
    io.sockets.to(roomId).emit('USER_MESSAGE', {
      roomId, peerId, socketId, userId, userName, data
    });
  });

  socket.on('disconnect', async (message) => {
    console.log('socket::disconnect', socket.id, message)

    const [first] = await manager.getUserRooms({ socketId: socket.id });

    // Since we are using default socket id (which is default)
    // So, every socket.id will always join to only 1 room.
    const [roomId, , peerId] = first || [];
    if (roomId) {
      await manager.removeUser(roomId, { socketId: socket.id, peerId });
      const users = await manager.getUsers(roomId);

      socket.broadcast.emit('USER_LEAVE', { socketId: socket.id, peerId, room: users });
    }
  });
});

module.exports = io

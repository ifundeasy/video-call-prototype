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

io.use((socket, next) => {
  if (socket.handshake.query && socket.handshake.query.token) {
    if (socket.handshake.query.token !== 'THIS_IS_JWT_TOKEN_FORMAT') {
      return next(new Error('Authentication error'));
    }
    return next();
  }
  return next(new Error('Authentication error'));
})

io.on('connection', (socket) => {
  console.info('io::connection', socket.id)

  socket.on('FRAME_TYPE', async ({
    roomId, peerId, userId, userName, data
  }) => {
    console.debug('socket::FRAME_TYPE', {
      roomId, peerId, userId, userName, data
    })

    await manager.setUserFrameType(roomId, {
      socketId: socket.id,
      peerId,
      frameType: data
    })

    socket.broadcast.to(roomId).emit('USER_FRAME_TYPE', {
      roomId, peerId, socketId: socket.id, userId, userName, data
    });
  });

  socket.on('FRAME_ANIMATION', async ({
    roomId, peerId, userId, userName, data
  }) => {
    console.debug('socket::FRAME_ANIMATION', {
      roomId, peerId, userId, userName, data: '...'
    })

    socket.broadcast.to(roomId).emit('USER_FRAME_ANIMATION', {
      roomId, peerId, socketId: socket.id, userId, userName, data
    });
  });

  socket.on('GET_ROOM_INFO', async ({ roomId }) => {
    console.debug('socket::GET_ROOM_INFO', { roomId })

    const users = await manager.getUsers(roomId);
    socket.emit('ROOM_INFO', { data: users });
  });

  socket.on('JOIN_ROOM', async ({
    roomId, peerId, userId, userName, frameType
  }) => {
    console.debug('socket::JOIN_ROOM', {
      roomId, peerId, socketId: socket.id, userId, userName
    })

    await manager.addUser(roomId, {
      socketId: socket.id, peerId, userId, userName, frameType
    });
    const users = await manager.getUsers(roomId);

    socket.join(roomId);
    socket.emit('ADDED_TO_ROOM', { room: users });
    socket.broadcast.to(roomId).emit('USER_JOINED', {
      roomId, peerId, socketId: socket.id, userId, userName, room: users
    });
  });

  socket.on('LEAVE_ROOM', async ({
    roomId, peerId, userId, userName
  }) => {
    console.debug('socket::LEAVE_ROOM', {
      roomId, peerId, socketId: socket.id, userId, userName
    })

    await manager.removeUser(roomId, { socketId: socket.id, peerId });
    const users = await manager.getUsers(roomId);

    socket.emit('LEAVE_FROM_ROOM');
    io.sockets.to(roomId).emit('USER_LEAVE', { socketId: socket.id, peerId, room: users });
  });

  socket.on('NEW_MESSAGE', ({
    roomId, peerId, socketId, userId, userName, data
  }) => {
    console.debug('socket::NEW_MESSAGE', {
      roomId, peerId, socketId, userId, userName, data
    })
    io.sockets.to(roomId).emit('USER_MESSAGE', {
      roomId, peerId, socketId, userId, userName, data
    });
  });

  socket.on('disconnect', async (message) => {
    console.warn('socket::disconnect', socket.id, message)

    const [first] = await manager.getUserRooms({ socketId: socket.id });

    // Since we are using default socket id (which is default)
    // So, every socket.id will always join to only 1 room.
    const [roomId, , peerId] = first || [];
    if (roomId) {
      await manager.removeUser(roomId, { socketId: socket.id, peerId });
      const users = await manager.getUsers(roomId);

      io.sockets.to(roomId).emit('USER_LEAVE', { socketId: socket.id, peerId, room: users });
    }
  });
});

module.exports = io

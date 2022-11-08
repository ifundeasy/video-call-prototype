/* eslint-disable no-undef, consistent-return, no-alert, no-use-before-define */

window.el = {
  mdlChat: $('#mdl-chat'),
  mdlChatContainer: $('#mdl-chat .chat-bubble-container'),
  cntStream: $('#stream-container'),
  cntPreview: $('#preview-container'),
  cntMyContent: $('#self-content'),
  btnCamera: $('#btn-camera'),
  btnMic: $('#btn-mic'),
  btnCall: $('#btn-call'),
  inpMsg: $('#inp-msg'),
  btnSendMsg: $('#btn-send-msg')
};
window.localStream = undefined; // MediaStream object
window.otherStreams = {}; // MediaStream object
window.socket = undefined; // Socket io client object
window.peer = undefined; // Peerjs client object
window.state = {
  mic: false,
  camera: false,
  avatar: false,
  everDisconnected: false,
  userId: undefined,
  userName: undefined,
  room: undefined, // room pool information,

  // process.env variable
  nodeEnv: window.NODE_ENV,
  roomId: window.ROOM_ID,
  svcURL: window.SVC_URL,
  models: window.MODELS_2D,
}

el.mdlChat.on('shown.bs.modal', () => {
  el.inpMsg.trigger('focus')
});

el.btnMic.on('click', (event) => {
  el.btnMic.toggleClass(['btn-light', 'btn-info'])
  el.btnMic.find('i').toggleClass(['bi-mic-off', 'bi-mic'])
  state.mic = !el.btnMic.hasClass('btn-light')
  localStream.getAudioTracks()[0].enabled = state.mic;
})

el.btnCamera.on('click', (event) => {
  const child = el.btnCamera.find('i');
  if (child.hasClass('bi-camera-video-off')) {
    child.removeClass('bi-camera-video-off')
    child.addClass('bi-camera-video')
    el.btnCamera.removeClass('btn-light')
    el.btnCamera.addClass('btn-info')
    state.camera = true
    state.avatar = false
    localStream.getVideoTracks()[0].enabled = true;
  } else if (child.hasClass('bi-camera-video')) {
    child.removeClass('bi-camera-video')
    child.addClass('bi-person-circle')
    el.btnCamera.removeClass('btn-info')
    el.btnCamera.addClass('btn-dark')
    state.camera = false
    state.avatar = true
    localStream.getVideoTracks()[0].enabled = false;
  } else {
    child.removeClass('bi-person-circle')
    child.addClass('bi-camera-video-off')
    el.btnCamera.removeClass('btn-dark')
    el.btnCamera.addClass('btn-light')
    state.camera = false
    state.avatar = false
    localStream.getVideoTracks()[0].enabled = false;
  }
})

el.inpMsg.on('keypress', (e) => {
  if (e.key === 'Enter') el.btnSendMsg.trigger('click')
});

el.btnSendMsg.on('click', () => {
  const msg = el.inpMsg.val()
  if (!msg) return;

  el.inpMsg.val('')
  socket.emit('NEW_MESSAGE', {
    roomId: state.roomId,
    peerId: peer.id,
    socketId: socket.id,
    userId: state.userId,
    userName: state.userName,
    data: msg
  });
})

function base64UTF(str, decode) {
  if (decode) return decodeURIComponent(escape(window.atob(str)));
  return window.btoa(unescape(encodeURIComponent(str)));
}

function askName() {
  const name = prompt('Enter your name')
  if (name == null) window.location.href = '/';
  else if (!name) return askName();
  else {
    state.userId = base64UTF(name);
    return name;
  }
}

function randomColor() {
  return Math.floor(Math.random() * 16777215).toString(16);
}

function addMsgHTML(msg, writer) {
  if (writer === state.userName) {
    return `
    <div class="row">
      <div class="float-end">
        <p class="float-end bg-gradient chat-bubble-text">
          <span>${msg}</span>
        </p>
      </div>
    </div>
  `
  }

  return `
  <div class="row">
    <div class="float-start">
      <p class="float-start bg-gradient chat-bubble-text">
        <span class="sender">
          <span class="text-info">${writer}</span>
          <span>:</span>
        </span>
        <span>${msg}</span>
      </p>
    </div>
  </div>
`
}

function cleanupSkeleton() {
  fixLayout();

  const exampleStream = el.cntStream.find('.resizer-outer').slice(1);
  exampleStream.fadeOut(() => exampleStream.remove());

  const exampleCanvas = el.cntMyContent.find('img');
  exampleCanvas.fadeOut(() => exampleCanvas.remove());

  el.cntMyContent.fadeOut(() => el.cntMyContent.addClass('hide-important'));

  const examplePreview = el.cntPreview.find('video');
  examplePreview.fadeOut(() => examplePreview.remove());

  const exampleChats = el.mdlChatContainer.find('.row')
  exampleChats.fadeOut(() => exampleChats.remove());
}

// * Make socket like HTTP Request (event handler wrapper)
function roomInfoHandler(resolver) {
  return function ({ roomId, account, data }) {
    if (resolver.name !== 'Function') {
      console.log('socket::ROOM_INFO', { roomId, account, data })
      window.state.room = data;
      resolver(data)
    }
  }
}

// * Make socket like HTTP Request (main)
async function getRoomInfo(socket, payload) {
  return new Promise((resolve) => {
    socket.emit('GET_ROOM_INFO', payload)
    if (socket.hasListeners('ROOM_INFO')) {
      socket.removeListener('ROOM_INFO', roomInfoHandler(Function)(Object))
    }
    socket.on('ROOM_INFO', roomInfoHandler(resolve));
  })
}

async function spawnPeerjs() {
  const {
    roomId, userId, userName,
    svcURL, nodeEnv
  } = state;

  console.log('> socket::connect', { roomId, socketId: socket.id })
  el.cntPreview.find('.user-info').html('You')

  state.everDisconnected = false;

  await getRoomInfo(socket, { roomId })

  peer = new Peer({
    path: '/rtc',
    host: svcURL.hostname,
    port: svcURL.port,
    // secure: nodeEnv === 'production',
    debug: nodeEnv === 'production' ? 3 : 2
  })

  // * available peer methods
  // peer.call(id, stream, [options]);
  // peer.connect(id);
  // peer.disconnect();
  // peer.reconnect(id);
  // peer.destroy();

  peer.on('open', (id) => {
    console.log('> peer::open', { id })

    socket.emit('JOIN_ROOM', {
      roomId,
      peerId: peer.id,
      socketId: socket.id,
      userId,
      userName
    });
  })

  peer.on('connection', (data) => {
    console.log('> peer::connection', { data })
  })

  peer.on('call', (media) => {
    console.log('> peer::call', { media })
    media.answer(localStream);

    const otherPeerId = media.peer;
    media.on('stream', (stream) => {
      console.log('call::stream (from=host)', { stream })

      // Finding that socket id
      const other = state.room.participants.filter((usr) => usr.indexOf(otherPeerId) > -1)[0]
      const [otherSocketId] = other.split(':')

      const otherAccount = state.room.accounts[other]
      addVideoStream({
        socketId: otherSocketId,
        userId: otherAccount.userId,
        userName: otherAccount.userName,
        stream,
        parentEl: el.cntStream
      });
    });
  })

  peer.on('close', () => {
    // can be triggered by peer.destroy()
    console.warn('> peer::close')
  })

  peer.on('disconnected', (id) => {
    console.error('> peer::disconnected', { id })
  })

  peer.on('error', (err) => {
    console.error('> peer::error', err.message)
  })
}

async function askLocalStream(opts) {
  const stream = await navigator.mediaDevices.getUserMedia(opts)

  return stream
}

async function connectToOther({
  peerId, socketId, userId, userName
}) {
  // await peer.connect(usr.peerId)
  const call = await peer.call(peerId, localStream);

  call.on('stream', (stream) => {
    console.log('call::stream (from=non-host)', { call })
    addVideoStream({
      socketId,
      userId,
      userName,
      stream,
      parentEl: el.cntStream
    });
  });
}

async function addVideoStream({
  userName,
  socketId,
  stream,
  camera,
  mic,
  forPreview,
  parentEl
}) {
  let childEl;
  let added = true;

  const newVideo = document.createElement('video');
  if (forPreview) {
    newVideo.muted = true;
    childEl = newVideo;
  } else if (!otherStreams[socketId]) {
    otherStreams[socketId] = true;
    childEl = $(`
      <div socketId="${socketId}" class="resizer-outer d-flex flex-column col" style="background-color: #${randomColor()}">
        <div class="resizer-inner">
          <div class="user-info user-info-badge">
            <span>${userName}</span>
          </div>
        </div>
      </div>
    `)
    childEl.find('.resizer-inner').prepend(newVideo)
  } else {
    added = false
  }

  if (!added) return newVideo.remove();

  newVideo.setAttribute('class', 'user-video')
  newVideo.srcObject = stream;
  if (camera === false) stream.getVideoTracks()[0].enabled = false;
  if (mic === false) stream.getAudiTracks()[0].enabled = false;

  newVideo.addEventListener('loadedmetadata', () => {
    newVideo.play();
    parentEl[forPreview ? 'prepend' : 'append'](childEl);
    fixLayout();
  });
}

function fixLayout() {
  let total = el.cntStream.find('.resizer-outer').length;
  if (state.room) {
    total = Object.keys(state.room.accounts).length - state.avatar ? 0 : 1;
  }
  resizeLayout(total, aspect = '16:9', debug = false)
}

$(window).on('resize', () => fixLayout())

$(async () => {
  cleanupSkeleton();

  await Promise.delay(1000);

  state.userName = askName();

  socket = io({
    path: '/io',
    host: state.svcURL.origin
  });

  socket.on('connect', spawnPeerjs)

  socket.on('ADDED_TO_ROOM', async ({ room }) => {
    console.log('> socket::ADDED_TO_ROOM', { room })

    // update room info
    state.room = room;

    localStream = await askLocalStream({ audio: true, video: true });
    addVideoStream({
      socketId: socket.id,
      userId: state.userId,
      userName: state.userName,
      muted: state.mic,
      camera: state.camera,
      forPreview: true,
      stream: localStream,
      parentEl: el.cntPreview
    });

    if (`${socket.id}:${peer.id}` !== room.host) {
      console.log('I call the host')
      const [hostSocketId, hostPeerId] = room.host.split(':');
      const hostAccount = room.accounts[room.host];
      connectToOther({
        peerId: hostPeerId,
        socketId: hostSocketId,
        userId: hostAccount.userId,
        userName: hostAccount.userName
      });

      /** this is section to call others */
      state.room.participants.forEach(async (other) => {
        const [otherSocketId, otherPeerId] = other.split(':')
        if (otherSocketId !== socket.id) {
          const otherAccount = room.accounts[other];
          connectToOther({
            peerId: otherPeerId,
            socketId: otherSocketId,
            userId: otherAccount.userId,
            userName: otherAccount.userName
          });
        }
      })
    }
  });

  socket.on('USER_JOINED', ({
    // their propertie, not you!
    roomId, peerId, socketId,
    userId, userName, room
  }) => {
    console.log('> socket::USER_JOINED', {
      roomId, peerId, socketId, userId, userName, room
    })

    // update room info
    state.room = room;
  });

  socket.on('USER_MESSAGE', ({
    roomId, peerId, socketId, userId, userName, data
  }) => {
    console.log('> socket::USER_MESSAGE', {
      roomId, peerId, socketId, userId, userName, data
    })
    el.mdlChatContainer.append(addMsgHTML(data, userName))
  });

  socket.on('USER_LEAVE', ({ socketId, peerId, room }) => {
    console.log('> socket::USER_LEAVE', { socketId, peerId, room })

    // update room info
    state.room = room;

    el.cntStream.find(`[socketId="${socketId}"]`).remove()
  });

  socket.on('disconnect', (message) => {
    state.everDisconnected = true;
    console.error('> socket::disconnect', message);

    el.cntPreview.find('.user-info').html('Disconnected!')
  })
});

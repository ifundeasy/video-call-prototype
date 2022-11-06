// Loaded from process.env
window.nodeEnv = window.NODE_ENV;
window.roomId = window.ROOM_ID;
window.rtcURL = window.RTC_URL;
window.svcURL = window.SVC_URL;

// Global variables
window.el = {};
window.myVideo = {};
window.socket = undefined;
window.peer = undefined;
window.userId = undefined;
window.userName = askName();
window.reconnect = false;
window.room = undefined;
window.initedPeer = false;

function utf8_to_b64(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
}

function b64_to_utf8(str) {
  return decodeURIComponent(escape(window.atob(str)));
}

function askName() {
  const name = prompt('Enter your name')
  if (name == null) window.location.href = '/';
  else if (!name) return askName();
  else {
    userId = utf8_to_b64(name);
    return name;
  }
}

function addMsgHTML(msg, writer) {
  if (writer === userName) {
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

async function connectToOther(usr, localStream) {
  // await peer.connect(usr.peerId)
  const call = await peer.call(usr.peerId, localStream);

  call.on('stream', (stream) => {
    console.log('call::stream (from=non-host)', { call })
    addVideoStream({
      ...usr,
      stream
    }, el.cntOther);
  });
}

async function addVideoStream(usr, parent) {
  usr.el = document.createElement('video'),
  usr.el.srcObject = usr.stream;
  if (usr.muted) usr.el.muted = true;

  usr.el.addEventListener('loadedmetadata', () => {
    usr.el.play();
    if (el.cntOther.attr('id') !== parent.attr('id')) {
      return parent.prepend(usr.el)
    }

    if (!el.cntSelfPreviewVideo.find('video').length) {
      el.cntSelfVideo.hide()
      el.cntSelfPreviewVideo.show()
      $(myVideo.el).prependTo(el.cntSelfPreviewVideo)
    }

    if (
      usr.userName !== userName
      && !parent.find(`.vlayer-1[socketId="${usr.socketId}"]`).length
    ) {
      const child = $(`
          <div socketId="${usr.socketId}" class="vlayer-1 col-lg-4 col-md-4 col-sm-6 col-xs-12">
          <div class="vlayer-2 row h-100">
            <div class="vlayer-3 col w-100">
              <div class="vlayer-4 d-flex align-items-center justify-content-center">
                <div class="other-name">
                  <span>${usr.userName}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `)
      parent.show();
      parent.append(child)
      $(usr.el).prependTo(child.find('.vlayer-4'))
    }
  });
}

function initElement() {
  Object.assign(el, {
    mdlChat: $('#mdl-chat'),
    mdlChatContainer: $('#mdl-chat .chat-bubble-container'),
    cntOther: $('#cnt-other'),
    cntSelfVideo: $('#cnt-self'),
    cntSelfPreviewVideo: $('.vlayer-preview'),
    btnCamera: $('#btn-camera'),
    btnAvatar: $('#btn-avatar'),
    btnCameraOff: $('#btn-camera-off'),
    btnMic: $('#btn-mic'),
    btnMicOff: $('#btn-mic-off'),
    btnCallEnd: $('#btn-call-end'),
    inpMsg: $('#inp-msg'),
    btnSendMsg: $('#btn-send-msg')
  })

  el.mdlChat.on('shown.bs.modal', () => {
    el.inpMsg.trigger('focus')
  });

  el.btnCamera.on('click', () => {
    el.btnCamera.hide()
    el.btnAvatar.show()
    myVideo.stream.getVideoTracks()[0].enabled = false;
  })

  el.btnAvatar.on('click', () => {
    el.btnAvatar.hide()
    el.btnCameraOff.show()
    myVideo.stream.getVideoTracks()[0].enabled = false;
  })

  el.btnCameraOff.on('click', () => {
    el.btnCameraOff.hide()
    el.btnCamera.show()
    myVideo.stream.getVideoTracks()[0].enabled = true;
  })

  el.btnMic.on('click', () => {
    el.btnMic.hide()
    el.btnMicOff.show()
    myVideo.stream.getAudioTracks()[0].enabled = false;
  })

  el.btnMicOff.on('click', () => {
    el.btnMicOff.hide()
    el.btnMic.show()
    myVideo.stream.getAudioTracks()[0].enabled = true;
  })

  el.inpMsg.on('keypress', (e) => {
    if (e.key === 'Enter') el.btnSendMsg.trigger('click')
  });

  el.btnSendMsg.on('click', () => {
    const msg = el.inpMsg.val()
    if (!msg) return;

    el.inpMsg.val('')
    socket.emit('NEW_MESSAGE', {
      roomId,
      peerId: peer.id,
      socketId: socket.id,
      userId,
      userName,
      data: msg
    });
  })
}

// * Make socket like HTTP Request (event handler wrapper)
function roomInfoHandler(resolver) {
  return function ({ roomId, account, data }) {
    if (resolver.name !== 'Function') {
      console.log('socket::ROOM_INFO', { roomId, account, data })
      window.room = data;
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

async function initLocalStream(opts) {
  const stream = await navigator.mediaDevices.getUserMedia(opts)

  return stream
}

async function initPeer() {
  console.log('> socket::connect', { roomId, socketId: socket.id })

  await getRoomInfo(socket, { roomId })

  peer = new Peer({
    path: '/',
    host: rtcURL.hostname,
    port: rtcURL.port,
    secure: nodeEnv === 'production',
    debug: nodeEnv === 'production' ? 3 : 2
  })

  // peer.call(id, stream, [options]);
  // peer.connect(id);
  // peer.disconnect();
  // peer.reconnect(id);
  // peer.destroy();

  console.log(room)

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
    media.answer(myVideo.stream);

    const otherPeerId = media.peer;
    media.on('stream', (stream) => {
      console.log('call::stream (from=host)', { stream })

      el.cntSelfPreviewVideo.show();
      $(myVideo.el).prependTo(el.cntSelfPreviewVideo);
      el.cntSelfVideo.hide();

      // Finding that socket id
      const other = room.participants.filter((other) => other.indexOf(otherPeerId) > -1)[0]
      const [ otherSocketId ] = other.split(':')

      const otherAccount = room.accounts[other]
      const usr = {
        socketId: otherSocketId,
        userId: otherAccount.userId,
        userName: otherAccount.userName,
        stream
      }
      addVideoStream(usr, el.cntOther);
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

initElement();
el.btnAvatar.hide()
el.btnCameraOff.hide()
el.btnMicOff.hide()
el.cntOther.find('.vlayer-1').remove()
el.mdlChatContainer.find('.row').remove();

socket = io({
  path: '/io',
  host: svcURL.origin
});

socket.on('connect', initPeer)

socket.on('ADDED_TO_ROOM', async ({ room: _room}) => {
  console.log('> socket::ADDED_TO_ROOM', { _room })

  // update room info
  room = _room;

  el.cntOther.hide();
  el.cntSelfPreviewVideo.hide();
  el.cntSelfVideo.show();

  // default muted
  el.btnMic.hide();
  el.btnMicOff.show();

  myVideo = {
    socketId: socket.id,
    userId,
    userName,
    muted: true,
    stream: await initLocalStream({ audio: true, video: true })
  }
  addVideoStream(myVideo, el.cntSelfVideo);

  if (`${socket.id}:${peer.id}` !== _room.host) {
    console.log('I call the host')
    const [ hostSocketId, hostPeerId ] = _room.host.split(':');
    const hostAccount = _room.accounts[_room.host];
    connectToOther({
      peerId: hostPeerId,
      socketId: hostSocketId,
      userId: hostAccount.userId,
      userName: hostAccount.userName
    }, myVideo.stream);
    
    /** this is section to call others */
    room.participants.forEach(async (other) => {
      const [otherSocketId, otherPeerId] = other.split(':')
      if (otherSocketId !== socket.id) {
        const otherAccount = _room.accounts[other];
        connectToOther({
          peerId: otherPeerId,
          socketId: otherSocketId,
          userId: otherAccount.userId,
          userName: otherAccount.userName
        }, myVideo.stream);
      }
    })
  }
});

socket.on('USER_JOINED', ({
  // their propertie, not you!
  roomId, peerId, socketId, userId: _userId, userName: _userName, room: _room
}) => {
  console.log('> socket::USER_JOINED', {
    roomId, peerId, socketId, _userId, _userName, _room
  })

  // update room info
  room = _room;
});

socket.on('USER_MESSAGE', ({ roomId, peerId, socketId, userId, userName, data }) => {
  console.log('> socket::USER_MESSAGE', { roomId, peerId, socketId, userId, userName, data })
  el.mdlChatContainer.append(addMsgHTML(data, userName))
});

socket.on('USER_LEAVE', ({ socketId, peerId, room: _room }) => {
  console.log('> socket::USER_LEAVE', { socketId, peerId, _room })

  // update room info
  room = _room;

  el.cntOther.find(`.vlayer-1[socketId="${socketId}"]`).remove()
  if (!el.cntOther.find('.vlayer-1').length) {
    $(myVideo.el).prependTo(el.cntSelfVideo)
    el.cntSelfVideo.show()
    el.cntSelfPreviewVideo.hide()
  }
});
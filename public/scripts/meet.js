let myVideo = {};

const askName = () => {
  const name = prompt('Enter your name')
  if (name == null) window.location.href = '/';
  else if (!name) return askName();
  else return name;
};

const userName = askName();
const socket = io({
  path: '/io',
  host: window.SVC_URL.origin
  
});
const peer = new Peer({
  path: '/',
  host: window.RTC_URL.hostname,
  port: window.NODE_ENV === 'production' ? 443 : window.RTC_URL.port,
  secure: window.NODE_ENV === 'production'
})
const el = {
  mdlChat: $('#mdl-chat'),
  mdlChatContainer: $('#mdl-chat .chat-bubble-container'),
  cntParticipant: $('#cnt-participant'),
  cntSelfVideo: $('.vlayer-self'),
  cntSelfPreviewVideo: $('.vlayer-preview'),
  btnCamera: $('#btn-camera'),
  btnAvatar: $('#btn-avatar'),
  btnCameraOff: $('#btn-camera-off'),
  btnMic: $('#btn-mic'),
  btnMicOff: $('#btn-mic-off'),
  btnCallEnd: $('#btn-call-end'),
  inpMsg: $('#inp-msg'),
  btnSendMsg: $('#btn-send-msg')
};

const addMsgHTML = (msg, writer) => {
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
const connectToNewUser = async (roomId, account, stream) => {
  const call = await peer.call(account.peerId, stream);

  // FIXME: Kadang ga konek pas refresh2

  call.on('stream', (stream) => {
    console.log('call::stream 1', { call })

    const usrVideo = { roomId, account, stream };
    addVideoStream(usrVideo, el.cntParticipant);
  });
};
const addVideoStream = (usr, parent) => {
  usr.el = document.createElement('video'),
  usr.el.srcObject = usr.stream;
  if (usr.muted) usr.el.muted = true;

  usr.el.addEventListener('loadedmetadata', () => {
    usr.el.play();
    if (el.cntParticipant.attr('id') !== parent.attr('id')) {
      return parent.prepend(usr.el)
    }

    if (!el.cntSelfPreviewVideo.find('video').length) {
      el.cntSelfVideo.hide()
      el.cntSelfPreviewVideo.show()
      $(myVideo.el).prependTo(el.cntSelfPreviewVideo)
    }

    if (
      usr.account.userName !== userName
      && !parent.find(`.vlayer-1[socketId="${usr.account.socketId}"]`).length
    ) {
      const child = $(`
          <div socketId="${usr.account.socketId}" class="vlayer-1 col-lg-4 col-md-4 col-sm-6 col-xs-12">
          <div class="vlayer-2 row h-100">
            <div class="vlayer-3 col w-100">
              <div class="vlayer-4 w-100">
                <div class="participant-name">
                  <span>${usr.account.userName}</span>
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
};

el.btnAvatar.hide()
el.btnCameraOff.hide()
el.btnMicOff.hide()
el.cntParticipant.find('.vlayer-1').remove()
el.mdlChatContainer.find('.row').remove()

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
    roomId: window.ROOM_ID,
    account: {
      peerId: peer.id,
      socketId: socket.id,
      userName
    },
    data: msg
  });
})

socket.on('connect', () => console.log('socket::connect', {
  roomId: window.ROOM_ID,
  account: {
    peerId: peer.id,
    socketId: socket.id,
    userName
  }
}))

peer.on('open', (id) => {
  console.log('> peer::open', { id })
  socket.emit('JOIN_ROOM', {
    roomId: window.ROOM_ID,
    account: {
      // peerId: peer.id, // this is same
      peerId: id,
      socketId: socket.id,
      userName
    },
    data: null
  });
});

socket.on('USER_MESSAGE', ({ roomId, account, data }) => {
  console.log('socket::USER_MESSAGE', { roomId, account, data })
  el.mdlChatContainer.append(addMsgHTML(data, account.userName))
});

socket.on('USER_LEAVE', ({ data }) => {
  console.log('socket::USER_LEAVE', { data })
  el.cntParticipant.find(`.vlayer-1[socketId="${data}"]`).remove()
  if (!el.cntParticipant.find('.vlayer-1').length) {
    $(myVideo.el).prependTo(el.cntSelfVideo)
    el.cntSelfVideo.show()
    el.cntSelfPreviewVideo.hide()
  }
});

navigator.mediaDevices
  .getUserMedia({ audio: true, video: true })
  .then((stream) => {
    el.cntParticipant.hide();
    el.cntSelfPreviewVideo.hide();
    el.cntSelfVideo.show();

    myVideo = {
      roomId: window.ROOM_ID,
      account: {
        peerId: peer.id,
        socketId: socket.id,
        userName
      },
      muted: true,
      stream
    }
    addVideoStream(myVideo, el.cntSelfVideo);
    console.log(123)

    peer.on('call', async (call) => {
      console.log('> peer::call', { call })

      call.answer(stream);

      call.on('stream', (stream) => {
        console.log('call::stream 2', { call })

        el.cntSelfPreviewVideo.show();
        $(myVideo.el).prependTo(el.cntSelfPreviewVideo);
        el.cntSelfVideo.hide();

      // const usrVideo = { roomId, account, stream };
      // addVideoStream(usrVideo, el.cntParticipant);

      // const usrVideo = {
      //   roomId: window.ROOM_ID,
      //   account: {
      //     peerId: peer.id,
      //     socketId: '?',
      //     userName
      //   },
      //   muted: true,
      //   stream
      // };
      // addVideoStream(usrVideo, el.cntParticipant);
      });
    });

    socket.on('USER_JOINED', ({ roomId, account, data }) => {
      console.log('socket::USER_JOINED', { roomId, account, data })
      connectToNewUser(roomId, account, stream);
    });
  });

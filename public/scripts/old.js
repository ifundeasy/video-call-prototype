const socket = io({
  path: '/io',
  host: window.SVC_URL.origin
});
const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
const showChat = document.querySelector('#showChat');
const backBtn = document.querySelector('.header__back');
myVideo.muted = true;

backBtn.addEventListener('click', () => {
  document.querySelector('.main__left').style.display = 'flex';
  document.querySelector('.main__left').style.flex = '1';
  document.querySelector('.main__right').style.display = 'none';
  document.querySelector('.header__back').style.display = 'none';
});

showChat.addEventListener('click', () => {
  document.querySelector('.main__right').style.display = 'flex';
  document.querySelector('.main__right').style.flex = '1';
  document.querySelector('.main__left').style.display = 'none';
  document.querySelector('.header__back').style.display = 'block';
});

const userName = prompt('Enter your name');
const peer = new Peer({
  path: '/',
  host: window.RTC_URL.hostname,
  port: window.RTC_URL.port,
  secure: false // TODO: true if wss://domain.com:443
})

let myVideoStream;
navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    peer.on('call', (call) => {
      console.log('> peer.on("call")', { call })
      call.answer(stream);
      const video = document.createElement('video');
      call.on('stream', (userVideoStream) => {
        console.log('call.on("stream")', { call })
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on('USER_JOINED', ({ sender, data }) => {
      console.log('socket.on("USER_JOINED")', { sender, data })
      connectToNewUser(sender, stream);
    });
  });

const connectToNewUser = (sender, stream) => {
  const call = peer.call(sender.userId, stream);
  const video = document.createElement('video');
  call.on('stream', (userVideoStream) => {
    console.log('call.on("stream")', { call })
    addVideoStream(video, userVideoStream);
  });
};

peer.on('open', (id) => {
  console.log('> peer.on("open")', { id })
  socket.emit('JOIN_ROOM', {
    sender: {
      roomId: ROOM_ID,
      userId: id,
      userName
    },
    data: null
  });
});

const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
    videoGrid.append(video);
  });
};

const text = document.querySelector('#chat_message');
const send = document.getElementById('send');
const messages = document.querySelector('.messages');

send.addEventListener('click', (e) => {
  if (text.value.length !== 0) {
    socket.emit('NEW_MESSAGE', {
      sender: {
        roomId: ROOM_ID,
        userId: peer.id,
        userName
      },
      data: text.value
    });
    text.value = '';
  }
});

text.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && text.value.length !== 0) {
    socket.emit('NEW_MESSAGE', {
      sender: {
        roomId: ROOM_ID,
        userId: peer.id,
        userName
      },
      data: text.value
    });
    text.value = '';
  }
});

const inviteButton = document.querySelector('#inviteButton');
const muteButton = document.querySelector('#muteButton');
const stopVideo = document.querySelector('#stopVideo');
muteButton.addEventListener('click', () => {
  const { enabled } = myVideoStream.getAudioTracks()[0];
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    html = '<i class="fas fa-microphone-slash"></i>';
    muteButton.classList.toggle('background__red');
    muteButton.innerHTML = html;
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    html = '<i class="fas fa-microphone"></i>';
    muteButton.classList.toggle('background__red');
    muteButton.innerHTML = html;
  }
});

stopVideo.addEventListener('click', () => {
  const { enabled } = myVideoStream.getVideoTracks()[0];
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    html = '<i class="fas fa-video-slash"></i>';
    stopVideo.classList.toggle('background__red');
    stopVideo.innerHTML = html;
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    html = '<i class="fas fa-video"></i>';
    stopVideo.classList.toggle('background__red');
    stopVideo.innerHTML = html;
  }
});

inviteButton.addEventListener('click', (e) => {
  prompt(
    'Copy this link and send it to people you want to meet with',
    window.location.href
  );
});

socket.on('USER_MESSAGE', ({ sender, data }) => {
  console.log('socket.on("USER_MESSAGE")', { sender, data })
  messages.innerHTML
    += `<div class="message">
        <b><i class="far fa-user-circle"></i> <span> ${sender.userName === userName ? 'me' : sender.userName
}</span> </b>
        <span>${data}</span>
    </div>`;
});

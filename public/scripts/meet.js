/* eslint-disable no-undef, consistent-return, no-alert, no-use-before-define */

const {
  Application,
  live2d: { Live2DModel, Live2DFactory }
} = PIXI;

// Kalidokit provides a simple easing function
// (linear interpolation) used for animation smoothness
// you can use a more advanced easing function if you want
const {
  Face,
  Vector: { lerp },
  Utils: { clamp }
} = Kalidokit;

window.el = {
  slcModel: $('#slc-model'),
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
window.useFacemesh = true;
window.facemeshBinary = '/modules/@mediapipe/face_mesh/';
window.facemesh = undefined;
window.localStream = undefined; // MediaStream object
window.otherStreams = {}; // MediaStream object
window.localAnimation = {}; // PIXI.Application object
window.otherAnimations = {}; // PIXI.Application objects
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
  model: {
    // 2d model key
    key: window.MODELS_2D.length ? window.MODELS_2D[0].key : undefined,
    val: window.MODELS_2D.length ? window.MODELS_2D[0].val : undefined,
  },

  // process.env variable
  nodeEnv: window.NODE_ENV,
  roomId: window.ROOM_ID,
  svcURL: window.SVC_URL,
  models: window.MODELS_2D,
}

el.slcModel.on('change', function () {
  const val = $(this).val();
  state.model = {
    key: $(this).find(`option[value="${val}"]`).html(),
    val
  }
  addModelAnimation({
    socketId: socket.id,
    animation: {
      ...localAnimation,
      state: state.model,
    },
    parentEl: el.cntMyContent.find('.resizer-inner')
  })
  socket.emit('FRAME_TYPE', {
    roomId: state.roomId,
    peerId: peer.id,
    socketId: socket.id,
    userId: state.userId,
    userName: state.userName,
    data: state.model
  })
});

el.mdlChat.on('shown.bs.modal', () => {
  el.inpMsg.trigger('focus')
});

el.btnMic.on('click', (event) => {
  el.btnMic.toggleClass(['btn-light', 'btn-info'])
  el.btnMic.find('i').toggleClass(['bi-mic-off', 'bi-mic'])
  state.mic = !el.btnMic.hasClass('btn-light')
  localStream.getAudioTracks()[0].enabled = state.mic;
})

el.btnCall.on('click', (event) => {
  socket.emit('LEAVE_ROOM', {
    roomId: state.roomId,
    peerId: state.peerId,
    userId: state.userId,
    userName: state.userName
  })
})

el.btnCamera.on('click', (event) => {
  const child = el.btnCamera.find('i');

  let data = null
  if (child.hasClass('bi-camera-video-off')) {
    child.removeClass('bi-camera-video-off')
    child.addClass('bi-camera-video')
    el.btnCamera.removeClass('btn-light')
    el.btnCamera.addClass('btn-info')
    state.camera = true
    state.avatar = false
    localStream.getVideoTracks()[0].enabled = true;

    el.slcModel.fadeOut();
    if (!el.cntMyContent.hasClass('hide-important')) {
      el.cntMyContent.addClass('hide-important');
    }
  } else if (child.hasClass('bi-camera-video')) {
    child.removeClass('bi-camera-video')
    child.addClass('bi-person-circle')
    el.btnCamera.removeClass('btn-info')
    el.btnCamera.addClass('btn-dark')
    state.camera = false
    state.avatar = true
    localStream.getVideoTracks()[0].enabled = true;
    data = state.model;

    el.slcModel.fadeIn();
    el.cntMyContent.removeClass('hide-important');
    localAnimation.state = data;
    addModelAnimation({
      socketId: socket.id,
      animation: localAnimation,
      parentEl: el.cntMyContent.find('.resizer-inner')
    });
  } else {
    child.removeClass('bi-person-circle')
    child.addClass('bi-camera-video-off')
    el.btnCamera.removeClass('btn-dark')
    el.btnCamera.addClass('btn-light')
    state.camera = false
    state.avatar = false
    localStream.getVideoTracks()[0].enabled = false;

    el.slcModel.fadeOut();
    clearFaceMesh(el.cntPreview);
    if (!el.cntMyContent.hasClass('hide-important')) {
      el.cntMyContent.addClass('hide-important');
    }
  }
  socket.emit('FRAME_TYPE', {
    roomId: state.roomId,
    peerId: peer.id,
    socketId: socket.id,
    userId: state.userId,
    userName: state.userName,
    data
  })
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
  let name
  if (!window.faker) {
    name = prompt('Enter your name')
  } else {
    name = faker.name.fullName().split(' ').slice(0, 2).join(' ')
  }
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

function fixLayout() {
  let total = el.cntStream.find('.resizer-outer').length;
  if (state.room) {
    total = Object.keys(state.room.accounts).length - state.avatar ? 0 : 1;
  }
  resizeLayout(total, aspect = '16:9', debug = false)
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

// * Make socket like HTTP Request (event handler wrapper)
function roomInfoHandler(resolver) {
  return function ({ roomId, account, data }) {
    if (resolver.name !== 'Function') {
      console.debug('socket::ROOM_INFO', { roomId, account, data })
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

async function askLocalStream(videoEl) {
  return new Promise((resolve, reject) => {
    window.camera = new Camera(videoEl, {
      onFrame: async (a, b, v) => {
        if (facemesh && state.avatar) await facemesh.send({ image: videoEl });
      }
    });
    camera.start();

    let counter = 0
    const z = setInterval(() => {
      if (camera.g) {
        clearInterval(z)
        resolve(camera.g);
      } else if (counter === 10) {
        clearInterval(z)
        reject(new Error('failed getting localStream'))
      }
      counter += 1
    }, 1000)
  })
}

async function connectToOther({
  peerId, socketId, userId, userName
}) {
  // await peer.connect(usr.peerId)
  const call = await peer.call(peerId, localStream);

  call.on('stream', (stream) => {
    console.debug('call::stream (from=non-host)', { call })
    const otherContainerEl = addParticipantContainer({
      socketId,
      userName,
      parentEl: el.cntStream
    });
    if (!otherContainerEl.exist) {
      const parentEl = otherContainerEl.el.find('.resizer-inner')
      addVideoStream({
        socketId,
        userId,
        stream,
        parentEl
      });

      const account = `${socketId}:${peerId}`;
      const frameType = state.room.frameTypes[account];
      if (!frameType.val) {
        parentEl.find('video').fadeIn();
        parentEl.find('canvas').fadeOut();
        return
      }

      otherAnimations[socketId] = otherAnimations[socketId] || {}
      otherAnimations[socketId].state = frameType
      addModelAnimation({
        socketId,
        animation: {
          ...otherAnimations[socketId],
          state: frameType
        },
        parentEl
      });
      parentEl.find('canvas').fadeIn();
      parentEl.find('video').fadeOut()
    }
  });
}

function addParticipantContainer({ socketId, userName, parentEl }) {
  let exist = false;
  if (otherStreams[socketId]) {
    childEl = parentEl.find(`[socketId="${socketId}"]`)
    exist = true
  } else {
    childEl = $(`
      <div socketId="${socketId}" class="resizer-outer d-flex flex-column col" style="background-color: #${randomColor()}">
        <div class="resizer-inner">
          <div class="user-info user-info-badge">
            <span>${userName}</span>
          </div>
        </div>
      </div>
    `)
    parentEl.append(childEl);
    fixLayout();
  }

  return { exist, el: childEl };
}

async function addVideoStream({
  socketId,
  stream,
  camera,
  mic,
  forPreview,
  parentEl
}) {
  if (forPreview) {
    const videoEl = parentEl.find('video')[0]
    videoEl.muted = true;
    if (camera === false) stream.getVideoTracks()[0].enabled = false;
    if (mic === false) stream.getAudioTracks()[0].enabled = false;
    return videoEl;
  }

  otherStreams[socketId] = true;
  const videoEl = document.createElement('video')

  // videoEl.setAttribute('controls', 'controls')
  videoEl.setAttribute('class', 'user-video')
  videoEl.srcObject = stream;
  if (camera === false) videoEl.srcObject.getVideoTracks()[0].enabled = false;
  if (mic === false) videoEl.srcObject.getAudioTracks()[0].enabled = false;
  parentEl.prepend(videoEl);

  videoEl.addEventListener('loadedmetadata', () => {
    videoEl.play();
  });

  return videoEl;
}

async function addModelAnimation({ socketId, animation, parentEl }) {
  const { key: modelKey, val: modelUrl } = animation.state;

  let canvasEl = parentEl.find('canvas');
  if (!canvasEl.length) {
    canvasEl = $('<canvas class="user-avatar d-flex align-items-center justify-content-center"></canvas>');
    await parentEl.prepend(canvasEl)
  }

  if (socketId === socket.id) parentEl.removeClass('hide-important');
  if (!modelUrl) return canvasEl.fadeOut();
  if (animation.model && canvasEl.attr('model') === modelKey) {
    return animation.model.position.set(canvasEl.width() * 0.5, canvasEl.height() * 0.8);
  }

  canvasEl.attr('model', modelKey);

  const pixiApp = new Application({
    view: canvasEl[0],
    autoStart: true,
    transparent: true,
    backgroundAlpha: 0,
    resizeTo: parentEl[0]
  });
  parentEl[0].prepend(pixiApp.view)

  const container = new PIXI.Container();

  pixiApp.stage.addChild(container);

  // Load live2d model
  // const currentModel = new Live2DModel({ autoInteract: false })
  // await Live2DFactory.setupLive2DModel(currentModel, modelUrl, { autoInteract: false })
  const currentModel = await Live2DModel.from(modelUrl, { autoInteract: false, tag: randomColor() });
  currentModel.scale.set(0.4);
  currentModel.interactive = true;
  currentModel.anchor.set(0.5, 0.5);
  currentModel.position.set(parentEl.width() * 0.5, parentEl.height() * 0.8);

  // Add events to drag model
  currentModel.on('pointerdown', e => {
    currentModel.offsetX = e.data.global.x - currentModel.position.x;
    currentModel.offsetY = e.data.global.y - currentModel.position.y;
    currentModel.dragging = true;
  });
  currentModel.on('pointerup', e => {
    currentModel.dragging = false;
  });
  currentModel.on('pointermove', e => {
    if (currentModel.dragging) {
      currentModel.position.set(
        e.data.global.x - currentModel.offsetX,
        e.data.global.y - currentModel.offsetY
      );
    }
  });

  // Add mousewheel events to scale model
  canvasEl[0].addEventListener('wheel', e => {
    e.preventDefault();
    currentModel.scale.set(
      clamp(currentModel.scale.x + e.deltaY * -0.001, -0.5, 10)
    );
  });

  // Add live2d model to stage
  container.addChild(currentModel);
  animation.model = currentModel;

  if (socketId === socket.id) {
    facemesh = new FaceMesh({
      locateFile: file => `/modules/@mediapipe/face_mesh/${file}`
    });

    // set facemesh config
    facemesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    // pass facemesh callback function
    facemesh.onResults(results => {
      const points = results.multiFaceLandmarks[0];
      const myCanvasPreview = el.cntPreview.find('canvas')
      const isHidden = myCanvasPreview.hasClass('hide-important');
      if (points && state.avatar) {
        if (isHidden) myCanvasPreview.removeClass('hide-important');
        if (useFacemesh) drawFacemesh({ points, parentEl: el.cntPreview });

        animateLive2DModel({ points, model: animation.model, parentEl });

        return socket.emit('FRAME_ANIMATION', {
          roomId: state.roomId,
          peerId: peer.id,
          userId: state.userId,
          userName: state.userName,
          data: points
        })
      }

      if (!isHidden) return myCanvasPreview.addClass('hide-important');

      return null;
    });
  }
}

function clearFaceMesh(parentEl) {
  const videoEl = parentEl.find('video');
  const canvasEl = parentEl.find('canvas')[0];

  canvasEl.width = videoEl.width();
  canvasEl.height = videoEl.height();
  const context = canvasEl.getContext('2d');

  context.save();
  context.clearRect(0, 0, canvasEl.width, canvasEl.height);

  return context;
}

// Draw connectors and landmarks on output canvas
function drawFacemesh({ points, parentEl }) {
  context = clearFaceMesh(parentEl);

  // Use `Mediapipe` drawing functions
  drawConnectors(context, points, FACEMESH_TESSELATION, {
    color: '#C0C0C070',
    lineWidth: 0.5
  });

  if (points && points.length === 478) {
    // draw pupils
    drawLandmarks(context, [points[468], points[468 + 5]], {
      color: '#ffe603',
      lineWidth: 0.5
    });
  }
}

function animateLive2DModel({ points, model, parentEl }) {
  if (!model || !points) return;

  let riggedFace;

  if (points) {
    // use kalidokit face solver
    riggedFace = Face.solve(points, {
      runtime: 'mediapipe',
      video: parentEl.find('video')[0]
    });
    rigFace({
      model,
      result: riggedFace,
      lerpAmount: 0.5
    });
  }
}

// Update live2d model internal state
function rigFace({ result, model, lerpAmount = 0.7 }) {
  if (!model || !result) return;
  const updateFn = model.internalModel.motionManager.update;
  const { coreModel } = model.internalModel;

  model.internalModel.motionManager.update = (...args) => {
    // disable default blink animation
    model.internalModel.eyeBlink = undefined;

    coreModel.setParameterValueById(
      'ParamEyeBallX',
      lerp(
        result.pupil.x,
        coreModel.getParameterValueById('ParamEyeBallX'),
        lerpAmount
      )
    );
    coreModel.setParameterValueById(
      'ParamEyeBallY',
      lerp(
        result.pupil.y,
        coreModel.getParameterValueById('ParamEyeBallY'),
        lerpAmount
      )
    );

    // X and Y axis rotations are swapped for Live2D parameters
    // because it is a 2D system and KalidoKit is a 3D system
    coreModel.setParameterValueById(
      'ParamAngleX',
      lerp(
        result.head.degrees.y,
        coreModel.getParameterValueById('ParamAngleX'),
        lerpAmount
      )
    );
    coreModel.setParameterValueById(
      'ParamAngleY',
      lerp(
        result.head.degrees.x,
        coreModel.getParameterValueById('ParamAngleY'),
        lerpAmount
      )
    );
    coreModel.setParameterValueById(
      'ParamAngleZ',
      lerp(
        result.head.degrees.z,
        coreModel.getParameterValueById('ParamAngleZ'),
        lerpAmount
      )
    );

    // update body params for models without head/body param sync
    const dampener = 0.3;
    coreModel.setParameterValueById(
      'ParamBodyAngleX',
      lerp(
        result.head.degrees.y * dampener,
        coreModel.getParameterValueById('ParamBodyAngleX'),
        lerpAmount
      )
    );
    coreModel.setParameterValueById(
      'ParamBodyAngleY',
      lerp(
        result.head.degrees.x * dampener,
        coreModel.getParameterValueById('ParamBodyAngleY'),
        lerpAmount
      )
    );
    coreModel.setParameterValueById(
      'ParamBodyAngleZ',
      lerp(
        result.head.degrees.z * dampener,
        coreModel.getParameterValueById('ParamBodyAngleZ'),
        lerpAmount
      )
    );

    // Simple example without winking.
    // Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
    const stabilizedEyes = Kalidokit.Face.stabilizeBlink(
      {
        l: lerp(
          result.eye.l,
          coreModel.getParameterValueById('ParamEyeLOpen'),
          0.7
        ),
        r: lerp(
          result.eye.r,
          coreModel.getParameterValueById('ParamEyeROpen'),
          0.7
        )
      },
      result.head.y
    );
    // eye blink
    coreModel.setParameterValueById('ParamEyeLOpen', stabilizedEyes.l);
    coreModel.setParameterValueById('ParamEyeROpen', stabilizedEyes.r);

    // mouth
    coreModel.setParameterValueById(
      'ParamMouthOpenY',
      lerp(
        result.mouth.y,
        coreModel.getParameterValueById('ParamMouthOpenY'),
        0.3
      )
    );
    // Adding 0.3 to ParamMouthForm to make default more of a "smile"
    coreModel.setParameterValueById(
      'ParamMouthForm',
      0.3
      + lerp(
        result.mouth.x,
        coreModel.getParameterValueById('ParamMouthForm'),
        0.3
      )
    );
  };
}

async function spawnPeerjs() {
  const {
    roomId, userId, userName,
    svcURL, nodeEnv
  } = state;

  console.debug('socket::connect', { roomId, socketId: socket.id })
  el.cntPreview.find('.user-info span').html('You')

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
    console.debug('peer::open', { id })

    socket.emit('JOIN_ROOM', {
      roomId,
      peerId: peer.id,
      socketId: socket.id,
      userId,
      userName
    });
  })

  peer.on('connection', (data) => {
    console.debug('peer::connection', { data })
  })

  peer.on('call', (media) => {
    console.debug('peer::call', { media })
    media.answer(localStream);

    const otherPeerId = media.peer;
    media.on('stream', (stream) => {
      console.debug('call::stream (from=host)', { stream })

      // Finding that socket id
      const other = state.room.participants.filter((usr) => usr.indexOf(otherPeerId) > -1)[0]
      const [otherSocketId] = other.split(':')

      const otherAccount = state.room.accounts[other]
      const otherContainerEl = addParticipantContainer({
        socketId: otherSocketId,
        userName: otherAccount.userName,
        parentEl: el.cntStream
      });
      if (!otherContainerEl.exist) {
        addVideoStream({
          socketId: otherSocketId,
          userId: otherAccount.userId,
          stream,
          parentEl: otherContainerEl.el.find('.resizer-inner')
        });
      }
    });
  })

  peer.on('close', () => {
    // can be triggered by peer.destroy()
    console.warn('peer::close')
  })

  peer.on('disconnected', (id) => {
    console.error('peer::disconnected', { id })
  })

  peer.on('error', (err) => {
    console.error('peer::error', err.message)
  })
}

$(async () => {
  // Cleanup fase: start;
  fixLayout();

  el.slcModel.fadeOut();
  el.cntMyContent.addClass('hide-important');

  const exampleChats = el.mdlChatContainer.find('.row')
  exampleChats.fadeOut(() => exampleChats.remove());

  await Promise.delay(1000);
  // Cleanup fase: end;

  state.userName = askName();

  socket = io({
    path: '/io',
    host: state.svcURL.origin
  });

  socket.on('connect', spawnPeerjs)

  socket.on('ADDED_TO_ROOM', async ({ room }) => {
    console.debug('socket::ADDED_TO_ROOM', { room })

    // update room info
    state.room = room;

    localStream = await askLocalStream(el.cntPreview.find('video')[0]);
    addVideoStream({
      socketId: socket.id,
      userId: state.userId,
      muted: true,
      mic: state.mic,
      camera: state.camera,
      forPreview: true,
      stream: localStream,
      parentEl: el.cntPreview
    });

    el.cntMyContent.css('background-color', `#${randomColor()}`);
    el.cntMyContent.find('.user-info span').html(`You (${state.userName})`);
    el.cntPreview.find('.user-info span').html(`You (${state.userName})`);

    if (`${socket.id}:${peer.id}` !== room.host) {
      console.info('call others')
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

  socket.on('LEAVE_FROM_ROOM', () => {
    console.debug('socket::LEAVE_FROM_ROOM')

    socket.disconnect();
    socket.destroy();
    peer.disconnect();
    peer.destroy();
    alert('Bye bye..')
    window.location.href = '/'
  });

  socket.on('USER_JOINED', ({
    // their propertie, not you!
    roomId, peerId, socketId,
    userId, userName, room
  }) => {
    console.debug('socket::USER_JOINED', {
      roomId, peerId, socketId, userId, userName, room
    })

    // update room info
    state.room = room;
  });

  socket.on('USER_MESSAGE', ({
    roomId, peerId, socketId, userId, userName, data
  }) => {
    console.debug('socket::USER_MESSAGE', {
      roomId, peerId, socketId, userId, userName, data
    })
    el.mdlChatContainer.append(addMsgHTML(data, userName))
  });

  socket.on('USER_LEAVE', ({ socketId, peerId, room }) => {
    console.debug('socket::USER_LEAVE', { socketId, peerId, room })

    // update room info
    state.room = room;

    el.cntStream.find(`[socketId="${socketId}"]`).remove()
  });

  socket.on('USER_FRAME_TYPE', ({
    roomId, peerId, socketId, userId, userName, data
  }) => {
    console.debug('socket::USER_FRAME_TYPE', {
      roomId, peerId, userId, userName, data
    })

    const parentEl = el.cntStream.find(`[socketId="${socketId}"] .resizer-inner`);
    if (!data) {
      parentEl.find('video').fadeIn();
      parentEl.find('canvas').fadeOut();
      return null;
    }

    otherAnimations[socketId] = otherAnimations[socketId] || {}
    otherAnimations[socketId].state = data;
    addModelAnimation({
      socketId,
      animation: otherAnimations[socketId],
      parentEl
    })
    parentEl.find('video').fadeOut();
    parentEl.find('canvas').fadeIn();
  });

  socket.on('USER_FRAME_ANIMATION', ({
    roomId, peerId, socketId, userId, userName, data
  }) => {
    console.debug('socket::USER_FRAME_ANIMATION', {
      roomId, peerId, userId, userName, data: '...'
    })

    const { model } = otherAnimations[socketId];
    const parentEl = el.cntStream.find(`[socketId="${socketId}"] .resizer-inner`);

    animateLive2DModel({ points: data, model, parentEl });
  });

  socket.on('disconnect', (message) => {
    state.everDisconnected = true;
    console.error('socket::disconnect', message);

    el.cntPreview.find('.user-info span').html('Disconnected!')
  })
});

$(window).on('resize', () => fixLayout());

/* eslint-disable no-undef */

console.debug(window.location.pathname)

const {
  Application,
  Container,
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

window.model = undefined;

// Render live2d model
async function render({ canvasEl, parentEl, modelUrl }) {
  /**

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
   */
  const app = new Application({
    view: canvasEl,
    autoStart: true,
    transparent: true,
    backgroundAlpha: 0,
    resizeTo: parentEl
  });

  // Load live2d model
  model = await Live2DModel.from(modelUrl, { autoInteract: false });
  model.scale.set(0.2);
  model.interactive = true;
  model.anchor.set(0.5, 0.5);
  model.position.set(parentEl.offsetWidth * 0.5, parentEl.offsetHeight * 0.8);

  // Add events to drag model
  model.on('pointerdown', e => {
    model.offsetX = e.data.global.x - model.position.x;
    model.offsetY = e.data.global.y - model.position.y;
    model.dragging = true;
  });
  model.on('pointerup', e => {
    model.dragging = false;
  });
  model.on('pointermove', e => {
    if (model.dragging) {
      model.position.set(
        e.data.global.x - model.offsetX,
        e.data.global.y - model.offsetY
      );
    }
  });

  app.stage.addChild(model);
}

// Update live2d model internal state
function rigFace({ result, lerpAmount = 0.7 }) {
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

function animate(event) {
  if (event.origin !== window.location.origin) return;

  const { data: { socketId, points, timestamp }, origin, source } = event;
  if (!model || !socketId) return;

  if (!points) {
    console.debug(`Receive from origin=${origin} socketId=${socketId} data=${JSON.stringify(event.data)}`)
    return;
  }

  console.debug(`Apply animation from socketId=${socketId} totalPoints=${points.length} sample=${JSON.stringify(points[0])}`)

  let riggedFace;
  if (points) {
    // use kalidokit face solver
    riggedFace = Face.solve(points, {
      runtime: 'mediapipe',
      // video: parentEl.find('video')[0]
    });
    rigFace({
      result: riggedFace,
      lerpAmount: 0.5
    });
  }
}

if (MODEL_LIVE_2D) {
  render({
    canvasEl: document.getElementsByTagName('canvas')[0],
    parentEl: document.getElementsByTagName('body')[0],
    modelUrl: MODEL_LIVE_2D
  })

  if (window.addEventListener) {
    window.addEventListener('message', animate, false);
  } else {
    window.attachEvent('onmessage', animate);
  }
}

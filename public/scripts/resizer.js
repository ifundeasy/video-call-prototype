function getScreenRatio(a, b) {
  return (b == 0) ? a : getScreenRatio(b, a % b);
}

function resizeLayout(total, aspect = '16:9', debug = true) {
  const body = document.getElementsByTagName('body')[0];

  const Width = window.innerWidth;
  const Height = window.innerHeight;
  const Ratio = getScreenRatio(Width, Height);
  const Mode = Width > Height ? 'landscape' : Width == Height ? 'square' : 'portrait';

  // which bigger
  // const bigger = Width >= Height ? Width : Height;
  // const smaller = bigger == Width ? Height : Width;
  // const percent = smaller / bigger * 100;

  let columns = 1
  if (Mode == 'portrait') {
    columns = total < 4 ? 1 : 2;
  } else {
    if (Width < 320) {
      if (total > 1) columns = 2
    } else if (Width < 1600) {
      if (total == 3) columns = 3
      else if (total <= 4) columns = 2
      else if (total > 4) columns = 3
    } else if (Width < 1920) {
      if (total == 3) columns = 3
      else if (total <= 4) columns = 2
      else if (total <= 9) columns = 3
      else if (total > 9) columns = 4
    } else if (Width > 1920) {
      if (total == 3) columns = 3
      else if (total <= 4) columns = 2
      else if (total <= 9) columns = 3
      else if (total <= 16) columns = 4
      else if (total > 16) columns = 5
    }
  }

  const widthMin = Width / columns;
  let percent = 100; // which mean square
  if (aspect == '16:9') percent = 56.25;
  else if (aspect == '4:3') percent = 75;
  const heightMin = widthMin * (percent / 100)

  const oldStyle = document.getElementById("screen");
  if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

  const newStyle = document.createElement('style');
  newStyle.setAttribute('id', 'screen')
  newStyle.innerHTML = `
    .vid-layer-0 {
      height: ${Mode == 'landscape' ? '100%' : 'none'}
    }
    .vid-layer-1 {
      max-width: ${Width}px;
      max-height: ${Height}px;
      min-width: ${widthMin}px;
      min-height: ${heightMin}px;
      padding: 10px;
    }
    .vid-layer-2 {
      padding-top: ${percent}%;
      width: 100%;
      height: 100%;
      position: relative;
    }
    .vid-layer-3 {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    }
    .styleInjectorDebugger {
      position: fixed;
      z-index: 100;
      top: 10px;
      left: 10px;
      background-color: #94c988c7;
      border-radius: 5px;
    }
    .styleInjectorDebugger > pre {
      margin: 0;
      padding: 10px;
      font-size: 10px;
    }
  `

  body.append(newStyle)

  if (debug) {
    const oldDebugEl = document.getElementsByClassName("styleInjectorDebugger");
    if (oldDebugEl.length) oldDebugEl[0].parentNode.removeChild(oldDebugEl[0]);

    const newDebugEl = document.createElement('div')
    const newDebugElChild = document.createElement('pre')
    newDebugEl.setAttribute('class', 'styleInjectorDebugger')
    newDebugEl.append(newDebugElChild);
    newDebugElChild.innerHTML = JSON.stringify({
      width: Width,
      height: Height,
      widthRatio: Width / Ratio,
      heightRatio: Height / Ratio,
      mode: Mode
    }, 0, 2);
    body.prepend(newDebugEl)
  }
}
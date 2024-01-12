import {
  Dom,
  Effect,
  Image,
  ImageCapture,
  Module,
  Player,
  VideoRecorder,
  Webcam,
} from "https://cdn.jsdelivr.net/npm/@banuba/webar/dist/BanubaSDK.browser.esm.min.js";

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const modulesList = [
  "background",
  "body",
  "eyes",
  "face_tracker",
  "hair",
  "hands",
  "lips",
  "skin",
];

const desiredWidth = window.innerWidth;
const desiredHeight = window.innerHeight;
export const fps = {
  cam: 0,
  processing: 0,
  render: 0,
};

let currentEffect;

const [player, modules] = await Promise.all([
  Player.create({
    clientToken: window.BANUBA_CLIENT_TOKEN,
    proxyVideoRequestsTo: isSafari ? "___range-requests___/" : null,
    useFutureInterpolate: false,
  }),
  Module.preload(
    modulesList.map((m) => {
      return isSafari && m === "face_tracker"
        ? `https://cdn.jsdelivr.net/npm/@banuba/webar/dist/modules/${m}_lite.zip`
        : `https://cdn.jsdelivr.net/npm/@banuba/webar/dist/modules/${m}.zip`;
    }),
  ),
]);
await player.addModule(...modules);

const resize = (frameWidth, frameHeight) => {
  const wRatio = desiredWidth / frameWidth;
  const hRatio = desiredHeight / frameHeight;
  const ratio = Math.max(wRatio, hRatio);

  const resizedWidth = ratio * frameWidth;
  const resizedHeight = ratio * frameHeight;

  return [resizedWidth, resizedHeight];
};

const crop = (renderWidth, renderHeight) => {
  const dx = (renderWidth - desiredWidth) / 2;
  const dy = (renderHeight - desiredHeight) / 2;

  return [dx, dy, desiredWidth, desiredHeight];
};


let curResult;
let analyseFunc;
const renderAnalysisResultFuncs = {
  Detection_gestures: async (paramString, resultBlock) => {
    const eff = currentEffect;
    let res = await currentEffect.evalJs(paramString);
    console.log(eff);
    if (curResult !== res && res !== undefined) {
      curResult = res;
      const icon =
        res !== "No Gesture"
          ? `<img src="assets/icons/hand_gestures/${curResult}.svg" alt="${curResult}"/>`
          : "";
      resultBlock.innerHTML = icon + `<span>${curResult}</span>`;
    }
  },

  heart_rate: async (paramString, resultBlock) => {
    let res = await currentEffect.evalJs(paramString);
    if (curResult !== res && res !== undefined) {
      curResult = res;
      if (curResult.includes("calculation")) {
        resultBlock.classList.add("heart-rate__analyse");
      } else {
        resultBlock.classList.remove("heart-rate__analyse");
      }
      resultBlock.innerText = curResult;
    }
  },

  test_Ruler: async (paramString, resultBlock) => {
    let res = await currentEffect.evalJs(paramString);
    if (curResult !== res && res !== undefined) {
      curResult = res;
      resultBlock.innerText = curResult;
    }
  },
};

export const startAnalysis = async (effectName, paramString, resultBlock) => {
  analyseFunc = () =>
    renderAnalysisResultFuncs[effectName.split(".")[0]](
      paramString,
      resultBlock,
    );
  player.addEventListener("framedata", analyseFunc);
};

export const stopAnalysis = () => {
  player.removeEventListener("framedata", analyseFunc);
};

export const clearEffect = async () => {
  await player.clearEffect();
};

export const muteToggle = (value) => {
  player.setVolume(value);
};

export const getSource = (sourceType, file) => {
  return sourceType === "webcam" ? new Webcam() : new Image(file);
};

export const getPlayer = () => {
  return player;
};

export const startPlayer = (source) => {
  player.use(source, { resize, crop });
  Dom.render(player, "#webar");
};

export const applyEffect = async (effectName) => {
  currentEffect = new Effect(effectName);
  await player.applyEffect(currentEffect);
};

export const applyEffectParam = async (paramString) => {
  await currentEffect.evalJs(paramString);
};

export const startGame = () => {
  currentEffect.evalJs("isButtonTouched").then((isButtonTouched) => {
    if (isButtonTouched === "false") {
      currentEffect.evalJs("onClick()");
    }
  });
};

export const getScreenshot = async () => {
  const capture = new ImageCapture(player);
  return await capture.takePhoto();
};

let recorder;
const getRecorder = () => {
  if (recorder) return recorder;

  recorder = new VideoRecorder(player);
  return recorder;
};

export const startRecord = () => {
  getRecorder().start();
};

export const stopRecord = async () => {
  return await getRecorder().stop();
};

applyEffect("./assets/effects/Detection_gestures.zip")
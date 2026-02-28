import { state } from "./state.js";

let ctx = null;
let analyser, analyserWave, analyserData, waveData;
let masterGain, filterNode, compressor;
let reverbNode, reverbGain, dryGain;
let delayNode, delayFeedback, delayFilter, delayGain;

export function getCtx() { return ctx; }
export function getAnalyser() { return analyser; }
export function getAnalyserWave() { return analyserWave; }
export function getAnalyserData() { return analyserData; }
export function getWaveData() { return waveData; }
export function getFilterNode() { return filterNode; }
export function getCompressor() { return compressor; }
export function getReverbGain() { return reverbGain; }
export function getDryGain() { return dryGain; }
export function getDelayNode() { return delayNode; }
export function getDelayGain() { return delayGain; }
export function getDelayFeedback() { return delayFeedback; }

export function initAudio() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyserData = new Uint8Array(analyser.frequencyBinCount);

    analyserWave = ctx.createAnalyser();
    analyserWave.fftSize = 1024;
    waveData = new Uint8Array(analyserWave.fftSize);

    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 6;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.15;

    masterGain = ctx.createGain();
    masterGain.gain.value = 0.7;

    filterNode = ctx.createBiquadFilter();
    filterNode.type = "lowpass";
    filterNode.frequency.value = state.params.filter;
    filterNode.Q.value = state.params.resonance;

    reverbNode = ctx.createConvolver();
    reverbNode.buffer = makeReverb(ctx, 2.5);
    reverbGain = ctx.createGain();
    reverbGain.gain.value = state.params.reverb;
    dryGain = ctx.createGain();
    dryGain.gain.value = 1 - state.params.reverb * 0.5;

    delayNode = ctx.createDelay(2);
    delayNode.delayTime.value = (60 / state.bpm / 4) * 3;
    delayFeedback = ctx.createGain();
    delayFeedback.gain.value = state.params.delayFb;
    delayFilter = ctx.createBiquadFilter();
    delayFilter.type = "lowpass";
    delayFilter.frequency.value = 3000;
    delayGain = ctx.createGain();
    delayGain.gain.value = state.params.delay;

    // Signal chain
    filterNode.connect(dryGain);
    filterNode.connect(reverbNode);
    reverbNode.connect(reverbGain);
    dryGain.connect(compressor);
    reverbGain.connect(compressor);
    filterNode.connect(delayGain);
    delayGain.connect(delayNode);
    delayNode.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayFilter.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(analyser);
    masterGain.connect(analyserWave);
    analyser.connect(ctx.destination);
}

export function makeReverb(ac, dur) {
    const sr = ac.sampleRate,
        len = sr * dur,
        buf = ac.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++)
            d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    }
    return buf;
}

export function stepDuration() {
    return 60 / state.bpm / 4;
}

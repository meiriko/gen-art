import { state, isRowAudible } from "./state.js";
import {
    initAudio, getCtx, getFilterNode, getCompressor,
    getDelayNode, stepDuration,
} from "./audio.js";
import { INSTRUMENTS } from "./instruments.js";
import { midiToFreq } from "./scales.js";
import { playSample } from "./sampler.js";

// Callbacks set by main.js for rAF loop control
let onPlayStart = null;
let onPlayStop = null;
export function setOnPlayStart(fn) { onPlayStart = fn; }
export function setOnPlayStop(fn) { onPlayStop = fn; }

let nextStepTime = 0;
let schedulerTimer = null;

let showStatusFn = null;
export function setShowStatus(fn) { showStatusFn = fn; }

function showStatus(msg) {
    if (showStatusFn) showStatusFn(msg);
}

function schedule() {
    const ctx = getCtx();
    while (nextStepTime < ctx.currentTime + 0.1) {
        const t = nextStepTime;
        const sw =
            state.currentStep % 2 === 1
                ? state.params.swing * stepDuration()
                : 0;
        const st = t + sw;
        const dur = stepDuration() * 0.9;

        const delayNode = getDelayNode();
        if (delayNode)
            delayNode.delayTime.setTargetAtTime(stepDuration() * 3, st, 0.01);

        const filterNode = getFilterNode();
        const compressor = getCompressor();

        state.rows.forEach((row, ri) => {
            if (!row.pattern[state.currentStep] || !isRowAudible(ri)) return;
            const instKey = row.instrument;

            // Check for sample
            const smp = state.samples.find((s) => s.id === instKey);
            if (smp) {
                const span = smp.stepsSpan || 1;
                if (span > 1) {
                    const prevStep =
                        (state.currentStep - 1 + state.STEPS) % state.STEPS;
                    if (row.pattern[prevStep] && state.currentStep !== 0)
                        return;
                }
                const playDur = stepDuration() * (smp.stepsSpan || 1);
                playSample(ctx, compressor, smp, st, playDur);
                return;
            }

            const inst = INSTRUMENTS[instKey];
            if (!inst) return;
            const freq =
                inst.type === "melodic"
                    ? midiToFreq(row.notes[state.currentStep])
                    : 0;
            const dest = inst.type === "perc" ? compressor : filterNode;
            inst.play(ctx, dest, freq, st, dur, state.params);
        });

        nextStepTime += stepDuration();
        state.currentStep = (state.currentStep + 1) % state.STEPS;
    }
}

export function togglePlay() {
    initAudio();
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
        state.currentStep = 0;
        nextStepTime = ctx.currentTime + 0.05;
        schedulerTimer = setInterval(schedule, 20);
        document.getElementById("play-btn").textContent = "\u25a0 STOP";
        document.getElementById("status").textContent = "PLAYING";
        document.getElementById("status").classList.add("playing");
        if (onPlayStart) onPlayStart();
    } else {
        clearInterval(schedulerTimer);
        document.getElementById("play-btn").textContent = "\u25b6 PLAY";
        document.getElementById("status").textContent = "STOPPED";
        document.getElementById("status").classList.remove("playing");
        if (onPlayStop) onPlayStop();
    }
}

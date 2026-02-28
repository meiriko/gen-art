import { TIME_SIGS, DEFAULT_ROWS } from "./constants.js";

let STEPS = 16;
let bpm = 120;
let timeSig = "4/4";
let params = {
    filter: 2000,
    resonance: 4,
    filterEnv: 800,
    reverb: 0.3,
    delay: 0.25,
    delayFb: 0.35,
    swing: 0,
};

let rows = [];
let soloedRow = -1;
let patternSlots = new Array(8).fill(null);
let activeSlot = 0;
let vizMode = "spectrum";
let isPlaying = false;
let currentStep = 0;
let samples = [];
let sampleIdCounter = 0;

function makeRow(cfg) {
    return {
        instrument: cfg.inst || "kick",
        pattern: new Array(STEPS).fill(false),
        notes: new Array(STEPS).fill(cfg.minNote || 60),
        muted: false,
        minNote: cfg.minNote || 36,
        maxNote: cfg.maxNote || 84,
    };
}

function initRows() {
    rows = DEFAULT_ROWS.map((c) => makeRow(c));
}

function getBeatGroup() {
    const ts = TIME_SIGS[timeSig];
    return ts ? ts.subdiv : 4;
}

function resizePatterns() {
    rows.forEach((r) => {
        while (r.pattern.length < STEPS) {
            r.pattern.push(false);
            r.notes.push(r.minNote || 60);
        }
        r.pattern.length = STEPS;
        r.notes.length = STEPS;
    });
}

function isRowAudible(ri) {
    if (rows[ri].muted) return false;
    if (soloedRow >= 0 && soloedRow !== ri) return false;
    return true;
}

function getSampleSpan(ri) {
    const instKey = rows[ri].instrument;
    const smp = samples.find((s) => s.id === instKey);
    if (smp && smp.stepsSpan > 1) return smp.stepsSpan;
    return 1;
}

function nextSampleId() {
    return "smp_" + sampleIdCounter++;
}

// Exported state accessors
export const state = {
    get STEPS() { return STEPS; },
    set STEPS(v) { STEPS = v; },
    get bpm() { return bpm; },
    set bpm(v) { bpm = v; },
    get timeSig() { return timeSig; },
    set timeSig(v) { timeSig = v; },
    get params() { return params; },
    set params(v) { params = v; },
    get rows() { return rows; },
    set rows(v) { rows = v; },
    get soloedRow() { return soloedRow; },
    set soloedRow(v) { soloedRow = v; },
    get patternSlots() { return patternSlots; },
    get activeSlot() { return activeSlot; },
    set activeSlot(v) { activeSlot = v; },
    get vizMode() { return vizMode; },
    set vizMode(v) { vizMode = v; },
    get isPlaying() { return isPlaying; },
    set isPlaying(v) { isPlaying = v; },
    get currentStep() { return currentStep; },
    set currentStep(v) { currentStep = v; },
    get samples() { return samples; },
    get sampleIdCounter() { return sampleIdCounter; },
};

export {
    makeRow,
    initRows,
    getBeatGroup,
    resizePatterns,
    isRowAudible,
    getSampleSpan,
    nextSampleId,
};

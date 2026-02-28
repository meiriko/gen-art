import { state, isRowAudible } from "./state.js";
import { INSTRUMENTS } from "./instruments.js";
import { makeReverb, stepDuration } from "./audio.js";
import { midiToFreq } from "./scales.js";
import { playSample } from "./sampler.js";

let showStatusFn = null;
export function setShowStatus(fn) { showStatusFn = fn; }

function showStatus(msg) {
    if (showStatusFn) showStatusFn(msg);
}

export async function exportWav() {
    showStatus("RENDERING...");
    const loops = 2;
    const totalDur = stepDuration() * state.STEPS * loops + 2;
    const sr = 44100;
    const offCtx = new OfflineAudioContext(2, sr * totalDur, sr);

    const oc = offCtx.createDynamicsCompressor();
    oc.threshold.value = -12;
    oc.knee.value = 6;
    oc.ratio.value = 8;
    oc.attack.value = 0.003;
    oc.release.value = 0.15;

    const om = offCtx.createGain();
    om.gain.value = 0.7;

    const of2 = offCtx.createBiquadFilter();
    of2.type = "lowpass";
    of2.frequency.value = state.params.filter;
    of2.Q.value = state.params.resonance;

    const orv = offCtx.createConvolver();
    orv.buffer = makeReverb(offCtx, 2.5);
    const org = offCtx.createGain();
    org.gain.value = state.params.reverb;
    const odg = offCtx.createGain();
    odg.gain.value = 1 - state.params.reverb * 0.5;

    const odn = offCtx.createDelay(2);
    odn.delayTime.value = stepDuration() * 3;
    const odf = offCtx.createGain();
    odf.gain.value = state.params.delayFb;
    const odfl = offCtx.createBiquadFilter();
    odfl.type = "lowpass";
    odfl.frequency.value = 3000;
    const odgn = offCtx.createGain();
    odgn.gain.value = state.params.delay;

    of2.connect(odg);
    of2.connect(orv);
    orv.connect(org);
    odg.connect(oc);
    org.connect(oc);
    of2.connect(odgn);
    odgn.connect(odn);
    odn.connect(odfl);
    odfl.connect(odf);
    odf.connect(odn);
    odfl.connect(oc);
    oc.connect(om);
    om.connect(offCtx.destination);

    let stepT = 0.05;
    for (let l = 0; l < loops; l++) {
        for (let s = 0; s < state.STEPS; s++) {
            const sw = s % 2 === 1 ? state.params.swing * stepDuration() : 0;
            const st = stepT + sw;
            const dur = stepDuration() * 0.9;
            state.rows.forEach((row, ri) => {
                if (!row.pattern[s] || !isRowAudible(ri)) return;
                const smp = state.samples.find(
                    (sm) => sm.id === row.instrument,
                );
                if (smp) {
                    playSample(offCtx, oc, smp, st, dur);
                    return;
                }
                const inst = INSTRUMENTS[row.instrument];
                if (!inst) return;
                const freq =
                    inst.type === "melodic" ? midiToFreq(row.notes[s]) : 0;
                inst.play(
                    offCtx, inst.type === "perc" ? oc : of2,
                    freq, st, dur, state.params,
                );
            });
            stepT += stepDuration();
        }
    }

    const rendered = await offCtx.startRendering();
    const ab = new ArrayBuffer(
        44 + rendered.length * rendered.numberOfChannels * 2,
    );
    const v = new DataView(ab);

    function ws(o, s) {
        for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
    }

    const nc = rendered.numberOfChannels;
    const ba = nc * 2;
    const ds = rendered.length * ba;
    ws(0, "RIFF");
    v.setUint32(4, 36 + ds, true);
    ws(8, "WAVE");
    ws(12, "fmt ");
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, nc, true);
    v.setUint32(24, sr, true);
    v.setUint32(28, sr * ba, true);
    v.setUint16(32, ba, true);
    v.setUint16(34, 16, true);
    ws(36, "data");
    v.setUint32(40, ds, true);

    const ch = [];
    for (let c = 0; c < nc; c++) ch.push(rendered.getChannelData(c));
    let off = 44;
    for (let i = 0; i < rendered.length; i++) {
        for (let c = 0; c < nc; c++) {
            const s = Math.max(-1, Math.min(1, ch[c][i]));
            v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
            off += 2;
        }
    }

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ab], { type: "audio/wav" }));
    a.download = `synth-${state.bpm}bpm-${state.timeSig.replace("/", "-")}-${Date.now()}.wav`;
    a.click();
    showStatus(state.isPlaying ? "PLAYING" : "STOPPED");
}

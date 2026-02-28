import { state, getBeatGroup, getSampleSpan, makeRow, resizePatterns } from "./state.js";
import { TIME_SIGS } from "./constants.js";
import { INSTRUMENTS, MELODIC_KEYS, PERC_KEYS } from "./instruments.js";
import { noteName, scaleNotes } from "./scales.js";
import {
    initAudio, getCtx, getFilterNode, getReverbGain, getDryGain,
    getDelayGain, getDelayFeedback, stepDuration,
} from "./audio.js";

const seqContainer = document.getElementById("seq-rows");
const seqHeader = document.getElementById("seq-header");
const tooltip = document.getElementById("tooltip");
let tooltipTimeout;

// Knob state
const knobState = {};
export function getKnobState() { return knobState; }

export function showStatus(msg) {
    document.getElementById("status").textContent = msg;
    setTimeout(() => {
        document.getElementById("status").textContent = state.isPlaying
            ? "PLAYING"
            : "STOPPED";
    }, 1200);
}

export function showTooltip(x, y, text) {
    tooltip.textContent = text;
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
    tooltip.style.display = "block";
    clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(() => (tooltip.style.display = "none"), 800);
}

export function rebuildAll() {
    buildHeader();
    buildRows();
    updateRowSilencedState();
    updateStepUI();
}

function buildHeader() {
    seqHeader.innerHTML = "";
    const hdr = document.createElement("div");
    hdr.className = "seq-header";
    const left = document.createElement("div");
    left.className = "hdr-left";
    hdr.appendChild(left);
    const nums = document.createElement("div");
    nums.className = "step-nums";
    const group = getBeatGroup();
    const showAllNums = state.STEPS <= 16;
    for (let i = 0; i < state.STEPS; i++) {
        const sp = document.createElement("span");
        const isBeat = i % group === 0;
        sp.textContent = showAllNums || isBeat ? i + 1 : "";
        if (i > 0 && isBeat)
            sp.style.borderLeft = "1px solid rgba(0,229,255,0.15)";
        nums.appendChild(sp);
    }
    hdr.appendChild(nums);
    const right = document.createElement("div");
    right.className = "hdr-right";
    hdr.appendChild(right);
    seqHeader.appendChild(hdr);
}

function buildRows() {
    seqContainer.innerHTML = "";
    state.rows.forEach((row, ri) => {
        const div = document.createElement("div");
        div.className = `seq-row rc${ri % 12}`;
        div.dataset.row = ri;

        // Instrument select
        const sel = document.createElement("select");
        sel.className = "row-inst-select";
        const optM = document.createElement("optgroup");
        optM.label = "\u2500 MELODIC \u2500";
        MELODIC_KEYS.forEach((k) => {
            const o = document.createElement("option");
            o.value = k;
            o.textContent = INSTRUMENTS[k].name;
            if (k === row.instrument) o.selected = true;
            optM.appendChild(o);
        });
        const optP = document.createElement("optgroup");
        optP.label = "\u2500 PERCUSSION \u2500";
        PERC_KEYS.forEach((k) => {
            const o = document.createElement("option");
            o.value = k;
            o.textContent = INSTRUMENTS[k].name;
            if (k === row.instrument) o.selected = true;
            optP.appendChild(o);
        });
        sel.appendChild(optM);
        sel.appendChild(optP);

        if (state.samples.length > 0) {
            const optS = document.createElement("optgroup");
            optS.label = "\u2500 SAMPLES \u2500";
            state.samples.forEach((smp) => {
                const o = document.createElement("option");
                o.value = smp.id;
                o.textContent = "\ud83c\udfa4 " + smp.name;
                if (smp.id === row.instrument) o.selected = true;
                optS.appendChild(o);
            });
            sel.appendChild(optS);
        }

        sel.addEventListener("change", () => {
            state.rows[ri].instrument = sel.value;
            updateStepUI();
        });
        div.appendChild(sel);

        // Steps
        const group = getBeatGroup();
        for (let i = 0; i < state.STEPS; i++) {
            const s = document.createElement("div");
            s.className = "step";
            s.dataset.row = ri;
            s.dataset.step = i;
            if (i > 0 && i % group === 0) s.classList.add("beat-marker");
            const bar = document.createElement("div");
            bar.className = "pitch-bar";
            s.appendChild(bar);

            s.addEventListener("click", () => {
                const span = getSampleSpan(ri);
                if (span > 1) {
                    const blockStart = i;
                    const isOn = state.rows[ri].pattern[i];
                    if (isOn) {
                        for (let j = blockStart; j < Math.min(blockStart + span, state.STEPS); j++)
                            state.rows[ri].pattern[j] = false;
                    } else {
                        for (let j = blockStart; j < Math.min(blockStart + span, state.STEPS); j++)
                            state.rows[ri].pattern[j] = true;
                    }
                } else {
                    state.rows[ri].pattern[i] = !state.rows[ri].pattern[i];
                }
                updateStepUI();
            });

            s.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                const inst = INSTRUMENTS[state.rows[ri].instrument];
                if (inst && inst.type === "melodic" && state.rows[ri].pattern[i]) {
                    const rect = s.getBoundingClientRect();
                    const pct = 1 - (e.clientY - rect.top) / rect.height;
                    state.rows[ri].notes[i] = Math.round(
                        state.rows[ri].minNote +
                            pct * (state.rows[ri].maxNote - state.rows[ri].minNote),
                    );
                    updateStepUI();
                    showTooltip(e.clientX, rect.top - 20, noteName(state.rows[ri].notes[i]));
                }
            });

            s.addEventListener("wheel", (e) => {
                e.preventDefault();
                const inst = INSTRUMENTS[state.rows[ri].instrument];
                if (!inst || inst.type !== "melodic" || !state.rows[ri].pattern[i]) return;
                const d = e.deltaY < 0 ? 1 : -1;
                state.rows[ri].notes[i] = Math.max(
                    state.rows[ri].minNote,
                    Math.min(state.rows[ri].maxNote, state.rows[ri].notes[i] + d),
                );
                updateStepUI();
                const rect = s.getBoundingClientRect();
                showTooltip(rect.left + rect.width / 2, rect.top - 20, noteName(state.rows[ri].notes[i]));
            }, { passive: false });

            div.appendChild(s);
        }

        // Action buttons
        const acts = document.createElement("div");
        acts.className = "row-actions";

        const muteBtn = document.createElement("button");
        muteBtn.className = "row-act mute-btn" + (row.muted ? " muted" : "");
        muteBtn.innerHTML = "\ud83d\udd07";
        muteBtn.title = "Mute";
        muteBtn.addEventListener("click", () => {
            state.rows[ri].muted = !state.rows[ri].muted;
            muteBtn.classList.toggle("muted", state.rows[ri].muted);
            updateRowSilencedState();
        });
        acts.appendChild(muteBtn);

        const soloBtn = document.createElement("button");
        soloBtn.className = "row-act solo-btn" + (state.soloedRow === ri ? " soloed" : "");
        soloBtn.innerHTML = "\ud83c\udfa7";
        soloBtn.title = "Solo \u2014 only this track";
        soloBtn.addEventListener("click", () => {
            state.soloedRow = state.soloedRow === ri ? -1 : ri;
            updateSoloBtnUI();
            updateRowSilencedState();
        });
        acts.appendChild(soloBtn);

        const clrBtn = document.createElement("button");
        clrBtn.className = "row-act clr-btn";
        clrBtn.innerHTML = "\u232b";
        clrBtn.title = "Clear this row";
        clrBtn.addEventListener("click", () => {
            state.rows[ri].pattern.fill(false);
            updateStepUI();
        });
        acts.appendChild(clrBtn);

        const delBtn = document.createElement("button");
        delBtn.className = "row-act del-btn";
        delBtn.innerHTML = "\u2715";
        delBtn.title = "Delete this row";
        delBtn.addEventListener("click", () => {
            if (state.rows.length <= 1) return;
            if (state.soloedRow === ri) state.soloedRow = -1;
            else if (state.soloedRow > ri) state.soloedRow--;
            state.rows.splice(ri, 1);
            rebuildAll();
        });
        acts.appendChild(delBtn);

        div.appendChild(acts);
        seqContainer.appendChild(div);
    });
}

function updateSoloBtnUI() {
    document
        .querySelectorAll(".solo-btn")
        .forEach((b, i) => b.classList.toggle("soloed", i === state.soloedRow));
}

function updateRowSilencedState() {
    state.rows.forEach((row, ri) => {
        const el = document.querySelector(`.seq-row[data-row="${ri}"]`);
        if (!el) return;
        const silenced =
            row.muted ||
            (state.soloedRow >= 0 && state.soloedRow !== ri) ||
            (state.soloedRow === ri && row.muted);
        el.classList.toggle("silenced", silenced);
    });
}

export function updateStepUI() {
    state.rows.forEach((row, ri) => {
        const inst = INSTRUMENTS[row.instrument];
        const isMel = inst ? inst.type === "melodic" : false;
        const span = getSampleSpan(ri);
        document.querySelectorAll(`.step[data-row="${ri}"]`).forEach((el, i) => {
            el.classList.toggle("active", row.pattern[i]);
            el.classList.toggle("playing", state.isPlaying && i === state.currentStep);
            el.classList.remove("span-start", "span-mid", "span-end");
            if (span > 1 && row.pattern[i]) {
                const nextOn = i + 1 < state.STEPS && row.pattern[i + 1];
                const prevOn = i - 1 >= 0 && row.pattern[i - 1];
                if (!prevOn && nextOn) el.classList.add("span-start");
                else if (prevOn && nextOn) el.classList.add("span-mid");
                else if (prevOn && !nextOn) el.classList.add("span-end");
            }
            const bar = el.querySelector(".pitch-bar");
            if (bar) {
                if (isMel && row.pattern[i]) {
                    const pct = (row.notes[i] - row.minNote) / (row.maxNote - row.minNote);
                    bar.style.height = pct * 80 + 10 + "%";
                    bar.style.display = "block";
                } else {
                    bar.style.display = "none";
                }
            }
        });
    });
}

export function updateDropdowns() {
    document.querySelectorAll(".row-inst-select").forEach((sel, ri) => {
        const current = state.rows[ri].instrument;
        const existing = sel.querySelector('optgroup[label="\u2500 SAMPLES \u2500"]');
        if (existing) existing.remove();
        if (state.samples.length > 0) {
            const optS = document.createElement("optgroup");
            optS.label = "\u2500 SAMPLES \u2500";
            state.samples.forEach((smp) => {
                const o = document.createElement("option");
                o.value = smp.id;
                o.textContent = "\ud83c\udfa4 " + smp.name;
                if (smp.id === current) o.selected = true;
                optS.appendChild(o);
            });
            sel.appendChild(optS);
        }
    });
}

// Time sig & steps changes
export function onTimeSigChange() {
    state.timeSig = document.getElementById("time-sig-select").value;
    const ts = TIME_SIGS[state.timeSig];
    const stepsEl = document.getElementById("steps-select");
    stepsEl.innerHTML = "";
    ts.steps.forEach((s) => {
        const o = document.createElement("option");
        o.value = s;
        o.textContent = s;
        if (s === ts.steps[0]) o.selected = true;
        stepsEl.appendChild(o);
    });
    state.STEPS = ts.steps[0];
    resizePatterns();
    rebuildAll();
}

export function onStepsChange() {
    state.STEPS = parseInt(document.getElementById("steps-select").value);
    resizePatterns();
    rebuildAll();
}

// Add / remove rows
export function addRow() {
    if (state.rows.length >= 16) return;
    state.rows.push(makeRow({ inst: "kick" }));
    rebuildAll();
}

export function removeRow() {
    if (state.rows.length <= 1) return;
    if (state.soloedRow >= state.rows.length - 1) state.soloedRow = -1;
    state.rows.pop();
    rebuildAll();
}

// Randomize
export function randomize() {
    const sc = document.getElementById("scale-select").value;
    state.rows.forEach((row) => {
        const inst = INSTRUMENTS[row.instrument];
        if (!inst) {
            const span = getSampleSpan(state.rows.indexOf(row));
            row.pattern.fill(false);
            for (let i = 0; i < state.STEPS; i += span * 2) {
                if (Math.random() < 0.5) {
                    for (let j = i; j < Math.min(i + span, state.STEPS); j++)
                        row.pattern[j] = true;
                }
            }
        } else if (inst.type === "melodic") {
            row.notes = scaleNotes(row.minNote, 0, sc, state.STEPS);
            const isPad =
                row.instrument.includes("Pad") ||
                row.instrument.includes("string") ||
                row.instrument === "vocalOoh";
            row.pattern = row.pattern.map((_, i) =>
                isPad
                    ? i % (getBeatGroup() * 2) === 0 ? true : Math.random() < 0.12
                    : Math.random() < 0.35,
            );
        } else {
            const k = row.instrument;
            const bg = getBeatGroup();
            if (k === "kick" || k === "deepKick" || k === "tom")
                row.pattern = row.pattern.map((_, i) =>
                    i % bg === 0 ? true : Math.random() < 0.12,
                );
            else if (k === "snare" || k === "clap" || k === "rim")
                row.pattern = row.pattern.map((_, i) =>
                    i % (bg * 2) === bg ? true : Math.random() < 0.06,
                );
            else if (k === "hat" || k === "openHat")
                row.pattern = row.pattern.map((_, i) =>
                    i % 2 === 0 ? Math.random() < 0.7 : Math.random() < 0.35,
                );
            else
                row.pattern = row.pattern.map(() => Math.random() < 0.18);
        }
    });
    updateStepUI();
}

export function clearAll() {
    state.rows.forEach((r) => r.pattern.fill(false));
    updateStepUI();
}

// BPM
export function changeBpm(d) {
    state.bpm = Math.max(40, Math.min(300, state.bpm + d));
    document.getElementById("bpm-display").textContent = state.bpm;
    document.getElementById("bpm-input").value = state.bpm;
    updateStepDurHint();
}

export function startBpmEdit() {
    document.getElementById("bpm-display").style.display = "none";
    const inp = document.getElementById("bpm-input");
    inp.style.display = "block";
    inp.value = state.bpm;
    inp.focus();
    inp.select();
}

export function commitBpmEdit() {
    const v = parseInt(document.getElementById("bpm-input").value);
    if (v >= 40 && v <= 300) state.bpm = v;
    document.getElementById("bpm-display").textContent = state.bpm;
    document.getElementById("bpm-input").style.display = "none";
    document.getElementById("bpm-display").style.display = "block";
    updateStepDurHint();
}

export function updateStepDurHint() {
    const el = document.getElementById("step-dur-hint");
    if (el) el.textContent = Math.round(stepDuration() * 1000);
}

// Knobs
export function initKnobs() {
    document.querySelectorAll(".knob-wrap[data-param]").forEach((knob) => {
        const param = knob.dataset.param;
        if (!param) return;
        const min = parseFloat(knob.dataset.min);
        const max = parseFloat(knob.dataset.max);
        const val = parseFloat(knob.dataset.val);
        knobState[param] = { min, max, val };
        applyKnob(param, val, min, max);

        let sY, sV;
        function onS(cy) { sY = cy; sV = knobState[param].val; }
        function onM(cy) {
            const dy = sY - cy;
            const v = Math.max(min, Math.min(max, sV + (dy * (max - min)) / 200));
            knobState[param].val = v;
            applyKnob(param, v, min, max);
        }

        knob.addEventListener("mousedown", (e) => {
            onS(e.clientY);
            const mv = (ev) => onM(ev.clientY);
            const up = () => {
                window.removeEventListener("mousemove", mv);
                window.removeEventListener("mouseup", up);
            };
            window.addEventListener("mousemove", mv);
            window.addEventListener("mouseup", up);
            e.preventDefault();
        });

        knob.addEventListener("touchstart", (e) => {
            onS(e.touches[0].clientY);
            const mv = (ev) => { ev.preventDefault(); onM(ev.touches[0].clientY); };
            const up = () => {
                window.removeEventListener("touchmove", mv);
                window.removeEventListener("touchend", up);
            };
            window.addEventListener("touchmove", mv, { passive: false });
            window.addEventListener("touchend", up);
            e.preventDefault();
        }, { passive: false });

        knob.addEventListener("wheel", (e) => {
            e.preventDefault();
            const step = (max - min) / 100;
            const dir = e.deltaY < 0 ? 1 : -1;
            const v = Math.max(min, Math.min(max, knobState[param].val + dir * step));
            knobState[param].val = v;
            applyKnob(param, v, min, max);
        }, { passive: false });
    });
}

export function applyKnob(param, val, min, max) {
    state.params[param] = val;
    const pct = (val - min) / (max - min);
    const deg = -120 + pct * 240;
    const ind = document.getElementById(`knob-${param}-ind`);
    if (ind) ind.style.transform = `translate(-50%,-100%) rotate(${deg}deg)`;
    const valEl = document.getElementById(`knob-${param}-val`);
    if (valEl) valEl.textContent = val < 10 ? val.toFixed(2) : Math.round(val);
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (param === "filter") {
        const filterNode = getFilterNode();
        filterNode.frequency.setTargetAtTime(val, now, 0.02);
    } else if (param === "resonance") {
        const filterNode = getFilterNode();
        filterNode.Q.setTargetAtTime(val, now, 0.02);
    } else if (param === "reverb") {
        getReverbGain().gain.setTargetAtTime(val, now, 0.02);
        getDryGain().gain.setTargetAtTime(1 - val * 0.5, now, 0.02);
    } else if (param === "delay") {
        getDelayGain().gain.setTargetAtTime(val, now, 0.02);
    } else if (param === "delayFb") {
        getDelayFeedback().gain.setTargetAtTime(val, now, 0.02);
    }
}

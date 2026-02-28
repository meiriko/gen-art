import { state } from "./state.js";

// Callbacks set by main.js to avoid circular imports
let rebuildAllFn = null;
let showStatusFn = null;
let knobStateFn = null;
let applyKnobFn = null;

export function setPatternCallbacks({ rebuildAll, showStatus, getKnobState, applyKnob }) {
    rebuildAllFn = rebuildAll;
    showStatusFn = showStatus;
    knobStateFn = getKnobState;
    applyKnobFn = applyKnob;
}

function showStatus(msg) {
    if (showStatusFn) showStatusFn(msg);
}

export function getState() {
    return {
        rows: state.rows.map((r) => ({
            ...r,
            pattern: [...r.pattern],
            notes: [...r.notes],
        })),
        bpm: state.bpm,
        params: { ...state.params },
        scale: document.getElementById("scale-select").value,
        timeSig: state.timeSig,
        STEPS: state.STEPS,
    };
}

export function loadState(st) {
    if (!st) return;
    if (st.timeSig) {
        state.timeSig = st.timeSig;
        document.getElementById("time-sig-select").value = state.timeSig;
    }
    if (st.STEPS) {
        state.STEPS = st.STEPS;
        document.getElementById("steps-select").value = state.STEPS;
    }
    if (st.rows) {
        state.rows = st.rows.map((sr) => ({
            ...sr,
            pattern: [...sr.pattern],
            notes: [...sr.notes],
        }));
    }
    if (st.bpm) {
        state.bpm = st.bpm;
        document.getElementById("bpm-display").textContent = state.bpm;
    }
    if (st.scale)
        document.getElementById("scale-select").value = st.scale;
    if (st.params) {
        Object.assign(state.params, st.params);
        const knobState = knobStateFn ? knobStateFn() : {};
        Object.keys(knobState).forEach((p) => {
            if (state.params[p] !== undefined) {
                knobState[p].val = state.params[p];
                if (applyKnobFn) applyKnobFn(p, state.params[p], knobState[p].min, knobState[p].max);
            }
        });
    }
    state.soloedRow = -1;
    if (rebuildAllFn) rebuildAllFn();
}

export function savePattern() {
    state.patternSlots[state.activeSlot] = getState();
    updatePatternSlotUI();
}

export function selectPattern(idx) {
    state.activeSlot = idx;
    if (state.patternSlots[idx]) loadState(state.patternSlots[idx]);
    updatePatternSlotUI();
}

export function updatePatternSlotUI() {
    document.querySelectorAll(".pat-slot").forEach((el, i) => {
        el.classList.toggle("active", i === state.activeSlot);
        el.classList.toggle("filled", state.patternSlots[i] !== null);
    });
}

export function copyPatternJSON() {
    const json = JSON.stringify(getState());
    if (
        navigator.clipboard &&
        navigator.clipboard.writeText &&
        window.isSecureContext
    ) {
        navigator.clipboard
            .writeText(json)
            .then(() => showStatus("COPIED"))
            .catch(() => copyFallback(json));
    } else {
        copyFallback(json);
    }
}

function copyFallback(json) {
    const ta = document.createElement("textarea");
    ta.value = json;
    ta.style.cssText =
        "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:70%;height:120px;z-index:999;background:#0d1218;color:#00e5ff;border:1px solid #00e5ff;border-radius:6px;padding:10px;font-family:monospace;font-size:10px;";
    document.body.appendChild(ta);
    ta.select();
    ta.focus();
    try {
        document.execCommand("copy");
        showStatus("COPIED");
    } catch (_) {
        showStatus("SELECT+COPY");
    }
    setTimeout(() => {
        ta.addEventListener("blur", () => ta.remove());
    }, 100);
}

export function pastePatternJSON() {
    if (
        navigator.clipboard &&
        navigator.clipboard.readText &&
        window.isSecureContext
    ) {
        navigator.clipboard
            .readText()
            .then((t) => {
                try {
                    loadState(JSON.parse(t));
                    showStatus("LOADED");
                } catch (_) {
                    showStatus("INVALID");
                }
            })
            .catch(() => pasteFallback());
    } else {
        pasteFallback();
    }
}

function pasteFallback() {
    const val = prompt("Paste pattern JSON:");
    if (val) {
        try {
            loadState(JSON.parse(val));
            showStatus("LOADED");
        } catch (_) {
            showStatus("INVALID");
        }
    }
}

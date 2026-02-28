import { state, initRows } from "./state.js";
import {
    rebuildAll, updateStepUI, updateDropdowns, updateStepDurHint,
    onTimeSigChange, onStepsChange, addRow, removeRow,
    randomize, clearAll, changeBpm, startBpmEdit, commitBpmEdit,
    initKnobs, showStatus, getKnobState, applyKnob,
    setOnStateChange, setSuppressStateNotify,
} from "./ui.js";
import { togglePlay, setOnPlayStart, setOnPlayStop, setShowStatus as setSeqShowStatus } from "./sequencer.js";
import { initVisualizer, setVizMode, startViz, stopViz } from "./visualizer.js";
import { initFullscreenViz } from "./fullscreen-viz.js";
import {
    savePattern, selectPattern, copyPatternJSON, pastePatternJSON,
    updatePatternSlotUI, setPatternCallbacks, getState, loadState,
} from "./patterns.js";
import { initUrlSync, pushStateToUrl } from "./url-sync.js";
import { exportWav, setShowStatus as setExportShowStatus } from "./export.js";
import {
    toggleSamplerPanel, quickRec, toggleRecording, renderSampleList,
    setOnSampleAdded, setShowStatus as setSamplerShowStatus,
} from "./sampler.js";

// Wire up callbacks to avoid circular imports
setSeqShowStatus(showStatus);
setExportShowStatus(showStatus);
setSamplerShowStatus(showStatus);
setOnSampleAdded(() => {
    renderSampleList();
    updateDropdowns();
});
setPatternCallbacks({
    rebuildAll,
    showStatus,
    getKnobState,
    applyKnob,
});
setOnPlayStart(() => { startHighlightLoop(); startViz(); });
setOnPlayStop(() => { stopHighlightLoop(); stopViz(); });
setOnStateChange(pushStateToUrl);

// Expose functions to HTML onclick handlers
window.togglePlay = togglePlay;
window.randomize = randomize;
window.clearAll = clearAll;
window.exportWav = exportWav;
window.changeBpm = changeBpm;
window.startBpmEdit = startBpmEdit;
window.commitBpmEdit = commitBpmEdit;
window.addRow = addRow;
window.removeRow = removeRow;
window.quickRec = quickRec;
window.onTimeSigChange = onTimeSigChange;
window.onStepsChange = onStepsChange;
window.setVizMode = setVizMode;
window.savePattern = savePattern;
window.selectPattern = selectPattern;
window.copyPatternJSON = copyPatternJSON;
window.pastePatternJSON = pastePatternJSON;
window.toggleSamplerPanel = toggleSamplerPanel;
window.toggleRecording = toggleRecording;

// Init
initRows();
initKnobs();
rebuildAll();
randomize();
updatePatternSlotUI();
updateStepDurHint();
initVisualizer();
initFullscreenViz();

// URL sync — load from hash if present (overrides randomize)
initUrlSync(getState, (st) => {
    setSuppressStateNotify(true);
    try { loadState(st); } finally { setSuppressStateNotify(false); }
}).then((loaded) => {
    if (loaded) updateStepDurHint();
});

// Step highlight animation loop — only runs while playing
let highlightRafId = null;
function stepHighlightLoop() {
    setSuppressStateNotify(true);
    try { updateStepUI(); } finally { setSuppressStateNotify(false); }
    highlightRafId = requestAnimationFrame(stepHighlightLoop);
}

export function startHighlightLoop() {
    if (highlightRafId !== null) return;
    highlightRafId = requestAnimationFrame(stepHighlightLoop);
}

export function stopHighlightLoop() {
    if (highlightRafId !== null) {
        cancelAnimationFrame(highlightRafId);
        highlightRafId = null;
    }
    updateStepUI(); // final update to clear playing state
}

import { state, initRows } from "./state.js";
import {
    rebuildAll, updateStepUI, updateDropdowns, updateStepDurHint,
    onTimeSigChange, onStepsChange, addRow, removeRow,
    randomize, clearAll, changeBpm, startBpmEdit, commitBpmEdit,
    initKnobs, showStatus, getKnobState, applyKnob,
} from "./ui.js";
import { togglePlay } from "./sequencer.js";
import { setOnStepChange, setShowStatus as setSeqShowStatus } from "./sequencer.js";
import { initVisualizer, setVizMode } from "./visualizer.js";
import {
    savePattern, selectPattern, copyPatternJSON, pastePatternJSON,
    updatePatternSlotUI, setPatternCallbacks,
} from "./patterns.js";
import { exportWav, setShowStatus as setExportShowStatus } from "./export.js";
import {
    toggleSamplerPanel, quickRec, toggleRecording, renderSampleList,
    setOnSampleAdded, setShowStatus as setSamplerShowStatus,
} from "./sampler.js";

// Wire up callbacks to avoid circular imports
setOnStepChange(updateStepUI);
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

// Step highlight animation loop
function stepHighlightLoop() {
    requestAnimationFrame(stepHighlightLoop);
    if (state.isPlaying) updateStepUI();
}
stepHighlightLoop();

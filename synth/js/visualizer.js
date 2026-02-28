import { state } from "./state.js";
import { getAnalyser, getAnalyserWave, getAnalyserData, getWaveData } from "./audio.js";

let viz, vCtx;
let vizRafId = null;

export function initVisualizer() {
    viz = document.getElementById("viz");
    vCtx = viz.getContext("2d");
    resizeViz();
    window.addEventListener("resize", resizeViz);
    startViz();
}

export function startViz() {
    if (vizRafId !== null) return;
    vizRafId = requestAnimationFrame(drawViz);
}

export function stopViz() {
    if (vizRafId !== null) {
        cancelAnimationFrame(vizRafId);
        vizRafId = null;
    }
}

function resizeViz() {
    viz.width = viz.offsetWidth * devicePixelRatio;
    viz.height = viz.offsetHeight * devicePixelRatio;
}

export function setVizMode(m) {
    state.vizMode = m;
    document
        .querySelectorAll(".viz-mode-btn")
        .forEach((b) => b.classList.toggle("active", b.dataset.mode === m));
}

function drawViz() {
    vizRafId = requestAnimationFrame(drawViz);
    const W = viz.width, H = viz.height;
    vCtx.fillStyle = "#060a0e";
    vCtx.fillRect(0, 0, W, H);

    const analyser = getAnalyser();
    if (!analyser) {
        vCtx.strokeStyle = "rgba(0,229,255,0.15)";
        vCtx.lineWidth = 1;
        vCtx.beginPath();
        for (let x = 0; x < W; x++) {
            const y =
                H / 2 +
                Math.sin((x / W) * Math.PI * 4 + Date.now() * 0.001) * 3;
            x === 0 ? vCtx.moveTo(x, y) : vCtx.lineTo(x, y);
        }
        vCtx.stroke();
        return;
    }

    const analyserData = getAnalyserData();
    const analyserWave = getAnalyserWave();
    const waveData = getWaveData();

    if (state.vizMode === "spectrum" || state.vizMode === "split") {
        analyser.getByteFrequencyData(analyserData);
        const rH = state.vizMode === "split" ? H / 2 : H;
        const bW = (W / analyserData.length) * 2;
        for (let i = 0; i < analyserData.length; i++) {
            const v2 = analyserData[i] / 255;
            const bH = v2 * rH;
            vCtx.fillStyle = `hsla(${180 + v2 * 60},100%,${40 + v2 * 40}%,${0.6 + v2 * 0.4})`;
            vCtx.fillRect(i * bW, rH - bH, bW - 1, bH);
        }
    }
    if (state.vizMode === "wave" || state.vizMode === "split") {
        analyserWave.getByteTimeDomainData(waveData);
        const oY = state.vizMode === "split" ? H / 2 : 0;
        const rH = state.vizMode === "split" ? H / 2 : H;
        vCtx.strokeStyle = "rgba(0,255,136,0.6)";
        vCtx.lineWidth = 1.5 * devicePixelRatio;
        vCtx.beginPath();
        const sW = W / waveData.length;
        for (let i = 0; i < waveData.length; i++) {
            const y = oY + ((waveData[i] / 128) * rH) / 2;
            i === 0 ? vCtx.moveTo(i * sW, y) : vCtx.lineTo(i * sW, y);
        }
        vCtx.stroke();
    }
    if (state.isPlaying) {
        const sx = (state.currentStep / state.STEPS) * W;
        vCtx.fillStyle = "rgba(0,229,255,0.1)";
        vCtx.fillRect(sx, 0, W / state.STEPS, H);
    }
}

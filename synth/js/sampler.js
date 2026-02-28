import { state, nextSampleId } from "./state.js";
import { initAudio, getCtx, stepDuration } from "./audio.js";

let isRecording = false;
let mediaRecorder = null;
let recStream = null;
let recChunks = [];
let recStartTime = 0;
let recTimerInterval = null;
let recAnalyser = null;
let recAnimFrame = null;
let micCtx = null;

// Callback set by ui.js to avoid circular import
let onSampleAdded = null;
export function setOnSampleAdded(fn) { onSampleAdded = fn; }

let showStatusFn = null;
export function setShowStatus(fn) { showStatusFn = fn; }

function showStatus(msg) {
    if (showStatusFn) showStatusFn(msg);
}

export function toggleSamplerPanel() {
    const body = document.getElementById("sampler-body");
    const arrow = document.getElementById("sampler-arrow");
    const open = body.classList.toggle("open");
    arrow.classList.toggle("open", open);
}

export function quickRec() {
    const body = document.getElementById("sampler-body");
    if (!body.classList.contains("open")) toggleSamplerPanel();
    toggleRecording();
}

export async function toggleRecording() {
    if (isRecording) {
        stopRecording();
        return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showStatus("NO MIC API");
        return;
    }
    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
        showStatus("MIC DENIED");
        return;
    }
    recStream = stream;
    isRecording = true;
    recChunks = [];

    let mimeType = "audio/webm";
    if (!MediaRecorder.isTypeSupported("audio/webm")) {
        if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
        else if (MediaRecorder.isTypeSupported("audio/ogg")) mimeType = "audio/ogg";
        else mimeType = "";
    }
    const opts = mimeType ? { mimeType } : {};
    mediaRecorder = new MediaRecorder(recStream, opts);
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recChunks.push(e.data);
    };
    mediaRecorder.onstop = () => processRecording();
    mediaRecorder.start();

    recStartTime = Date.now();
    document.getElementById("rec-btn").classList.add("recording");
    document.getElementById("rec-btn").innerHTML =
        '<span class="rec-dot"></span> STOP';
    showStatus("RECORDING...");

    recTimerInterval = setInterval(() => {
        const elapsed = (Date.now() - recStartTime) / 1000;
        document.getElementById("rec-timer").textContent =
            elapsed.toFixed(1) + "s";
        if (elapsed >= 3) stopRecording();
    }, 100);

    try {
        micCtx = new AudioContext();
        const micSrc = micCtx.createMediaStreamSource(recStream);
        recAnalyser = micCtx.createAnalyser();
        recAnalyser.fftSize = 256;
        micSrc.connect(recAnalyser);
        drawRecWaveform();
    } catch (_) {
        // analyser optional
    }
}

function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    clearInterval(recTimerInterval);
    if (mediaRecorder && mediaRecorder.state !== "inactive")
        mediaRecorder.stop();
    if (recStream) recStream.getTracks().forEach((t) => t.stop());
    document.getElementById("rec-btn").classList.remove("recording");
    document.getElementById("rec-btn").innerHTML =
        '<span class="rec-dot"></span> RECORD';
    cancelAnimationFrame(recAnimFrame);
    if (micCtx) {
        micCtx.close().catch(() => {});
        micCtx = null;
    }
    recAnalyser = null;
    const cv = document.getElementById("rec-waveform");
    const c = cv.getContext("2d");
    c.clearRect(0, 0, cv.width, cv.height);
}

async function processRecording() {
    if (recChunks.length === 0) { showStatus("NO AUDIO"); return; }
    const blob = new Blob(recChunks, {
        type: recChunks[0]?.type || "audio/webm",
    });
    if (blob.size === 0) { showStatus("EMPTY REC"); return; }

    let arrayBuf;
    try { arrayBuf = await blob.arrayBuffer(); }
    catch (_) { showStatus("READ ERR"); return; }

    const decodeCtx = new (window.AudioContext || window.webkitAudioContext)();
    let audioBuf;
    try { audioBuf = await decodeCtx.decodeAudioData(arrayBuf); }
    catch (_) { showStatus("DECODE ERR"); decodeCtx.close(); return; }
    decodeCtx.close();

    let pcm = audioBuf.getChannelData(0);
    let pcmTrimmed = trimLeadingSilence(pcm, 0.02);
    let endIdx = pcmTrimmed.length - 1;
    while (endIdx > 100 && Math.abs(pcmTrimmed[endIdx]) < 0.003) endIdx--;
    const tailSamples = Math.min(2000, Math.floor(audioBuf.sampleRate * 0.04));
    pcmTrimmed = pcmTrimmed.slice(
        0, Math.min(pcmTrimmed.length, endIdx + tailSamples),
    );

    const pcmCopy = new Float32Array(pcmTrimmed);
    const id = nextSampleId();
    const dur = pcmCopy.length / audioBuf.sampleRate;
    const name = "Sample " + (state.samples.length + 1);
    const stepsSpan = Math.max(1, Math.ceil(dur / stepDuration()));

    state.samples.push({
        id, name, pcm: pcmCopy,
        sampleRate: audioBuf.sampleRate,
        duration: dur,
        mode: "full",
        stepsSpan,
    });

    if (onSampleAdded) onSampleAdded();
    showStatus(
        "RECORDED \u00b7 " + dur.toFixed(2) + "s (" +
        stepsSpan + " step" + (stepsSpan > 1 ? "s" : "") + ")",
    );
}

function drawRecWaveform() {
    if (!isRecording) return;
    recAnimFrame = requestAnimationFrame(drawRecWaveform);
    const cv = document.getElementById("rec-waveform");
    const c = cv.getContext("2d");
    if (cv.width !== cv.offsetWidth * devicePixelRatio) {
        cv.width = cv.offsetWidth * devicePixelRatio;
        cv.height = cv.offsetHeight * devicePixelRatio;
    }
    const W = cv.width, H = cv.height;
    c.fillStyle = "#060a0e";
    c.fillRect(0, 0, W, H);

    if (!recAnalyser) return;
    const data = new Uint8Array(recAnalyser.frequencyBinCount);
    recAnalyser.getByteFrequencyData(data);
    const barW = (W / data.length) * 2;
    for (let i = 0; i < data.length; i++) {
        const v = data[i] / 255;
        c.fillStyle = `hsla(340, 100%, ${45 + v * 35}%, ${0.6 + v * 0.4})`;
        c.fillRect(i * barW, H - v * H, barW - 1, v * H);
    }
}

function trimLeadingSilence(pcm, threshold) {
    threshold = threshold || 0.01;
    let start = 0;
    for (let i = 0; i < pcm.length; i++) {
        if (Math.abs(pcm[i]) > threshold) {
            start = Math.max(0, i - 44);
            break;
        }
    }
    if (start === 0 && Math.abs(pcm[0]) <= threshold) return pcm;
    return pcm.slice(start);
}

// Sample playback (used by sequencer and export)
export function getSampleBuffer(ac, smp) {
    const buf = ac.createBuffer(1, smp.pcm.length, smp.sampleRate);
    buf.getChannelData(0).set(smp.pcm);
    return buf;
}

export function playSample(ac, dest, smp, t, dur) {
    const buf = getSampleBuffer(ac, smp);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.7, t);

    const stepDur = dur || stepDuration();

    if (smp.mode === "step" && smp.duration > stepDur) {
        const fadeStart = t + stepDur * 0.8;
        const fadeEnd = t + stepDur;
        g.gain.setValueAtTime(0.7, fadeStart);
        g.gain.linearRampToValueAtTime(0, fadeEnd);
        src.connect(g);
        g.connect(dest);
        src.start(t);
        src.stop(fadeEnd + 0.01);
    } else {
        src.connect(g);
        g.connect(dest);
        src.start(t);
    }
}

export function previewSample(smp) {
    initAudio();
    const ac = getCtx();
    if (ac.state === "suspended") ac.resume();
    const buf = ac.createBuffer(1, smp.pcm.length, smp.sampleRate);
    buf.getChannelData(0).set(smp.pcm);
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(ac.destination);
    src.start();
}

export function renderSampleList() {
    const list = document.getElementById("sample-list");
    list.innerHTML = "";
    if (state.samples.length === 0) {
        list.innerHTML =
            '<div class="no-samples">No samples yet \u2014 hit record to capture a sound</div>';
        return;
    }
    state.samples.forEach((smp, idx) => {
        const item = document.createElement("div");
        item.className = "sample-item";

        const miniCv = document.createElement("canvas");
        miniCv.className = "sample-wave-mini";
        miniCv.width = 240;
        miniCv.height = 40;
        drawMiniWaveform(miniCv, smp.pcm, smp.duration);
        item.appendChild(miniCv);

        const nameIn = document.createElement("input");
        nameIn.className = "sample-name";
        nameIn.value = smp.name;
        nameIn.addEventListener("change", () => {
            smp.name = nameIn.value || "Sample " + (idx + 1);
            if (onSampleAdded) onSampleAdded();
        });
        item.appendChild(nameIn);

        const dur = document.createElement("span");
        dur.className = "sample-dur";
        const overStep = smp.duration > stepDuration();
        dur.textContent = smp.duration.toFixed(2) + "s";
        if (overStep) dur.style.color = "#ff6d00";
        item.appendChild(dur);

        const modeBtn = document.createElement("button");
        modeBtn.className = "sample-btn";
        modeBtn.title =
            smp.mode === "step"
                ? "Step-fit: trimmed to step size. Click for one-shot."
                : "One-shot: plays full sample. Click for step-fit.";
        modeBtn.innerHTML = smp.mode === "step" ? "\u229f" : "\u229e";
        modeBtn.style.color = smp.mode === "step" ? "#00e5ff" : "#6a8a9a";
        modeBtn.addEventListener("click", () => {
            smp.mode = smp.mode === "step" ? "full" : "step";
            renderSampleList();
        });
        item.appendChild(modeBtn);

        const playBtn = document.createElement("button");
        playBtn.className = "sample-btn";
        playBtn.innerHTML = "\u25b6";
        playBtn.title = "Preview";
        playBtn.addEventListener("click", () => previewSample(smp));
        item.appendChild(playBtn);

        const delBtn = document.createElement("button");
        delBtn.className = "sample-btn del";
        delBtn.innerHTML = "\u2715";
        delBtn.title = "Delete sample";
        delBtn.addEventListener("click", () => {
            state.rows.forEach((r) => {
                if (r.instrument === smp.id) r.instrument = "kick";
            });
            state.samples.splice(idx, 1);
            renderSampleList();
            if (onSampleAdded) onSampleAdded();
        });
        item.appendChild(delBtn);

        list.appendChild(item);
    });
}

function drawMiniWaveform(canvas, pcm, sampleDuration) {
    const c = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    c.fillStyle = "#060a0e";
    c.fillRect(0, 0, W, H);

    const sDur = stepDuration();
    if (sampleDuration > 0) {
        const stepPx = Math.min(W, (sDur / sampleDuration) * W);
        c.fillStyle = "rgba(0,229,255,0.1)";
        c.fillRect(0, 0, stepPx, H);
        if (stepPx < W - 1) {
            c.strokeStyle = "rgba(0,229,255,0.5)";
            c.lineWidth = 1;
            c.setLineDash([2, 2]);
            c.beginPath();
            c.moveTo(stepPx, 0);
            c.lineTo(stepPx, H);
            c.stroke();
            c.setLineDash([]);
        }
        c.fillStyle = "rgba(0,229,255,0.6)";
        c.font = "7px Share Tech Mono, monospace";
        c.fillText("1 step", 2, 8);
    }

    c.strokeStyle = "rgba(0,229,255,0.7)";
    c.lineWidth = 1;
    c.beginPath();
    const step = Math.max(1, Math.floor(pcm.length / W));
    for (let x = 0; x < W; x++) {
        const idx = Math.floor((x * pcm.length) / W);
        let max = 0;
        for (let j = idx; j < Math.min(idx + step, pcm.length); j++)
            max = Math.max(max, Math.abs(pcm[j]));
        const y1 = H / 2 - (max * H) / 2;
        const y2 = H / 2 + (max * H) / 2;
        c.moveTo(x, y1);
        c.lineTo(x, y2);
    }
    c.stroke();

    if (sampleDuration > sDur) {
        const stepPx = (sDur / sampleDuration) * W;
        c.fillStyle = "rgba(255,109,0,0.12)";
        c.fillRect(stepPx, 0, W - stepPx, H);
    }
}

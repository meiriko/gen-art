import { state, getBeatGroup } from "./state.js";
import { getAnalyser, getAnalyserData, getWaveData } from "./audio.js";

let canvas, ctx;
let rafId = null;
let vizMode = 0;
const MODE_NAMES = ["PARTICLES", "GEOMETRY", "FLUID"];
const MODE_COUNT = MODE_NAMES.length;

// Particle state
let particles = [];
const MAX_PARTICLES = 200;

// Row color palette (matches sequencer row hues)
const ROW_HUES = [180, 280, 120, 340, 30, 200, 60, 310, 150, 50, 240, 100, 0, 210, 90, 270];

export function initFullscreenViz() {
    const overlay = document.getElementById("viz-overlay");
    canvas = document.getElementById("viz-fullscreen");
    ctx = canvas.getContext("2d");

    document.getElementById("viz-open-btn").addEventListener("click", open);
    document.getElementById("viz-close-btn").addEventListener("click", close);
    document.getElementById("viz-mode-cycle").addEventListener("click", cycleMode);

    window.addEventListener("resize", () => { if (overlay.classList.contains("active")) sizeCanvas(); });
}

function sizeCanvas() {
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
}

function open() {
    const overlay = document.getElementById("viz-overlay");
    overlay.classList.add("active");
    sizeCanvas();
    particles = [];
    if (rafId === null) rafId = requestAnimationFrame(loop);
}

function close() {
    const overlay = document.getElementById("viz-overlay");
    overlay.classList.remove("active");
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
}

function cycleMode() {
    vizMode = (vizMode + 1) % MODE_COUNT;
    document.getElementById("viz-mode-cycle").textContent = MODE_NAMES[vizMode];
    particles = [];
}

function loop() {
    rafId = requestAnimationFrame(loop);
    const W = window.innerWidth;
    const H = window.innerHeight;
    ctx.setTransform(Math.min(devicePixelRatio, 2), 0, 0, Math.min(devicePixelRatio, 2), 0, 0);

    const analyser = getAnalyser();
    const freqData = analyser ? getAnalyserData() : null;
    const waveData = analyser ? getWaveData() : null;
    if (analyser && freqData) analyser.getByteFrequencyData(freqData);
    if (analyser && waveData) analyser.getByteTimeDomainData(waveData);

    const avgLevel = freqData
        ? freqData.reduce((s, v) => s + v, 0) / freqData.length / 255
        : 0.05 + Math.sin(Date.now() * 0.001) * 0.03;

    const bassLevel = freqData
        ? freqData.slice(0, 8).reduce((s, v) => s + v, 0) / 8 / 255
        : avgLevel;

    if (vizMode === 0) drawParticles(W, H, freqData, avgLevel, bassLevel);
    else if (vizMode === 1) drawGeometry(W, H, freqData, waveData, avgLevel, bassLevel);
    else drawFluid(W, H, freqData, avgLevel, bassLevel);
}

// ─── MODE 0: PARTICLES ───

function drawParticles(W, H, freqData, avgLevel, bassLevel) {
    ctx.fillStyle = `rgba(6,10,14,${0.15 + (1 - avgLevel) * 0.15})`;
    ctx.fillRect(0, 0, W, H);

    // Spawn particles on active steps
    if (state.isPlaying) {
        state.rows.forEach((row, ri) => {
            if (row.pattern[state.currentStep] && !row.muted) {
                const hue = ROW_HUES[ri % ROW_HUES.length];
                for (let j = 0; j < 2; j++) {
                    if (particles.length >= MAX_PARTICLES) break;
                    particles.push({
                        x: (state.currentStep / state.STEPS) * W + (Math.random() - 0.5) * 40,
                        y: H * 0.3 + (ri / state.rows.length) * H * 0.5 + (Math.random() - 0.5) * 30,
                        vx: (Math.random() - 0.5) * 3,
                        vy: -1 - Math.random() * 3 * bassLevel,
                        life: 1,
                        decay: 0.005 + Math.random() * 0.01,
                        size: 2 + avgLevel * 8 + Math.random() * 4,
                        hue,
                    });
                }
            }
        });
    } else if (particles.length < 20 && Math.random() < 0.1) {
        // Idle: sparse ambient particles
        particles.push({
            x: Math.random() * W,
            y: H * 0.5 + (Math.random() - 0.5) * H * 0.3,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.3 - Math.random() * 0.5,
            life: 1,
            decay: 0.008,
            size: 2 + Math.random() * 3,
            hue: ROW_HUES[Math.floor(Math.random() * ROW_HUES.length)],
        });
    }

    // Update and draw
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.02; // gentle lift
        p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }

        const alpha = p.life * 0.8;
        const size = p.size * (0.5 + p.life * 0.5);
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},100%,60%,${alpha})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},100%,50%,${alpha * 0.15})`;
        ctx.fill();
    }

    // Step position indicator
    if (state.isPlaying) {
        const sx = (state.currentStep / state.STEPS) * W;
        ctx.fillStyle = `rgba(0,229,255,${0.03 + bassLevel * 0.05})`;
        ctx.fillRect(sx, 0, W / state.STEPS, H);
    }
}

// ─── MODE 1: GEOMETRY ───

function drawGeometry(W, H, freqData, waveData, avgLevel, bassLevel) {
    ctx.fillStyle = `rgba(6,10,14,0.12)`;
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const t = Date.now() * 0.001;
    const group = getBeatGroup();
    const stepAngle = (Math.PI * 2) / state.STEPS;

    // Concentric rings from frequency bands
    const bandCount = 6;
    for (let b = 0; b < bandCount; b++) {
        const bandVal = freqData
            ? freqData.slice(b * 20, (b + 1) * 20).reduce((s, v) => s + v, 0) / 20 / 255
            : 0.1;
        const baseR = 40 + b * (Math.min(W, H) * 0.07);
        const r = baseR + bandVal * 60;
        const sides = 3 + b;
        const rot = t * (0.2 + b * 0.1) * (b % 2 === 0 ? 1 : -1);

        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
            const a = rot + (i / sides) * Math.PI * 2;
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = `hsla(${180 + b * 30},100%,${50 + bandVal * 30}%,${0.3 + bandVal * 0.5})`;
        ctx.lineWidth = 1 + bandVal * 3;
        ctx.stroke();
    }

    // Step markers around the circle
    const outerR = Math.min(W, H) * 0.4;
    state.rows.forEach((row, ri) => {
        for (let i = 0; i < state.STEPS; i++) {
            if (!row.pattern[i]) continue;
            const a = stepAngle * i - Math.PI / 2 + t * 0.1;
            const layerR = outerR * (0.5 + (ri / state.rows.length) * 0.5);
            const px = cx + Math.cos(a) * layerR;
            const py = cy + Math.sin(a) * layerR;
            const hue = ROW_HUES[ri % ROW_HUES.length];
            const isActive = state.isPlaying && i === state.currentStep;
            const sz = isActive ? 6 + bassLevel * 10 : 3;
            const alpha = isActive ? 0.9 : 0.3 + avgLevel * 0.3;

            ctx.beginPath();
            ctx.arc(px, py, sz, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue},100%,60%,${alpha})`;
            ctx.fill();
        }
    });

    // Beat group dividers
    for (let i = 0; i < state.STEPS; i += group) {
        const a = stepAngle * i - Math.PI / 2 + t * 0.1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * outerR * 1.05, cy + Math.sin(a) * outerR * 1.05);
        ctx.strokeStyle = `rgba(0,229,255,${0.05 + bassLevel * 0.1})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// ─── MODE 2: FLUID ───

function drawFluid(W, H, freqData, avgLevel, bassLevel) {
    ctx.fillStyle = `rgba(6,10,14,0.25)`;
    ctx.fillRect(0, 0, W, H);

    const t = Date.now() * 0.0005;

    // Active instrument hues
    const activeHues = [];
    if (state.isPlaying) {
        state.rows.forEach((row, ri) => {
            if (row.pattern[state.currentStep] && !row.muted) {
                activeHues.push(ROW_HUES[ri % ROW_HUES.length]);
            }
        });
    }
    if (activeHues.length === 0) activeHues.push(180, 220);

    // Layered sine-wave color fields
    const layers = 5;
    for (let l = 0; l < layers; l++) {
        const hue = activeHues[l % activeHues.length];
        const bandVal = freqData
            ? freqData.slice(l * 25, (l + 1) * 25).reduce((s, v) => s + v, 0) / 25 / 255
            : 0.15;
        const amplitude = H * 0.15 * (0.5 + bandVal * 1.5);
        const freq = 2 + l * 0.7;
        const speed = t * (1 + l * 0.3);
        const yBase = H * (0.25 + l * 0.12);

        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 4) {
            const y = yBase
                + Math.sin((x / W) * Math.PI * freq + speed) * amplitude
                + Math.sin((x / W) * Math.PI * (freq * 1.7) + speed * 1.3) * amplitude * 0.3;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fillStyle = `hsla(${hue},80%,${30 + bandVal * 30}%,${0.03 + bandVal * 0.05})`;
        ctx.fill();
    }

    // Floating orbs
    const orbCount = 4 + Math.floor(activeHues.length * 1.5);
    for (let i = 0; i < orbCount; i++) {
        const hue = activeHues[i % activeHues.length];
        const bandVal = freqData
            ? freqData.slice(i * 10, (i + 1) * 10).reduce((s, v) => s + v, 0) / 10 / 255
            : 0.2;
        const ox = W * (0.2 + 0.6 * ((Math.sin(t * 0.7 + i * 2.1) + 1) / 2));
        const oy = H * (0.2 + 0.6 * ((Math.cos(t * 0.5 + i * 1.7) + 1) / 2));
        const r = 30 + bandVal * 80 + bassLevel * 40;

        const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
        grad.addColorStop(0, `hsla(${hue},100%,60%,${0.15 + bandVal * 0.2})`);
        grad.addColorStop(1, `hsla(${hue},100%,40%,0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Step pulse
    if (state.isPlaying) {
        const pulse = bassLevel * 0.08;
        ctx.fillStyle = `rgba(255,255,255,${pulse})`;
        ctx.fillRect(0, 0, W, H);
    }
}

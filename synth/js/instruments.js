const VOWELS = {
    a: [[800, 1], [1150, 0.5], [2900, 0.3], [3900, 0.15]],
    e: [[350, 1], [2000, 0.45], [2800, 0.25], [3600, 0.12]],
    i: [[270, 1], [2140, 0.4], [2950, 0.22], [3900, 0.1]],
    o: [[450, 1], [800, 0.55], [2830, 0.2], [3800, 0.1]],
    u: [[325, 1], [700, 0.45], [2700, 0.15], [3800, 0.08]],
};
const VL = ["a", "e", "i", "o", "u"];

export const INSTRUMENTS = {
    sawLead: {
        name: "Saw Lead",
        type: "melodic",
        play(ac, dest, freq, t, dur, p) {
            let o1 = ac.createOscillator(),
                o2 = ac.createOscillator(),
                g = ac.createGain(),
                env = ac.createBiquadFilter();
            env.type = "lowpass";
            env.Q.value = 3;
            env.frequency.setValueAtTime(
                (p.filter || 2000) + (p.filterEnv || 0), t,
            );
            env.frequency.exponentialRampToValueAtTime(
                Math.max(p.filter || 200, 80), t + dur * 0.7,
            );
            o1.type = "sawtooth";
            o1.frequency.value = freq;
            o2.type = "sawtooth";
            o2.frequency.value = freq * 1.007;
            o1.connect(env);
            o2.connect(env);
            env.connect(g);
            g.connect(dest);
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.16, t + 0.008);
            g.gain.setValueAtTime(0.13, t + dur * 0.3);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur);
            o1.start(t);
            o2.start(t);
            o1.stop(t + dur + 0.01);
            o2.stop(t + dur + 0.01);
        },
    },
    sqBass: {
        name: "Sq Bass",
        type: "melodic",
        play(ac, dest, freq, t, dur) {
            let o = ac.createOscillator(),
                sub = ac.createOscillator(),
                g = ac.createGain();
            o.type = "square";
            o.frequency.value = freq;
            sub.type = "sine";
            sub.frequency.value = freq * 0.5;
            o.connect(g);
            sub.connect(g);
            g.connect(dest);
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.2, t + 0.005);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.8);
            o.start(t);
            sub.start(t);
            o.stop(t + dur + 0.01);
            sub.stop(t + dur + 0.01);
        },
    },
    stringPad: {
        name: "String Pad",
        type: "melodic",
        play(ac, dest, freq, t, dur) {
            let o1 = ac.createOscillator(),
                o2 = ac.createOscillator(),
                o3 = ac.createOscillator(),
                g = ac.createGain(),
                lp = ac.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = 400;
            lp.Q.value = 2;
            o1.type = "sine";
            o1.frequency.value = freq;
            o2.type = "triangle";
            o2.frequency.value = freq * 1.004;
            o3.type = "sine";
            o3.frequency.value = freq * 2.003;
            o1.connect(lp);
            o2.connect(lp);
            o3.connect(lp);
            lp.connect(g);
            g.connect(dest);
            let fd = Math.max(dur * 3, 1.2);
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.22, t + 0.12);
            g.gain.setValueAtTime(0.2, t + fd * 0.6);
            g.gain.exponentialRampToValueAtTime(0.001, t + fd);
            o1.start(t);
            o2.start(t);
            o3.start(t);
            o1.stop(t + fd + 0.01);
            o2.stop(t + fd + 0.01);
            o3.stop(t + fd + 0.01);
        },
    },
    vocalPad: {
        name: "Vocal Pad",
        type: "melodic",
        play(ac, dest, freq, t, dur) {
            let vw = VOWELS[VL[Math.floor(Math.random() * 5)]],
                s1 = ac.createOscillator(),
                s2 = ac.createOscillator();
            s1.type = "sawtooth";
            s1.frequency.value = freq;
            s2.type = "sawtooth";
            s2.frequency.value = freq * 1.003;
            let mx = ac.createGain();
            mx.gain.value = 0.5;
            s1.connect(mx);
            s2.connect(mx);
            let mg = ac.createGain();
            mg.connect(dest);
            let fd = Math.max(dur * 2, 0.8);
            mg.gain.setValueAtTime(0, t);
            mg.gain.linearRampToValueAtTime(0.18, t + 0.08);
            mg.gain.setValueAtTime(0.16, t + fd * 0.7);
            mg.gain.exponentialRampToValueAtTime(0.001, t + fd);
            vw.forEach(([f, g]) => {
                let bp = ac.createBiquadFilter();
                bp.type = "bandpass";
                bp.frequency.value = f;
                bp.Q.value = 12;
                let fg2 = ac.createGain();
                fg2.gain.value = g * 0.35;
                mx.connect(bp);
                bp.connect(fg2);
                fg2.connect(mg);
            });
            s1.start(t);
            s2.start(t);
            s1.stop(t + fd + 0.01);
            s2.stop(t + fd + 0.01);
        },
    },
    vocalChop: {
        name: "Vocal Chop",
        type: "melodic",
        play(ac, dest, freq, t, dur) {
            let vw = VOWELS[VL[Math.floor(Math.random() * 5)]],
                src = ac.createOscillator();
            src.type = "sawtooth";
            src.frequency.value = freq;
            let mg = ac.createGain();
            mg.connect(dest);
            let sd = Math.min(dur * 0.6, 0.15);
            mg.gain.setValueAtTime(0, t);
            mg.gain.linearRampToValueAtTime(0.22, t + 0.005);
            mg.gain.exponentialRampToValueAtTime(0.001, t + sd);
            vw.forEach(([f, g]) => {
                let bp = ac.createBiquadFilter();
                bp.type = "bandpass";
                bp.frequency.value = f;
                bp.Q.value = 8;
                let fg2 = ac.createGain();
                fg2.gain.value = g * 0.5;
                src.connect(bp);
                bp.connect(fg2);
                fg2.connect(mg);
            });
            src.start(t);
            src.stop(t + sd + 0.01);
        },
    },
    vocalOoh: {
        name: "Vocal Ooh",
        type: "melodic",
        play(ac, dest, freq, t, dur) {
            let s1 = ac.createOscillator(),
                s2 = ac.createOscillator();
            s1.type = "sawtooth";
            s1.frequency.value = freq;
            s2.type = "triangle";
            s2.frequency.value = freq * 0.999;
            let mx = ac.createGain();
            mx.gain.value = 0.5;
            s1.connect(mx);
            s2.connect(mx);
            let mg = ac.createGain();
            mg.connect(dest);
            let fd = Math.max(dur * 2.5, 1);
            mg.gain.setValueAtTime(0, t);
            mg.gain.linearRampToValueAtTime(0.15, t + 0.15);
            mg.gain.setValueAtTime(0.13, t + fd * 0.7);
            mg.gain.exponentialRampToValueAtTime(0.001, t + fd);
            let fO = VOWELS.o,
                fU = VOWELS.u;
            fO.forEach(([f1, g1], idx) => {
                let [f2, g2] = fU[idx] || [f1, g1];
                let bp = ac.createBiquadFilter();
                bp.type = "bandpass";
                bp.Q.value = 10;
                bp.frequency.setValueAtTime(f1, t);
                bp.frequency.linearRampToValueAtTime(f2, t + fd * 0.5);
                let fg2 = ac.createGain();
                fg2.gain.value = ((g1 + g2) / 2) * 0.35;
                mx.connect(bp);
                bp.connect(fg2);
                fg2.connect(mg);
            });
            s1.start(t);
            s2.start(t);
            s1.stop(t + fd + 0.01);
            s2.stop(t + fd + 0.01);
        },
    },
    fmBell: {
        name: "FM Bell",
        type: "melodic",
        play(ac, dest, freq, t, dur) {
            let c = ac.createOscillator(),
                m = ac.createOscillator(),
                mG = ac.createGain(),
                g = ac.createGain();
            c.type = "sine";
            c.frequency.value = freq;
            m.type = "sine";
            m.frequency.value = freq * 5.01;
            mG.gain.setValueAtTime(freq * 3, t);
            mG.gain.exponentialRampToValueAtTime(1, t + dur * 1.5);
            m.connect(mG);
            mG.connect(c.frequency);
            c.connect(g);
            g.connect(dest);
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.2, t + 0.002);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur * 1.5);
            c.start(t);
            m.start(t);
            c.stop(t + dur * 1.5 + 0.01);
            m.stop(t + dur * 1.5 + 0.01);
        },
    },
    pluck: {
        name: "Pluck",
        type: "melodic",
        play(ac, dest, freq, t, dur) {
            let bl = Math.round(ac.sampleRate / freq),
                buf = ac.createBuffer(1, ac.sampleRate * 0.15, ac.sampleRate),
                d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++)
                d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bl * 6));
            let src = ac.createBufferSource();
            src.buffer = buf;
            let lp = ac.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = freq * 3;
            lp.Q.value = 0.5;
            let g = ac.createGain();
            src.connect(lp);
            lp.connect(g);
            g.connect(dest);
            g.gain.setValueAtTime(0.25, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur * 1.2);
            src.start(t);
            src.stop(t + dur * 1.2 + 0.01);
        },
    },
    organ: {
        name: "Organ",
        type: "melodic",
        play(ac, dest, freq, t, dur) {
            let g = ac.createGain();
            g.connect(dest);
            [1, 2, 3, 4].forEach((h, i) => {
                let o = ac.createOscillator();
                o.type = "sine";
                o.frequency.value = freq * h;
                let hg = ac.createGain();
                hg.gain.value = [0.5, 0.25, 0.12, 0.06][i];
                o.connect(hg);
                hg.connect(g);
                o.start(t);
                o.stop(t + dur + 0.01);
            });
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.18, t + 0.01);
            g.gain.setValueAtTime(0.16, t + dur * 0.8);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        },
    },
    subBass: {
        name: "Sub Bass",
        type: "melodic",
        play(ac, dest, freq, t, dur) {
            let o = ac.createOscillator(),
                g = ac.createGain();
            o.type = "sine";
            o.frequency.value = freq;
            o.connect(g);
            g.connect(dest);
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.3, t + 0.01);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.9);
            o.start(t);
            o.stop(t + dur + 0.01);
        },
    },
    acid: {
        name: "Acid 303",
        type: "melodic",
        play(ac, dest, freq, t, dur) {
            let o = ac.createOscillator(),
                g = ac.createGain(),
                f = ac.createBiquadFilter();
            f.type = "lowpass";
            f.Q.value = 12;
            f.frequency.setValueAtTime(Math.min(freq * 6, 6000), t);
            f.frequency.exponentialRampToValueAtTime(
                Math.max(freq * 0.8, 80), t + dur * 0.6,
            );
            o.type = "sawtooth";
            o.frequency.setValueAtTime(freq * 1.02, t);
            o.frequency.exponentialRampToValueAtTime(freq, t + 0.04);
            o.connect(f);
            f.connect(g);
            g.connect(dest);
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.2, t + 0.003);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.7);
            o.start(t);
            o.stop(t + dur + 0.01);
        },
    },
    kick: {
        name: "Kick",
        type: "perc",
        play(ac, dest, f, t) {
            let o = ac.createOscillator(),
                g = ac.createGain();
            o.type = "sine";
            o.frequency.setValueAtTime(150, t);
            o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
            o.connect(g);
            g.connect(dest);
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.75, t + 0.005);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            o.start(t);
            o.stop(t + 0.35);
        },
    },
    deepKick: {
        name: "Deep Kick",
        type: "perc",
        play(ac, dest, f, t) {
            let o1 = ac.createOscillator(),
                g1 = ac.createGain();
            o1.type = "sine";
            o1.frequency.setValueAtTime(80, t);
            o1.frequency.exponentialRampToValueAtTime(22, t + 0.35);
            o1.connect(g1);
            g1.connect(dest);
            g1.gain.setValueAtTime(0, t);
            g1.gain.linearRampToValueAtTime(0.9, t + 0.004);
            g1.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            o1.start(t);
            o1.stop(t + 0.55);
            let o2 = ac.createOscillator(),
                g2 = ac.createGain();
            o2.type = "sine";
            o2.frequency.setValueAtTime(200, t);
            o2.frequency.exponentialRampToValueAtTime(50, t + 0.02);
            o2.connect(g2);
            g2.connect(dest);
            g2.gain.setValueAtTime(0.35, t);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
            o2.start(t);
            o2.stop(t + 0.05);
        },
    },
    hat: {
        name: "Hi-Hat",
        type: "perc",
        play(ac, dest, f, t) {
            let bs = ac.sampleRate * 0.06,
                buf = ac.createBuffer(1, bs, ac.sampleRate),
                d = buf.getChannelData(0);
            for (let i = 0; i < bs; i++) d[i] = Math.random() * 2 - 1;
            let src = ac.createBufferSource();
            src.buffer = buf;
            let hp = ac.createBiquadFilter();
            hp.type = "highpass";
            hp.frequency.value = 7000;
            let g = ac.createGain();
            src.connect(hp);
            hp.connect(g);
            g.connect(dest);
            g.gain.setValueAtTime(0.13, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
            src.start(t);
            src.stop(t + 0.06);
            let o = ac.createOscillator(),
                bp = ac.createBiquadFilter();
            bp.type = "bandpass";
            bp.frequency.value = 8500;
            bp.Q.value = 3;
            let g2 = ac.createGain();
            o.type = "square";
            o.frequency.value = 6500;
            o.connect(bp);
            bp.connect(g2);
            g2.connect(dest);
            g2.gain.setValueAtTime(0.04, t);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
            o.start(t);
            o.stop(t + 0.04);
        },
    },
    openHat: {
        name: "Open Hat",
        type: "perc",
        play(ac, dest, f, t) {
            let bs = ac.sampleRate * 0.2,
                buf = ac.createBuffer(1, bs, ac.sampleRate),
                d = buf.getChannelData(0);
            for (let i = 0; i < bs; i++) d[i] = Math.random() * 2 - 1;
            let src = ac.createBufferSource();
            src.buffer = buf;
            let hp = ac.createBiquadFilter();
            hp.type = "highpass";
            hp.frequency.value = 6000;
            let g = ac.createGain();
            src.connect(hp);
            hp.connect(g);
            g.connect(dest);
            g.gain.setValueAtTime(0.12, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
            src.start(t);
            src.stop(t + 0.2);
        },
    },
    snare: {
        name: "Snare",
        type: "perc",
        play(ac, dest, f, t) {
            let bs = ac.sampleRate * 0.12,
                buf = ac.createBuffer(1, bs, ac.sampleRate),
                d = buf.getChannelData(0);
            for (let i = 0; i < bs; i++) d[i] = Math.random() * 2 - 1;
            let src = ac.createBufferSource();
            src.buffer = buf;
            let bp = ac.createBiquadFilter();
            bp.type = "bandpass";
            bp.frequency.value = 3000;
            bp.Q.value = 1;
            let g = ac.createGain();
            src.connect(bp);
            bp.connect(g);
            g.connect(dest);
            g.gain.setValueAtTime(0.22, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            src.start(t);
            src.stop(t + 0.12);
            let o = ac.createOscillator(),
                g2 = ac.createGain();
            o.type = "sine";
            o.frequency.setValueAtTime(200, t);
            o.frequency.exponentialRampToValueAtTime(120, t + 0.03);
            o.connect(g2);
            g2.connect(dest);
            g2.gain.setValueAtTime(0.3, t);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
            o.start(t);
            o.stop(t + 0.08);
        },
    },
    clap: {
        name: "Clap",
        type: "perc",
        play(ac, dest, f, t) {
            [0, 0.01, 0.02, 0.035].forEach((off) => {
                let bs = ac.sampleRate * 0.012,
                    buf = ac.createBuffer(1, bs, ac.sampleRate),
                    d = buf.getChannelData(0);
                for (let i = 0; i < bs; i++) d[i] = Math.random() * 2 - 1;
                let src = ac.createBufferSource();
                src.buffer = buf;
                let bp = ac.createBiquadFilter();
                bp.type = "bandpass";
                bp.frequency.value = 1500;
                bp.Q.value = 1.5;
                let g = ac.createGain();
                src.connect(bp);
                bp.connect(g);
                g.connect(dest);
                g.gain.setValueAtTime(0.18, t + off);
                g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.01);
                src.start(t + off);
                src.stop(t + off + 0.015);
            });
            let bs2 = ac.sampleRate * 0.08,
                buf2 = ac.createBuffer(1, bs2, ac.sampleRate),
                d2 = buf2.getChannelData(0);
            for (let i = 0; i < bs2; i++) d2[i] = Math.random() * 2 - 1;
            let src2 = ac.createBufferSource();
            src2.buffer = buf2;
            let bp2 = ac.createBiquadFilter();
            bp2.type = "bandpass";
            bp2.frequency.value = 1200;
            bp2.Q.value = 2;
            let g2 = ac.createGain();
            src2.connect(bp2);
            bp2.connect(g2);
            g2.connect(dest);
            g2.gain.setValueAtTime(0.15, t + 0.035);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            src2.start(t + 0.035);
            src2.stop(t + 0.12);
        },
    },
    rim: {
        name: "Rimshot",
        type: "perc",
        play(ac, dest, f, t) {
            let o = ac.createOscillator(),
                g = ac.createGain();
            o.type = "triangle";
            o.frequency.value = 800;
            o.connect(g);
            g.connect(dest);
            g.gain.setValueAtTime(0.3, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
            o.start(t);
            o.stop(t + 0.03);
            let o2 = ac.createOscillator(),
                g2 = ac.createGain();
            o2.type = "sine";
            o2.frequency.value = 350;
            o2.connect(g2);
            g2.connect(dest);
            g2.gain.setValueAtTime(0.2, t);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
            o2.start(t);
            o2.stop(t + 0.02);
        },
    },
    tom: {
        name: "Tom",
        type: "perc",
        play(ac, dest, f, t) {
            let o = ac.createOscillator(),
                g = ac.createGain();
            o.type = "sine";
            o.frequency.setValueAtTime(200, t);
            o.frequency.exponentialRampToValueAtTime(80, t + 0.15);
            o.connect(g);
            g.connect(dest);
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.5, t + 0.003);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            o.start(t);
            o.stop(t + 0.3);
        },
    },
    cowbell: {
        name: "Cowbell",
        type: "perc",
        play(ac, dest, f, t) {
            let o1 = ac.createOscillator(),
                o2 = ac.createOscillator(),
                g = ac.createGain(),
                bp = ac.createBiquadFilter();
            bp.type = "bandpass";
            bp.frequency.value = 800;
            bp.Q.value = 5;
            o1.type = "square";
            o1.frequency.value = 560;
            o2.type = "square";
            o2.frequency.value = 845;
            o1.connect(bp);
            o2.connect(bp);
            bp.connect(g);
            g.connect(dest);
            g.gain.setValueAtTime(0.2, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
            o1.start(t);
            o2.start(t);
            o1.stop(t + 0.1);
            o2.stop(t + 0.1);
        },
    },
    perc808: {
        name: "808 Perc",
        type: "perc",
        play(ac, dest, f, t) {
            let o = ac.createOscillator(),
                g = ac.createGain();
            o.type = "sine";
            o.frequency.setValueAtTime(1000, t);
            o.frequency.exponentialRampToValueAtTime(300, t + 0.01);
            o.connect(g);
            g.connect(dest);
            g.gain.setValueAtTime(0.25, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
            o.start(t);
            o.stop(t + 0.05);
        },
    },
};

export const MELODIC_KEYS = [
    "sawLead", "sqBass", "stringPad", "vocalPad", "vocalChop",
    "vocalOoh", "fmBell", "pluck", "organ", "subBass", "acid",
];

export const PERC_KEYS = [
    "kick", "deepKick", "hat", "openHat", "snare",
    "clap", "rim", "tom", "cowbell", "perc808",
];

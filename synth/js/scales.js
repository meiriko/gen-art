import { SCALES, NOTE_NAMES } from "./constants.js";

export function midiToFreq(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
}

export function noteName(m) {
    return NOTE_NAMES[m % 12] + Math.floor(m / 12 - 1);
}

export function scaleNotes(root, oct, sc, cnt) {
    const s = SCALES[sc];
    const n = [];
    for (let i = 0; i < cnt; i++) {
        const d =
            Math.floor(Math.random() * s.length) +
            Math.floor(Math.random() * 2) * s.length;
        n.push(
            root +
                oct * 12 +
                s[d % s.length] +
                Math.floor(d / s.length) * 12,
        );
    }
    return n;
}

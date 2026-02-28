export const SCALES = {
    minor: [0, 2, 3, 5, 7, 8, 10],
    major: [0, 2, 4, 5, 7, 9, 11],
    pentatonic: [0, 2, 4, 7, 9],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    harmonicMin: [0, 2, 3, 5, 7, 8, 11],
};

export const NOTE_NAMES = [
    "C", "C#", "D", "D#", "E", "F",
    "F#", "G", "G#", "A", "A#", "B",
];

export const TIME_SIGS = {
    "4/4": { beats: 4, subdiv: 4, steps: [8, 16, 32] },
    "3/4": { beats: 3, subdiv: 4, steps: [12, 24] },
    "6/8": { beats: 2, subdiv: 6, steps: [12, 24] },
    "5/4": { beats: 5, subdiv: 4, steps: [20] },
    "7/8": { beats: 7, subdiv: 2, steps: [14] },
};

export const DEFAULT_ROWS = [
    { inst: "sawLead", minNote: 60, maxNote: 84 },
    { inst: "sqBass", minNote: 36, maxNote: 60 },
    { inst: "vocalPad", minNote: 48, maxNote: 72 },
    { inst: "pluck", minNote: 60, maxNote: 84 },
    { inst: "kick" },
    { inst: "snare" },
    { inst: "hat" },
    { inst: "clap" },
];

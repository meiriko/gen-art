let getStateFn = null;
let loadStateFn = null;
let debounceTimer = null;
let generation = 0;

const DEBOUNCE_MS = 300;

async function readAllChunks(readable) {
    const chunks = [];
    const reader = readable.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
    }
    return merged;
}

async function compress(json) {
    const bytes = new TextEncoder().encode(json);
    const cs = new CompressionStream("gzip");
    const writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();
    return uint8ToBase64url(await readAllChunks(cs.readable));
}

async function decompress(encoded) {
    const bytes = base64urlToUint8(encoded);
    const ds = new DecompressionStream("gzip");
    const writer = ds.writable.getWriter();
    writer.write(bytes);
    writer.close();
    return new TextDecoder().decode(await readAllChunks(ds.readable));
}

function uint8ToBase64url(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function base64urlToUint8(str) {
    let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export function pushStateToUrl() {
    if (!getStateFn) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        const thisGen = ++generation;
        try {
            const json = JSON.stringify(getStateFn());
            const encoded = await compress(json);
            if (thisGen === generation) {
                history.replaceState(null, "", "#" + encoded);
            }
        } catch (_) {
            // silently ignore compression failures
        }
    }, DEBOUNCE_MS);
}

function isValidState(st) {
    if (typeof st !== "object" || st === null) return false;
    if (st.rows !== undefined && !Array.isArray(st.rows)) return false;
    if (st.rows && st.rows.length > 64) return false;
    if (st.bpm !== undefined && (typeof st.bpm !== "number" || st.bpm < 40 || st.bpm > 300)) return false;
    if (st.STEPS !== undefined && (typeof st.STEPS !== "number" || st.STEPS < 1 || st.STEPS > 128)) return false;
    return true;
}

async function loadStateFromUrl() {
    const hash = location.hash.slice(1);
    if (!hash || !loadStateFn) return false;
    try {
        const json = await decompress(hash);
        const st = JSON.parse(json);
        if (!isValidState(st)) return false;
        loadStateFn(st);
        return true;
    } catch (_) {
        return false;
    }
}

export async function initUrlSync(getState, loadState) {
    if (typeof CompressionStream === "undefined") return;
    getStateFn = getState;
    loadStateFn = loadState;
    return loadStateFromUrl();
}

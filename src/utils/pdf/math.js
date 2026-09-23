const MAX_WIDTH = 499;

const cache = new Map();
let workerPromise = null;
let sequence = 0;
const pending = new Map();

function getWorker() {
    if (!workerPromise) {
        workerPromise = Promise.resolve().then(() => {
            const worker = new Worker(new URL('./mathWorker.js', import.meta.url), { type: 'module' });
            worker.onmessage = (event) => {
                const resolver = pending.get(event.data.id);
                if (resolver) {
                    pending.delete(event.data.id);
                    resolver(event.data);
                }
            };
            worker.onerror = (event) => {
                const message = event?.message || '公式渲染线程出错';
                for (const resolver of pending.values()) resolver({ error: message });
                pending.clear();
            };
            return worker;
        });
    }
    return workerPromise;
}

function request(worker, source, color) {
    sequence += 1;
    const id = sequence;
    return new Promise((resolve) => {
        pending.set(id, resolve);
        worker.postMessage({ id, source, color });
    });
}

// Shrink formulas wider than the page content so they never get clipped.
function clampSvg(svgText) {
    const openTag = /<svg[^>]*>/.exec(svgText)?.[0] ?? '';
    const width = Number.parseFloat(/width="([\d.]+)"/.exec(openTag)?.[1] ?? '0');
    const height = Number.parseFloat(/height="([\d.]+)"/.exec(openTag)?.[1] ?? '0');
    if (!width || width <= MAX_WIDTH) return svgText;

    const scale = MAX_WIDTH / width;
    return svgText
        .replace(/width="[\d.]+"/, `width="${(width * scale).toFixed(2)}"`)
        .replace(/height="[\d.]+"/, `height="${(height * scale).toFixed(2)}"`);
}

/**
 * Render standalone `$$...$$` formulas to self-contained SVG strings.
 *
 * @param {string[]} formulas
 * @returns {Promise<Map<string, { svg?: string, error?: string }>>}
 */
export async function renderMath(formulas, color = '#1f2328') {
    const result = new Map();
    const unique = [...new Set((formulas || []).filter((item) => item && item.trim()))];
    if (unique.length === 0) return result;

    if (typeof Worker === 'undefined') {
        for (const source of unique) {
            result.set(source, { error: '当前环境不支持 Web Worker' });
        }
        return result;
    }

    const worker = await getWorker();

    await Promise.all(unique.map(async (source) => {
        const key = `${color}:${source}`;
        if (cache.has(key)) {
            result.set(source, cache.get(key));
            return;
        }
        const data = await request(worker, source, color);
        const entry = data.error ? { error: data.error } : { svg: clampSvg(data.svg) };
        cache.set(key, entry);
        result.set(source, entry);
    }));

    return result;
}

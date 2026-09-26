const MAX_WIDTH = 499;
const REQUEST_TIMEOUT_MS = 15_000;

const cache = new Map();
let workerPromise = null;
let activeWorker = null;
let sequence = 0;
const pending = new Map();

function settle(id, data) {
    const request = pending.get(id);
    if (!request) return;
    pending.delete(id);
    clearTimeout(request.timer);
    request.resolve(data);
}

function retireWorker(worker, message) {
    if (worker === activeWorker) {
        worker.terminate();
        activeWorker = null;
        workerPromise = null;
    }
    for (const [id, request] of pending) {
        if (request.worker === worker) settle(id, { error: message });
    }
}

function getWorker() {
    if (!workerPromise) {
        workerPromise = Promise.resolve().then(() => {
            const worker = new Worker(new URL('./mathWorker.js', import.meta.url), { type: 'module' });
            activeWorker = worker;
            worker.onmessage = (event) => {
                settle(event.data.id, event.data);
            };
            worker.onerror = (event) => {
                const message = event?.message || '公式渲染线程出错';
                retireWorker(worker, message);
            };
            worker.onmessageerror = () => retireWorker(worker, '公式渲染线程返回了无法读取的数据');
            return worker;
        });
        const creatingWorker = workerPromise;
        creatingWorker.catch(() => {
            if (workerPromise === creatingWorker) workerPromise = null;
        });
    }
    return workerPromise;
}

function request(worker, source, color) {
    sequence += 1;
    const id = sequence;
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            retireWorker(worker, `公式渲染超时（${REQUEST_TIMEOUT_MS / 1000} 秒），请重试`);
        }, REQUEST_TIMEOUT_MS);
        pending.set(id, { resolve, timer, worker });
        try {
            worker.postMessage({ id, source, color });
        } catch (error) {
            retireWorker(worker, error?.message || '无法向公式渲染线程发送数据');
        }
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

    let worker;
    try {
        worker = await getWorker();
    } catch (error) {
        const message = error?.message || '公式渲染线程启动失败';
        for (const source of unique) result.set(source, { error: message });
        return result;
    }

    await Promise.all(unique.map(async (source) => {
        const key = `${color}:${source}`;
        if (cache.has(key)) {
            result.set(source, cache.get(key));
            return;
        }
        const data = await request(worker, source, color);
        const entry = data.error ? { error: data.error } : { svg: clampSvg(data.svg) };
        // A transient worker failure must be retried on the next export.
        if (!data.error) cache.set(key, entry);
        result.set(source, entry);
    }));

    return result;
}

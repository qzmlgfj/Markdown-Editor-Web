import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const workers = [];

class FakeWorker {
    constructor() {
        this.postMessage = vi.fn();
        this.terminate = vi.fn();
        workers.push(this);
    }
}

async function waitForRequest(index) {
    await vi.waitFor(() => expect(workers[index]).toBeDefined());
    const worker = workers[index];
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledOnce());
    return worker.postMessage.mock.calls[0][0];
}

async function flushWorkerRequest() {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

describe('MathJax worker recovery', () => {
    beforeEach(() => {
        workers.length = 0;
        vi.resetModules();
        vi.stubGlobal('Worker', FakeWorker);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('recreates the worker and retries a formula after a crash', async () => {
        const { renderMath } = await import('../math');
        const failedRender = renderMath(['x + 1']);
        await waitForRequest(0);

        workers[0].onerror({ message: 'worker crashed' });

        expect((await failedRender).get('x + 1')).toEqual({ error: 'worker crashed' });
        expect(workers[0].terminate).toHaveBeenCalledOnce();

        const recoveredRender = renderMath(['x + 1']);
        const request = await waitForRequest(1);
        workers[1].onmessage({ data: { id: request.id, svg: '<svg width="10" height="5"></svg>' } });

        expect((await recoveredRender).get('x + 1')).toEqual({ svg: '<svg width="10" height="5"></svg>' });
        expect(workers).toHaveLength(2);
    });

    it('times out a stuck request and creates a fresh worker next time', async () => {
        vi.useFakeTimers();
        const { renderMath } = await import('../math');
        const timedOutRender = renderMath(['stuck']);
        await flushWorkerRequest();
        expect(workers[0].postMessage).toHaveBeenCalledOnce();

        await vi.advanceTimersByTimeAsync(15_000);

        expect((await timedOutRender).get('stuck')?.error).toContain('超时');
        expect(workers[0].terminate).toHaveBeenCalledOnce();

        const nextRender = renderMath(['works']);
        await flushWorkerRequest();
        const request = workers[1].postMessage.mock.calls[0][0];
        workers[1].onmessage({ data: { id: request.id, svg: '<svg width="8" height="4"></svg>' } });

        expect((await nextRender).get('works')?.svg).toContain('<svg');
        expect(workers).toHaveLength(2);
    });
});

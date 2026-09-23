import { afterEach, expect, it, vi } from 'vitest';
import { prepareImages } from '../images';
import { analyze, buildDocument, parseMarkdown } from '../markdownToDocument';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const url = 'https://images.example/test.png';
const image = { data: 'data:image/png;base64,fixture', width: 2000, height: 1000 };
function decodeMocks() {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 2000, height: 1000, close })));
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ drawImage() {} }), toDataURL: () => image.data }) });
    return close;
}
it('loads each URL once and decodes content rather than trusting its extension', async () => {
    const close = decodeMocks();
    const fetch = vi.fn(async () => new Response(new Uint8Array([137,80,78,71,13,10,26,10])));
    vi.stubGlobal('fetch', fetch);
    const tokens = parseMarkdown(`![one](${url})\n\n![two](${url})`);
    expect((await prepareImages(tokens)).get(url)).toEqual(image);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1]).toMatchObject({ mode: 'cors', credentials: 'omit' });
    expect(close).toHaveBeenCalled();
});
it('rejects unsupported sources and payloads, and retries failures next export', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(new Response('<html>oops</html>')));
    const tokens = parseMarkdown(`![remote](${url})\n\n![relative](./test.png)`);
    expect((await prepareImages(tokens)).get(url).error).toContain('CORS');
    const result = await prepareImages(tokens);
    expect(result.get(url).error).toContain('PNG/JPEG');
    expect(result.get('./test.png').error).toBeTruthy();
});
it('times out stalled requests and aborts their fetch', async () => {
    vi.useFakeTimers();
    let signal;
    vi.stubGlobal('fetch', vi.fn((_, options) => { signal = options.signal; return new Promise(() => {}); }));
    const promise = prepareImages(parseMarkdown(`![](${url})`), { timeoutMs: 50 });
    await vi.advanceTimersByTimeAsync(51);
    expect((await promise).get(url).error).toContain('超时');
    expect(signal.aborted).toBe(true);
});
it('preserves formatting around block images and fits nested containers', () => {
    const tokens = parseMarkdown(`**before ![alt](${url}) after**\n\n- ![list](${url})\n\n> ![quote](${url})\n\n| Image | Text |\n| --- | --- |\n| ![cell](${url}) | end |`);
    const warnings = [];
    const imageMap = new Map([[url, image]]);
    const content = buildDocument(tokens, { imageMap, warnings });
    expect(content[0].stack[0].text[0]).toMatchObject({ text: 'before ', bold: true });
    expect(content[0].stack[2].text[0]).toMatchObject({ text: ' after', bold: true });
    const collect = node => Array.isArray(node) ? node.flatMap(collect) : node && typeof node === 'object' ? [...(node.image ? [node] : []), ...Object.values(node).flatMap(collect)] : [];
    const images = collect(content);
    expect(images).toHaveLength(4);
    expect(images[0].width).toBeCloseTo(499.28);
    expect(images[1].width).toBeLessThan(images[0].width);
    expect(images[2].width).toBeLessThan(images[0].width);
    expect(images[3].width).toBeLessThan(250);
    expect(warnings).toEqual([]);
    expect(analyze(tokens, imageMap).unsupported).not.toContain('图片');
});
it('bounds very tall images and reports each failed occurrence at its source line', () => {
    const tokens = parseMarkdown(`![one](${url})\n\n![two](${url})`);
    const content = buildDocument(tokens, { imageMap: new Map([[url, { ...image, height: 10000 }]]), warnings: [] });
    expect(content[0].stack[0].height).toBe(640);
    const warnings = [];
    const fallback = buildDocument(tokens, { imageMap: new Map([[url, { error: 'HTTP 404' }]]), warnings });
    expect(warnings[0]).toContain('第 1 行');
    expect(warnings[1]).toContain('第 3 行');
    expect(fallback[0].text.map(run => run.text).join('')).toContain('[图片：one]');
});
it('uses decoded dimensions for JPEG and downgrades corrupt PNG data', async () => {
    decodeMocks();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([255,216,255,224]))));
    expect((await prepareImages(parseMarkdown(`![jpeg](${url})`))).get(url).width).toBe(2000);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([137,80,78,71,13,10,26,10]))));
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new Error('decode failed'); }));
    expect((await prepareImages(parseMarkdown(`![broken](${url})`))).get(url).error).toContain('decode failed');
});
it('does not inspect invisible alt glyphs on successful images and preserves linked images', () => {
    const tokens = parseMarkdown(`*[![🦄](${url})](https://example.com)*`);
    const imageMap = new Map([[url, image]]);
    const analysis = analyze(tokens, imageMap);
    expect(analysis.texts.body).toEqual([]);
    expect(analysis.texts.latinItalic).toEqual([]);
    const content = buildDocument(tokens, { imageMap, warnings: [] });
    expect(content[0].stack[0].link).toBe('https://example.com');
});

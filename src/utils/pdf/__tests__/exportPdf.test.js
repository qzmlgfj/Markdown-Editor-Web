import { it, expect, vi } from 'vitest';
const { createPdf } = vi.hoisted(() => ({ createPdf: vi.fn(() => ({ getBlob: async () => new Blob(['pdf']) })) }));
vi.mock('../fonts', () => ({
    pdfMake: { createPdf },
    prepareFonts: async () => ({ families: { body: 'Test', code: 'Test' }, coverage: { body: new Set(Array.from({ length: 65536 }, (_, i) => i)), code: new Set(Array.from({ length: 128 }, (_, i) => i)) } }),
}));
vi.mock('../math', () => ({ renderMath: async () => new Map() }));
import { exportMarkdownToPdf } from '../exportPdf';

it('returns a Blob without triggering a download', async () => {
    const result = await exportMarkdownToPdf('hello $x^2$');
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.unsupported).toEqual([]);
});
it('reports the source line and respects cancellation', async () => {
    const confirmWarnings = vi.fn(async () => false);
    const result = await exportMarkdownToPdf('# Title\n\ntext\n$\\frac{1}{2}$', { confirmWarnings });
    expect(confirmWarnings.mock.calls[0][0][0]).toContain('第 4 行');
    expect(result.cancelled).toBe(true);
    expect(result.blob).toBeUndefined();
});
it('allows confirmed missing-glyph preview using a visible replacement', async () => {
    const confirmWarnings = vi.fn(async () => true);
    const result = await exportMarkdownToPdf('hello\n\n🦄', { confirmWarnings });
    expect(confirmWarnings.mock.calls[0][0][0]).toContain('第 3 行');
    expect(result.blob).toBeInstanceOf(Blob);
    const doc = createPdf.mock.calls.at(-1)[0];
    expect(JSON.stringify(doc.content)).toContain('?');
    expect(JSON.stringify(doc.content)).not.toContain('🦄');
});

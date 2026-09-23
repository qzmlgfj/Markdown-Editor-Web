import { it, expect, vi } from 'vitest';
const { createPdf } = vi.hoisted(() => ({ createPdf: vi.fn(() => ({ getBlob: async () => new Blob(['pdf']) })) }));
vi.mock('../fonts', () => ({
    pdfMake: { createPdf },
    prepareFonts: async () => ({ families: { body: 'Test', code: 'Test' }, coverage: { body: new Set(Array.from({ length: 65536 }, (_, i) => i)), code: new Set(Array.from({ length: 128 }, (_, i) => i)) } }),
}));
vi.mock('../math', () => ({ renderMath: async () => new Map() }));
import { exportMarkdownToPdf } from '../exportPdf';
import { base46Themes, getBase46Theme, themeColors } from '../../../themes/base46';

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

it('uses the selected Base46 palette throughout the PDF document', async () => {
    const palette = getBase46Theme('onedark');
    const colors = themeColors(palette);
    await exportMarkdownToPdf('# Heading\n\n[link](https://example.com)\n\n```js\nconst n = 1\n```', { palette });
    const doc = createPdf.mock.calls.at(-1)[0];
    expect(doc.defaultStyle.color).toBe(colors.text);
    expect(doc.background(1, { width: 595, height: 842 }).canvas[0].color).toBe(colors.background);
    expect(doc.styles.h2.color).toBe(colors.accent);
    expect(doc.content.find((node) => node.table)?.layout.fillColor()).toBe(colors.codeBackground);
    expect(JSON.stringify(doc.content)).toContain(colors.link);
});

it('accepts a light Base46 palette without producing a dark page', async () => {
    const palette = getBase46Theme('github_light');
    expect(palette.type).toBe('light');
    await exportMarkdownToPdf('# Heading\n\nLight text', { palette });
    const doc = createPdf.mock.calls.at(-1)[0];
    expect(doc.background(1, { width: 595, height: 842 }).canvas[0].color).toBe('#ffffff');
    expect(doc.defaultStyle.color).toBe(palette.base_30.white);
});

it('keeps the default PDF headings and links neutral', async () => {
    await exportMarkdownToPdf('# Title\n\n## Heading\n\n[link](https://example.com)');
    const doc = createPdf.mock.calls.at(-1)[0];
    expect(doc.background).toBeUndefined();
    for (const style of ['title', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'link']) {
        expect(doc.styles[style].color).toBe(doc.defaultStyle.color);
    }
});

it('uses palette heading colors for every Base46 title level', async () => {
    const palette = getBase46Theme('catppuccin_latte');
    const colors = themeColors(palette);
    expect(colors.text).toBe(palette.base_16.base05);
    expect(colors.accent).toBe(palette.base_16.base0D);
    await exportMarkdownToPdf('# Title\n\n## Heading', { palette });
    const doc = createPdf.mock.calls.at(-1)[0];
    for (const style of ['title', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
        expect(doc.styles[style].color).toBe(colors.accent);
    }
    expect(base46Themes.filter((theme) => theme.type === 'light').map((theme) => theme.id)).toEqual([
        'github_light', 'one_light', 'gruvbox_light', 'solarized_light', 'catppuccin_latte', 'rosepine_dawn',
    ]);
});

import { afterEach, it, expect, vi } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { prepareFonts, pdfMake } from '../fonts';
import { parseMarkdown, analyze, checkCoverage, buildDocument } from '../markdownToDocument';
import { createTheme } from '../theme';
import { create as readFont } from 'fontkit';

// Exercise the actual bundled font files and pdfmake, including glyph coverage.
afterEach(() => vi.unstubAllGlobals());
it('embeds math/logo fonts and mixed Chinese/Latin HTML formatting in a real PDF', async () => {
    vi.stubGlobal('fetch', async (url) => {
        const bytes = await readFile(resolve('public/fonts', basename(new URL(url).pathname)));
        return new Response(bytes);
    });
    const logoFont = readFont(await readFile(resolve('public/fonts/MarkdownTeXLogo.ttf')));
    expect(logoFont.glyphForCodePoint(101).bbox.minY).toBeLessThan(0); // E descends in TeX.
    expect(logoFont.glyphForCodePoint(97).bbox.minY).toBeGreaterThan(0); // A rises in LaTeX.
    const italicFont = readFont(await readFile(resolve('public/fonts/KaTeX_Math-Italic.ttf')));
    expect(italicFont.postscriptName).toContain('Math-Italic');
    const tokens = parseMarkdown(await readFile(resolve('examples/default.md'), 'utf8'));
    const analysis = analyze(tokens);
    const { families, coverage } = await prepareFonts(analysis.needs);
    expect(checkCoverage(analysis, coverage)).toEqual([]);
    expect(coverage.mathLogo.has('e'.codePointAt(0))).toBe(true);
    const commands = String.raw`$\TeX \LaTeX \alpha \beta \gamma \delta \epsilon \theta \lambda \mu \pi \sigma \phi \omega \Gamma \Delta \Sigma \Omega \times \cdot \pm \le \leq \ge \geq \ne \neq \approx \infty \to \rightarrow$`;
    expect(checkCoverage(analyze(parseMarkdown(commands)), coverage)).toEqual([]);
    const warnings = [];
    const [{ mathjax }, { TeX }, { SVG }, { liteAdaptor }, { RegisterHTMLHandler }, { AllPackages }] = await Promise.all([
        import('mathjax-full/js/mathjax.js'), import('mathjax-full/js/input/tex.js'),
        import('mathjax-full/js/output/svg.js'), import('mathjax-full/js/adaptors/liteAdaptor.js'),
        import('mathjax-full/js/handlers/html.js'), import('mathjax-full/js/input/tex/AllPackages.js'),
    ]);
    const adaptor = liteAdaptor();
    RegisterHTMLHandler(adaptor);
    const doc = mathjax.document('', { InputJax: new TeX({ packages: AllPackages.filter(name => name !== 'noundefined') }), OutputJax: new SVG({ fontCache: 'none' }) });
    const mathMap = new Map(analysis.math.map(source => {
        const svg = adaptor.innerHTML(doc.convert(source, { display: true }))
            .replace(/(width|height)="([\d.]+)ex"/g, (_, attr, value) => `${attr}="${Number(value) * 5.25}"`)
            .replace(/currentColor/g, '#1f2328');
        expect(svg).not.toContain('data-mjx-error');
        return [source, { svg }];
    }));
    const content = buildDocument(tokens, { warnings, mathMap });
    expect(warnings).toEqual([]);
    expect(JSON.stringify(content)).toContain('https://github.com/qzmlgfj/Markdown-Editor-Web');
    const runs = content.flatMap(node => node.text || []);
    for (const text of ['HTML 删除线', 'Markdown 删除线']) {
        expect(runs).toContainEqual(expect.objectContaining({ text, decoration: ['lineThrough'] }));
    }
    const blob = await pdfMake.createPdf({ ...createTheme(families), content }).getBlob();
    const bytes = Buffer.from(await blob.arrayBuffer());
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    // Optional artifact for visual review; normal test runs write no files.
    if (process.env.PDF_REVIEW_PATH) await writeFile(process.env.PDF_REVIEW_PATH, bytes);
}, 15000);

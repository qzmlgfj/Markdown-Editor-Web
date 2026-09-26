import { afterEach, it, expect, vi } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { prepareFonts, pdfMake } from '../fonts';
import { parseMarkdown, analyze, checkCoverage, buildDocument } from '../markdownToDocument';
import { createTheme } from '../theme';
import { getBase46Theme, themeColors } from '../../../themes/base46';
import { create as readFont } from 'fontkit';
import { registerSessionFont, getSessionFont } from '../../../fonts/session';
import { getDocumentFonts } from '../../../fonts/options';

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
    expect(runs.filter(run => run.decoration?.includes('lineThrough')).map(run => run.text).join('')).toContain('HTML 删除线');
    expect(runs.filter(run => run.decoration?.includes('lineThrough')).map(run => run.text).join('')).toContain('Markdown 删除线');
    const blob = await pdfMake.createPdf({ ...createTheme(families), content }).getBlob();
    const bytes = Buffer.from(await blob.arrayBuffer());
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    // Optional artifact for visual review; normal test runs write no files.
    if (process.env.PDF_REVIEW_PATH) await writeFile(process.env.PDF_REVIEW_PATH, bytes);
    for (const [path, id] of [
        [process.env.PDF_REVIEW_THEME_PATH, 'onedark'],
        [process.env.PDF_REVIEW_LIGHT_PATH, process.env.PDF_REVIEW_LIGHT_ID || 'github_light'],
    ]) {
        if (!path) continue;
        const palette = getBase46Theme(id);
        const colors = themeColors(palette);
        const themedMath = new Map([...mathMap].map(([source, entry]) => [source, {
            svg: entry.svg.replaceAll('#1f2328', colors.text),
        }]));
        const themedContent = buildDocument(tokens, { warnings: [], mathMap: themedMath, colors });
        const themedBlob = await pdfMake.createPdf({ ...createTheme(families, palette), content: themedContent }).getBlob();
        await writeFile(path, Buffer.from(await themedBlob.arrayBuffer()));
    }
}, 15000);

it('uses selected Chinese and English faces in a mixed-script PDF', async () => {
    vi.stubGlobal('fetch', async (url) => {
        const bytes = await readFile(resolve('public/fonts', basename(new URL(url).pathname)));
        return new Response(bytes);
    });
    const tokens = parseMarkdown('# 宋体标题 Lato title\n\n中文 mixed *italic* and **bold**.');
    const analysis = analyze(tokens);
    const { families, coverage } = await prepareFonts(analysis.needs, { chinese: 'serif', english: 'lato' });
    expect(checkCoverage(analysis, coverage)).toEqual([]);
    const content = buildDocument(tokens, { warnings: [] });
    const runs = content.flatMap(node => node.text || []);
    expect(runs).toContainEqual(expect.objectContaining({ text: ' Lato title', font: 'PdfLatin' }));
    expect(runs).toContainEqual(expect.objectContaining({ text: 'italic', font: 'PdfLatin', italics: true }));
    const blob = await pdfMake.createPdf({ ...createTheme(families), content }).getBlob();
    const bytes = Buffer.from(await blob.arrayBuffer());
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    const pdfSource = bytes.toString('latin1');
    for (const font of ['NotoSerifSC-Regular', 'NotoSerifSC-Bold', 'Lato-Regular', 'Lato-Bold', 'Lato-Italic']) {
        expect(pdfSource).toContain(font);
    }
    if (process.env.PDF_FONT_REVIEW_PATH) await writeFile(process.env.PDF_FONT_REVIEW_PATH, bytes);
}, 15000);

it('embeds an imported local font without fetching it and keeps the selected face in a snapshot', async () => {
    const webFaces = new Set();
    vi.stubGlobal('document', { baseURI: 'http://localhost/', fonts: {
        add: (face) => webFaces.add(face), delete: (face) => webFaces.delete(face),
    } });
    vi.stubGlobal('FontFace', class {
        constructor(family, bytes, descriptors) { Object.assign(this, { family, bytes, descriptors }); }
        async load() { return this; }
    });
    const bytes = await readFile(resolve('public/fonts/NotoSerifSC-Regular.otf'));
    const file = { name: 'local-serif.otf', size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
    const entry = await registerSessionFont({ script: 'chinese', label: '我的宋体', files: { regular: file } });
    expect(webFaces.size).toBe(2);
    expect(getSessionFont('chinese', entry.value)).toBe(entry);
    const broken = { name: 'broken.otf', size: 4, arrayBuffer: async () => Uint8Array.of(1, 2, 3, 4).buffer };
    await expect(registerSessionFont({ script: 'chinese', files: { regular: broken } })).rejects.toThrow('不是受支持的静态 TTF/OTF');
    expect(getSessionFont('chinese', entry.value)).toBe(entry);
    const snapshot = getDocumentFonts({ chinese: entry.value, english: 'lato' });
    expect(snapshot.chinese).toBe(entry);
    vi.stubGlobal('fetch', async (url) => {
        expect(url).not.toContain('local-serif');
        const data = await readFile(resolve('public/fonts', basename(new URL(url).pathname)));
        return new Response(data);
    });
    const tokens = parseMarkdown('# 本地字体标题\n\n中文 mixed text.');
    const analysis = analyze(tokens);
    const { families, coverage } = await prepareFonts(analysis.needs, snapshot);
    expect(checkCoverage(analysis, coverage)).toEqual([]);
    const blob = await pdfMake.createPdf({ ...createTheme(families), content: buildDocument(tokens, { warnings: [] }) }).getBlob();
    const pdf = Buffer.from(await blob.arrayBuffer());
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.toString('latin1')).toContain('NotoSerifSC-Regular');
}, 15000);

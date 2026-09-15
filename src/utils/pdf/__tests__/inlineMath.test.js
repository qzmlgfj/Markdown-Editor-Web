import { describe, it, expect } from 'vitest';
import { simpleInlineMath } from '../inlineMath';
import { parseMarkdown, analyze, buildDocument } from '../markdownToDocument';

describe('simple inline math', () => {
    it('keeps TeX inline and uses native superscript and subscript runs', () => {
        const tokens = parseMarkdown('支持 $\\TeX$ 公式，$x_i^2 + \\alpha \\leq 10$。');
        const warnings = [];
        const nodes = buildDocument(tokens, { warnings });
        expect(warnings).toEqual([]);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].text.map(r => r.text).join('')).toBe('支持 TeX 公式，xi2 + α ≤ 10。');
        expect(nodes[0].text).toContainEqual(expect.objectContaining({ text: 'i', sub: true, font: 'PdfMathItalic' }));
        expect(nodes[0].text).toContainEqual(expect.objectContaining({ text: '2', sup: true, font: 'PdfMath' }));
        expect(analyze(tokens).texts.mathItalic.join('')).toContain('α');
    });
    it('does not parse code, escaped dollars or typical currency as math', () => {
        const tokens = parseMarkdown('`$x$` \\$x\\$ costs $5 and $10');
        expect(tokens[1].children.some(t => t.type === 'math_inline')).toBe(false);
    });
    it('retains unsupported formulas verbatim and reports the source', () => {
        const tokens = parseMarkdown('值 $\\frac{1}{2}$');
        const warnings = [];
        const nodes = buildDocument(tokens, { warnings });
        expect(nodes[0].text.map(r => r.text).join('')).toContain('$\\frac{1}{2}$');
        expect(warnings[0]).toContain('\\frac{1}{2}');
        expect(analyze(tokens).texts.body.join('')).toContain('$\\frac{1}{2}$');
    });
    it('rejects malformed scripts without silently dropping content', () => {
        for (const source of ['x^', 'x^{2', 'x^{}', 'x^{y^2}', '^2']) {
            expect(simpleInlineMath(source).error).toBeTruthy();
        }
    });
    it('supports grouped scripts inside table cells and links', () => {
        const warnings = [];
        const nodes = buildDocument(parseMarkdown('| value |\n| --- |\n| [$x_{12}$](https://example.com) |'), { warnings });
        const scripts = nodes[0].table.body[1][0].text.filter(run => run.sub);
        expect(scripts.map(run => run.text).join('')).toBe('12');
        expect(scripts.every(run => run.link === 'https://example.com')).toBe(true);
    });
});

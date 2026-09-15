import { it, expect } from 'vitest';
import { parseMarkdown, analyze, buildDocument } from '../markdownToDocument';

function convert(source) {
    const tokens = parseMarkdown(source);
    const warnings = [];
    return { nodes: buildDocument(tokens, { warnings }), warnings, analysis: analyze(tokens) };
}
it('renders nested formatting, superscripts, subscripts and line breaks', () => {
    const { nodes, warnings, analysis } = convert('<u>下划线 <b>bold</b></u> H<sub>2</sub>O 10<sup>26</sup><br/>end');
    const runs = nodes[0].text;
    expect(runs.map(run => run.text).join('')).toBe('下划线 bold H2O 1026\nend');
    expect(runs).toContainEqual(expect.objectContaining({ text: 'bold', bold: true, decoration: ['underline'] }));
    expect(runs).toContainEqual(expect.objectContaining({ text: '2', sub: true }));
    expect(runs).toContainEqual(expect.objectContaining({ text: '26', sup: true }));
    expect(analysis.needs.hasBold).toBe(true);
    expect(warnings).toEqual([]);
});
it('uses the real Latin italic face inside a Chinese document', () => {
    const { nodes, analysis } = convert('中文 <i>italic</i> <em><strong>bold italic</strong></em>');
    expect(nodes[0].text).toContainEqual(expect.objectContaining({ text: 'italic', font: 'PdfLatin', italics: true }));
    expect(analysis.needs.hasItalic).toBe(true);
    expect(analysis.texts.latinItalic.join('')).toContain('bold italic');
});
it('preserves combined underline and strikethrough', () => {
    const { nodes } = convert('<u><del>old</del></u> <s>gone</s>');
    expect(nodes[0].text[0].decoration).toEqual(['lineThrough', 'underline']);
    expect(nodes[0].text.at(-1).decoration).toEqual(['lineThrough']);
});
it('supports uppercase tags and HTML styles inside table cells', () => {
    const { nodes, warnings } = convert('| head |\n| --- |\n| <U><B>yes</B></U> |');
    expect(nodes[0].table.body[1][0].text[0]).toMatchObject({ text: 'yes', bold: true, decoration: ['underline'] });
    expect(warnings).toEqual([]);
});
it('keeps unknown tags, attributes and scripts as inert source with line warnings', () => {
    const { nodes, warnings } = convert('start\n\n<span style="color:red">text</span>\n<script>alert(1)</script>');
    const text = nodes.flatMap(n => n.text).map(r => r.text).join('');
    expect(text).toContain('<script>alert(1)</script>');
    expect(text).toContain('<span style="color:red">text</span>');
    expect(warnings.some(w => w.includes('第 3 行'))).toBe(true);
    expect(warnings.some(w => w.includes('第 4 行'))).toBe(true);
});
it('does not leak styling from unclosed or misnested HTML', () => {
    for (const source of ['<u>oops', '<u><b>oops</u></b>']) {
        const { nodes, warnings } = convert(source);
        expect(nodes[0].text.map(r => r.text).join('')).toBe(source);
        expect(nodes[0].text.every(r => !r.bold && !r.decoration)).toBe(true);
        expect(warnings.length).toBeGreaterThan(0);
    }
});
it('leaves code, escaped tags and autolinks untouched', () => {
    const { nodes, warnings } = convert('`<u>code</u>` \\<u>text\\</u> <https://example.com>');
    expect(nodes[0].text.map(r => r.text).join('')).toBe('<u>code</u> <u>text</u> https://example.com');
    expect(warnings).toEqual([]);
});

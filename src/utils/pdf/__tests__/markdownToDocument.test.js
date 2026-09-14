import { describe, it, expect } from 'vitest';
import {
    parseMarkdown,
    analyze,
    checkCoverage,
    buildDocument,
} from '../markdownToDocument';
import { buildCodeBlock, codeRuns } from '../codeBlock';

function analyzeText(markdown) {
    return analyze(parseMarkdown(markdown));
}

describe('analyze', () => {
    it('detects CJK, bold, italic and code needs', () => {
        const { needs } = analyzeText('# 标题\n\n**加粗** 和 *斜体* 与 `code`\n\n```\nconst a = 1;\n```');
        expect(needs.hasCJK).toBe(true);
        expect(needs.hasBold).toBe(true);
        expect(needs.hasItalic).toBe(true);
        expect(needs.hasCode).toBe(true);
    });

    it('treats pure Latin text as non-CJK', () => {
        const { needs } = analyzeText('Hello **world**');
        expect(needs.hasCJK).toBe(false);
    });

    it('splits code text by the font that renders it', () => {
        const { needs, texts } = analyzeText('```\nconst 名称 = 1;\n```');
        expect(needs.hasCJK).toBe(true);
        expect(texts.codeCJK.join('')).toContain('名称');
        expect(texts.codeMono.join('')).toContain('const');
        expect(texts.codeMono.join('')).not.toContain('名');
    });

    it('splits inline code the same way', () => {
        const { needs, texts } = analyzeText('中文 `用户名称` 与 `const a = 1`');
        expect(needs.hasCode).toBe(true);
        expect(needs.hasCJK).toBe(true);
        expect(texts.codeCJK.join('')).toContain('用户名称');
        expect(texts.codeMono.join('')).toContain('const a = 1');
    });

    it('includes the image fallback text in font analysis', () => {
        const { needs, texts } = analyzeText('![example](https://example.com/a.png)');
        expect(texts.body.join('')).toContain('[图片：example]');
        expect(needs.hasCJK).toBe(true);
    });
});

describe('math block parsing', () => {
    it('extracts a standalone $$ block', () => {
        const { math } = analyzeText('before\n\n$$\na + b\n$$\n\nafter');
        expect(math).toEqual(['a + b']);
    });

    it('supports single-line $$ ... $$', () => {
        const { math } = analyzeText('$$\nx^2\n$$');
        expect(math).toEqual(['x^2']);
    });

    it('does not treat dollars inside fenced code as math', () => {
        const { math, needs } = analyzeText('```\n$$\nnot math\n$$\n```');
        expect(math).toEqual([]);
        expect(needs.hasCode).toBe(true);
    });
});

describe('checkCoverage', () => {
    const latin = new Set(
        [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 =;.()']
            .map((c) => c.codePointAt(0)),
    );
    const cjkSet = new Set([...'中文名称注释用户普通文本 '].map((c) => c.codePointAt(0)));

    it('flags characters missing from the font assigned to them', () => {
        const analysis = analyzeText('hello ✓');
        const missing = checkCoverage(analysis, { body: latin, code: latin });
        expect(missing.map((item) => item.char)).toContain('✓');
    });

    it('allows CJK in code because the body font renders it', () => {
        const analysis = analyzeText('```\nconst 名称 = 1;\n```');
        const missing = checkCoverage(analysis, { body: cjkSet, code: latin });
        expect(missing).toEqual([]);
    });

    it('flags CJK in code when no CJK font is loaded', () => {
        const analysis = analyzeText('```\nconst 名称 = 1;\n```');
        const missing = checkCoverage(analysis, { body: latin, code: latin });
        expect(missing.map((item) => item.char)).toContain('名');
    });

    it('applies the same rule to inline code', () => {
        const analysis = analyzeText('普通 `用户名称` 文本');
        expect(checkCoverage(analysis, { body: cjkSet, code: latin })).toEqual([]);
        const missing = checkCoverage(analysis, { body: latin, code: latin });
        expect(missing.map((item) => item.char)).toContain('用');
    });

    it('flags the image fallback when no CJK font is loaded', () => {
        const analysis = analyzeText('![example](https://example.com/a.png)');
        const missing = checkCoverage(analysis, { body: latin, code: latin });
        expect(missing.map((item) => item.char)).toContain('图');
    });
});

describe('buildCodeBlock', () => {
    it('emits one row per logical line with correct numbers', () => {
        const node = buildCodeBlock('a\nb\nc');
        expect(node.table.body).toHaveLength(3);
        expect(node.table.body[0][0].text.trim()).toBe('1');
        expect(node.table.body[2][0].text.trim()).toBe('3');
    });

    it('keeps indentation and blank lines', () => {
        const node = buildCodeBlock('  indented\n\nend');
        expect(node.table.body[0][1].text[0].text).toBe('  indented');
        expect(node.table.body[1][1].text[0].text).toBe(' ');
    });

    it('splits CJK runs to the body font style', () => {
        const node = buildCodeBlock('const 名称 = 1');
        const runs = node.table.body[0][1].text;
        const styles = runs.map((run) => run.style);
        expect(styles).toContain('codeBlock');
        expect(styles).toContain('codeCJK');
    });

    it('handles empty input without throwing', () => {
        expect(() => buildCodeBlock('')).not.toThrow();
    });

    it('keeps 160 code lines complete, ordered and uniquely numbered', () => {
        const code = Array.from({ length: 160 }, (_, index) => `line ${index + 1}`).join('\n');
        const node = buildCodeBlock(code);
        expect(node.table.body).toHaveLength(160);
        const numbers = node.table.body.map((row) => row[0].text.trim());
        expect(numbers).toEqual(Array.from({ length: 160 }, (_, index) => String(index + 1)));
    });
});

describe('codeRuns', () => {
    it('splits inline code into monospace and CJK runs', () => {
        const runs = codeRuns('const 名称 = 1', 'inlineCode', 'inlineCodeCJK');
        const styles = runs.map((run) => run.style);
        expect(styles).toContain('inlineCode');
        expect(styles).toContain('inlineCodeCJK');
    });
});

describe('buildDocument', () => {
    const options = { mathMap: new Map(), warnings: [] };

    it('marks headings for orphan control', () => {
        const nodes = buildDocument(parseMarkdown('# Title'), options);
        expect(nodes[0].style).toBe('h1');
        expect(nodes[0].headlineLevel).toBe(1);
    });

    it('builds nested lists', () => {
        const nodes = buildDocument(parseMarkdown('- a\n  - b'), options);
        const list = nodes[0];
        expect(Array.isArray(list.ul)).toBe(true);
        expect(JSON.stringify(list)).toContain('ul');
    });

    it('styles list item paragraphs', () => {
        const nodes = buildDocument(parseMarkdown('- a'), options);
        expect(nodes[0].ul[0][0].style).toBe('listItem');
    });

    it('keeps ordered list start values', () => {
        const nodes = buildDocument(parseMarkdown('5. Fifth\n6. Sixth'), options);
        expect(nodes[0].ol).toBeDefined();
        expect(nodes[0].start).toBe(5);
    });

    it('does not set start for a normal ordered list', () => {
        const nodes = buildDocument(parseMarkdown('1. a\n2. b'), options);
        expect(nodes[0].start).toBeUndefined();
    });

    it('preserves headings, tables and formulas inside list items', () => {
        const mathOptions = {
            mathMap: new Map([['x^2 + 12345', { svg: '<svg width="1" height="1"></svg>' }]]),
            warnings: [],
        };
        const markdown = [
            '- parent',
            '',
            '  ## CHILD_HEADING',
            '',
            '  $$',
            '  x^2 + 12345',
            '  $$',
            '',
            '  | ColA | ColB |',
            '  | --- | --- |',
            '  | CELL_ONE | CELL_TWO |',
            '',
            '  after nested',
            '',
            'TAIL_MARKER',
        ].join('\n');
        const nodes = buildDocument(parseMarkdown(markdown), mathOptions);
        const json = JSON.stringify(nodes);
        expect(json).toContain('CHILD_HEADING');
        expect(json).toContain('<svg');
        expect(json).toContain('CELL_ONE');
        expect(json).toContain('after nested');
        expect(json).toContain('TAIL_MARKER');
    });

    it('builds tables with header rows', () => {
        const nodes = buildDocument(parseMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |'), options);
        expect(nodes[0].table.headerRows).toBe(1);
        expect(nodes[0].table.body).toHaveLength(2);
    });

    it('renders images as readable placeholder text', () => {
        const nodes = buildDocument(parseMarkdown('![example](https://example.com/a.png)'), options);
        expect(JSON.stringify(nodes)).toContain('[图片：example]');
    });

    it('falls back to visible source when a formula fails', () => {
        const warnings = [];
        const nodes = buildDocument(
            parseMarkdown('$$\nx+1\n$$'),
            { mathMap: new Map([['x+1', { error: 'boom' }]]), warnings },
        );
        expect(nodes[0].text).toContain('x+1');
        expect(warnings).toHaveLength(1);
    });

    it('renders a formula as SVG when available', () => {
        const nodes = buildDocument(
            parseMarkdown('$$\nx+1\n$$'),
            { mathMap: new Map([['x+1', { svg: '<svg width="10" height="10"></svg>' }]]), warnings: [] },
        );
        expect(nodes[0].svg).toContain('<svg');
    });
});

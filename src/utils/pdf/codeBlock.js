import hljs from 'highlight.js/lib/common';

const CODE_BG = '#f6f8fa';
const CJK_RE = /[\u2e80-\u303f\u3040-\u30ff\u31c0-\u31ef\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef\u3000-\u303f]/;

const DEFAULT_SYNTAX = {
    base08: '#a91b2c',
    base09: '#0550ae',
    base0A: '#8250df',
    base0B: '#116329',
    base0D: '#0550ae',
    base0E: '#8250df',
};

const TOKEN_COLORS = {
    comment: 'comment', quote: 'comment', doctag: 'comment',
    keyword: 'base0E', 'selector-tag': 'base0E', meta: 'base0E',
    string: 'base0B', regexp: 'base0B', addition: 'base0B',
    number: 'base09', literal: 'base09', attr: 'base09',
    title: 'base0D', section: 'base0D',
    type: 'base0A', built_in: 'base0A',
    variable: 'base08', name: 'base08', deletion: 'base08',
};

function decodeHighlightedText(text) {
    return text.replace(/&#x27;|&quot;|&lt;|&gt;|&amp;/g, (entity) => ({
        '&#x27;': "'", '&quot;': '"', '&lt;': '<', '&gt;': '>', '&amp;': '&',
    })[entity]);
}

function highlightedCodeLines(code, language, colors) {
    if (!language || !hljs.getLanguage(language)) return null;
    let html;
    try {
        html = hljs.highlight(code, { language, ignoreIllegals: true }).value;
    } catch {
        return null;
    }

    const palette = colors?.syntax || DEFAULT_SYNTAX;
    const comment = colors?.syntaxComment || '#6e7781';
    const lines = [[]];
    const colorStack = [null];
    for (const match of html.matchAll(/<span class="([^"]+)">|<\/span>|[^<]+/g)) {
        if (match[1]) {
            const roles = [...match[1].matchAll(/hljs-([\w-]+)/g)].map((item) => item[1]);
            const role = roles.map((item) => TOKEN_COLORS[item]).find(Boolean);
            colorStack.push(role === 'comment' ? comment : palette[role] || colorStack.at(-1));
        } else if (match[0] === '</span>') {
            colorStack.pop();
        } else {
            const color = colorStack.at(-1);
            const parts = decodeHighlightedText(match[0]).split('\n');
            parts.forEach((part, index) => {
                if (index) lines.push([]);
                if (part) lines.at(-1).push(...codeRuns(part).map((run) => color ? { ...run, color } : run));
            });
        }
    }
    if (lines.map((line) => line.map((run) => run.text).join('')).join('\n') !== code) return null;
    return lines.map((line) => line.length ? line : codeRuns(''));
}

function codeLayout(background = CODE_BG) {
    return {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: (index) => (index === 0 ? 10 : 6),
        paddingRight: () => 10,
        paddingTop: () => 0.5,
        paddingBottom: () => 0.5,
        fillColor: () => background,
    };
}

// Code is monospace, but a monospace font has no CJK glyphs. Split a string
// into runs so Chinese renders with the body font instead of empty boxes.
// Shared by fenced code blocks and inline code.
export function codeRuns(text, monoStyle = 'codeBlock', cjkStyle = 'codeCJK') {
    const line = String(text ?? '');
    if (line === '') return [{ text: ' ', style: monoStyle }];

    const runs = [];
    let buffer = '';
    let bufferIsCJK = CJK_RE.test(line[0]);

    const flush = () => {
        if (!buffer) return;
        runs.push(bufferIsCJK
            ? { text: buffer, style: cjkStyle }
            : { text: buffer, style: monoStyle });
        buffer = '';
    };

    for (const char of line) {
        const isCJK = CJK_RE.test(char);
        if (isCJK !== bufferIsCJK) {
            flush();
            bufferIsCJK = isCJK;
        }
        buffer += char;
    }
    flush();
    return runs;
}

/**
 * Turn a fenced code block into a table: one logical line per row so the line
 * number never repeats when a long line wraps, and rows can flow across pages.
 */
export function buildCodeBlock(code, background = CODE_BG, { language = '', colors = null } = {}) {
    const normalized = String(code ?? '').replace(/\r\n?/g, '\n').replace(/\n$/, '');
    const lines = normalized.length ? normalized.split('\n') : [''];
    const highlighted = highlightedCodeLines(normalized, language, colors);
    const digits = String(lines.length).length;

    const body = lines.map((line, index) => [
        {
            text: String(index + 1).padStart(digits, ' '),
            style: 'codeLineNumber',
        },
        {
            text: highlighted?.[index] || codeRuns(line),
        },
    ]);

    return {
        table: {
            headerRows: 0,
            dontBreakRows: false,
            widths: [digits * 5 + 14, '*'],
            body,
        },
        layout: codeLayout(background),
        margin: [0, 2, 0, 12],
    };
}

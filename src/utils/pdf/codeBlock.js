const CODE_BG = '#f6f8fa';
const CJK_RE = /[\u2e80-\u303f\u3040-\u30ff\u31c0-\u31ef\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef\u3000-\u303f]/;

function codeLayout() {
    return {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: (index) => (index === 0 ? 10 : 6),
        paddingRight: () => 10,
        paddingTop: () => 0.5,
        paddingBottom: () => 0.5,
        fillColor: () => CODE_BG,
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
export function buildCodeBlock(code) {
    const normalized = String(code ?? '').replace(/\r\n?/g, '\n').replace(/\n$/, '');
    const lines = normalized.length ? normalized.split('\n') : [''];
    const digits = String(lines.length).length;

    const body = lines.map((line, index) => [
        {
            text: String(index + 1).padStart(digits, ' '),
            style: 'codeLineNumber',
        },
        {
            text: codeRuns(line),
        },
    ]);

    return {
        table: {
            headerRows: 0,
            dontBreakRows: false,
            widths: [digits * 5 + 14, '*'],
            body,
        },
        layout: codeLayout(),
        margin: [0, 2, 0, 12],
    };
}

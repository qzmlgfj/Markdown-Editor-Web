// Deliberately bounded inline TeX: keep text flowing and searchable in pdfmake.
const symbols = {
    TeX: 'TeX', LaTeX: 'LaTeX', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ',
    epsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', sigma: 'σ',
    phi: 'φ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω',
    times: '×', cdot: '⋅', pm: '±', le: '≤', leq: '≤', ge: '≥', geq: '≥',
    ne: '≠', neq: '≠', approx: '≈', infty: '∞', to: '→', rightarrow: '→',
};

export const MATH_FONTS = { regular: 'PdfMath', italic: 'PdfMathItalic', logo: 'PdfTeXLogo' };

function mathText(text) {
    return [...text].map(char => ({
        text: char,
        ...(/[A-Za-zα-ω]/.test(char) ? { font: MATH_FONTS.italic }
            : /[\u0020-\u007eΓΔΣΩ×⋅±≤≥≈∞→]/.test(char) ? { font: MATH_FONTS.regular } : {}),
        bold: false,
        italics: false,
    }));
}

export function simpleInlineMath(source) {
    let pos = 0;
    const runs = [];
    function atom() {
        if (pos >= source.length) throw new Error('上下标缺少内容');
        const char = source[pos++];
        if (char === '\\') {
            const name = /^[a-zA-Z]+/.exec(source.slice(pos))?.[0];
            if (!name || !Object.hasOwn(symbols, name)) throw new Error(`暂不支持命令 \\${name || source[pos] || ''}`);
            pos += name.length;
            if (name === 'TeX' || name === 'LaTeX') {
                return [{ text: name, font: MATH_FONTS.logo, bold: false, italics: false }];
            }
            return mathText(symbols[name]);
        }
        if ('{}^_$'.includes(char)) throw new Error('暂不支持嵌套分组或上下标');
        return mathText(char);
    }
    try {
        while (pos < source.length) {
            const marker = source[pos];
            if (marker === '^' || marker === '_') {
                pos++;
                const parts = [];
                if (source[pos] === '{') {
                    pos++;
                    while (pos < source.length && source[pos] !== '}') parts.push(...atom());
                    if (source[pos++] !== '}' || !parts.length) throw new Error('上下标分组不完整');
                } else parts.push(...atom());
                if (!runs.length) throw new Error('上下标缺少主体');
                for (const part of parts) runs.push({ ...part, [marker === '^' ? 'sup' : 'sub']: true });
            } else runs.push(...atom());
        }
        return { runs };
    } catch (error) {
        return { runs: [{ text: `$${source}$` }], error: error.message };
    }
}

export function inlineMathRule(state, silent) {
    const start = state.pos;
    if (state.src[start] !== '$' || state.src[start + 1] === '$' || /\s/.test(state.src[start + 1] || ' ')) return false;
    let end = start + 1;
    while (end < state.posMax) {
        if (state.src[end] === '\n') return false;
        if (state.src[end] === '\\') { end += 2; continue; }
        if (state.src[end] === '$') break;
        end++;
    }
    if (end >= state.posMax || /\s/.test(state.src[end - 1]) || /\d/.test(state.src[end + 1] || '')) return false;
    if (!silent) {
        const token = state.push('math_inline', 'math', 0);
        token.content = state.src.slice(start + 1, end);
    }
    state.pos = end + 1;
    return true;
}

import { HTML_TAG_RE } from 'markdown-it/lib/common/html_re.mjs';

const formats = { u: 'underline', sup: 'sup', sub: 'sub', strong: 'bold', b: 'bold', em: 'italics', i: 'italics', del: 'strike', s: 'strike' };

// Parse tags as data only: never enable arbitrary HTML rendering or execute it.
export function htmlInlineRule(state, silent) {
    if (state.src[state.pos] !== '<') return false;
    const match = state.src.slice(state.pos).match(HTML_TAG_RE);
    if (!match) return false;
    if (!silent) {
        const token = state.push('pdf_html', '', 0);
        token.content = match[0];
    }
    state.pos += match[0].length;
    return true;
}

export function resolveHtmlTags(children) {
    const stack = [];
    for (const token of children) {
        if (token.type !== 'pdf_html') continue;
        const match = /^<(\/?)([a-z]+)\s*(\/?)>$/i.exec(token.content);
        if (!match) continue; // Attributes and arbitrary tags stay visible with a warning.
        const [, closing, rawName, selfClosing] = match;
        const name = rawName.toLowerCase();
        if (name === 'br' && !closing) { token.type = 'hardbreak'; continue; }
        if (!Object.hasOwn(formats, name) || selfClosing) continue;
        if (!closing) stack.push({ token, name });
        else if (stack.at(-1)?.name === name) {
            const opening = stack.pop().token;
            opening.type = 'pdf_html_open';
            opening.format = formats[name];
            token.type = 'pdf_html_close';
            token.format = formats[name];
        } else {
            // Do not let a malformed tag apply styling to the rest of the paragraph.
            stack.length = 0;
        }
    }
}

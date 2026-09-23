import palettes from './base46.json';

export const base46Themes = palettes;

export function getBase46Theme(id) {
    return palettes.find((theme) => theme.id === id) || null;
}

function mixHex(foreground, background, amount) {
    const channels = [1, 3, 5].map((offset) => {
        const front = Number.parseInt(foreground.slice(offset, offset + 2), 16);
        const back = Number.parseInt(background.slice(offset, offset + 2), 16);
        return Math.round(front * amount + back * (1 - amount)).toString(16).padStart(2, '0');
    });
    return `#${channels.join('')}`;
}

function contrastRatio(foreground, background) {
    const luminance = (hex) => {
        const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
        const [red, green, blue] = channels.map((channel) => channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4);
        return red * 0.2126 + green * 0.7152 + blue * 0.0722;
    };
    const first = luminance(foreground);
    const second = luminance(background);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function readableColor(candidates, background, minimum = 4.5) {
    return candidates.find((color) => contrastRatio(color, background) >= minimum) || candidates.at(-1);
}

// Keep theme data independent of either renderer. CSS and pdfmake consume the
// same semantic colors, while their layout rules remain separate.
export function themeColors(theme) {
    if (!theme) return null;
    const ui = theme.base_30;
    const syntax = theme.base_16;
    const text = readableColor([ui.white, syntax.base05, syntax.base07], ui.black);
    const accent = readableColor([ui.blue, syntax.base0D, text], ui.black, 3);
    return {
        background: ui.black,
        surface: ui.one_bg,
        raised: ui.one_bg2,
        border: ui.line,
        text,
        muted: mixHex(text, ui.black, 0.85),
        accent,
        link: readableColor([syntax.base0D, syntax.base0E, text], ui.black),
        quote: mixHex(text, ui.black, 0.85),
        codeBackground: ui.one_bg,
        codeText: readableColor([syntax.base05, text], ui.one_bg),
        codeMuted: mixHex(text, ui.one_bg, 0.75),
        syntaxComment: mixHex(text, ui.one_bg, 0.78),
        syntax,
    };
}

export function themeCssVariables(theme) {
    const colors = themeColors(theme);
    if (!colors) return {};
    return {
        '--theme-bg': colors.background,
        '--theme-surface': colors.surface,
        '--theme-raised': colors.raised,
        '--theme-border': colors.border,
        '--theme-text': colors.text,
        '--theme-muted': colors.muted,
        '--theme-accent': colors.accent,
        '--theme-heading': colors.accent,
        '--theme-link': colors.link,
        '--theme-quote': colors.quote,
        '--theme-code-bg': colors.codeBackground,
        '--theme-code-text': colors.codeText,
        '--theme-code-muted': colors.codeMuted,
        '--theme-syntax-comment': colors.syntaxComment,
        ...Object.fromEntries(Object.entries(colors.syntax).map(([key, value]) => [`--${key}`, value])),
    };
}

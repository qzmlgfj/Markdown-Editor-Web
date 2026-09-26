import { getSessionFont } from './session';

export const chineseFonts = [
    { value: 'sans', label: '思源黑体', family: 'Document Noto Sans SC', regular: 'NotoSansSC-Regular.otf', bold: 'NotoSansSC-Bold.otf', fallback: 'sans-serif' },
    { value: 'serif', label: '思源宋体', family: 'Document Noto Serif SC', regular: 'NotoSerifSC-Regular.otf', bold: 'NotoSerifSC-Bold.otf', fallback: 'serif' },
];

export const englishFonts = [
    { value: 'sans', label: 'Noto Sans', family: 'Document Noto Sans', regular: 'NotoSans-Regular.ttf', bold: 'NotoSans-Bold.ttf', italic: 'NotoSans-Italic.ttf', boldItalic: 'NotoSans-BoldItalic.ttf' },
    { value: 'serif', label: 'Noto Serif', family: 'Document Noto Serif', regular: 'NotoSerif-Regular.ttf', bold: 'NotoSerif-Bold.ttf', italic: 'NotoSerif-Italic.ttf', boldItalic: 'NotoSerif-BoldItalic.ttf' },
    { value: 'lato', label: 'Lato', family: 'Document Lato', regular: 'Lato-Regular.ttf', bold: 'Lato-Bold.ttf', italic: 'Lato-Italic.ttf', boldItalic: 'Lato-BoldItalic.ttf' },
];

export function getDocumentFonts(selection = {}) {
    return {
        chinese: typeof selection?.chinese === 'object' && selection.chinese?.value
            ? selection.chinese
            : getSessionFont('chinese', selection?.chinese) || chineseFonts.find(font => font.value === selection?.chinese) || chineseFonts[0],
        english: typeof selection?.english === 'object' && selection.english?.value
            ? selection.english
            : getSessionFont('english', selection?.english) || englishFonts.find(font => font.value === selection?.english) || englishFonts[0],
    };
}

export function documentFontStack(selection) {
    const { chinese, english } = getDocumentFonts(selection);
    return `"${english.family}", "${chinese.family}", ${chinese.fallback}`;
}

let stylesRegistered = false;
export function registerDocumentFonts() {
    if (stylesRegistered || typeof document === 'undefined') return;
    const rules = [];
    for (const font of [...chineseFonts, ...englishFonts]) {
        for (const [face, weight, style] of [
            [font.regular, 400, 'normal'], [font.bold, 700, 'normal'],
            [font.italic, 400, 'italic'], [font.boldItalic, 700, 'italic'],
        ]) {
            if (!face) continue;
            const webFace = face.replace(/\.(otf|ttf)$/i, '.woff2');
            const url = new URL(`${import.meta.env.BASE_URL}fonts/${webFace}`, document.baseURI).href;
            rules.push(`@font-face{font-family:"${font.family}";src:url("${url}") format("woff2");font-weight:${weight};font-style:${style};font-display:swap}`);
        }
    }
    const style = document.createElement('style');
    style.textContent = rules.join('\n');
    document.head.appendChild(style);
    stylesRegistered = true;
}

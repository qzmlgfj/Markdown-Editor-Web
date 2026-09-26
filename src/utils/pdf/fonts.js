import { MATH_FONTS } from './inlineMath';
import pdfMake from 'pdfmake/build/pdfmake';
import { getDocumentFonts } from '../../fonts/options';

// Same-origin font hosting. Files live in public/fonts and are copied to the
// build output root, so they must be resolved against the deploy base URL.
const BASE_URL = import.meta.env?.BASE_URL ?? '/';
const FONT_DIR = 'fonts/';

export const FONT_FILES = {
    mathRegular: 'KaTeX_Main-Regular.ttf',
    mathItalic: 'KaTeX_Math-Italic.ttf',
    mathLogo: 'MarkdownTeXLogo.ttf',
};

export const FONT_FAMILIES = {
    cjk: 'PdfCJK',
    latin: 'PdfLatin',
    code: 'PdfCode',
};

function absoluteUrl(file) {
    const base = typeof document !== 'undefined'
        ? document.baseURI
        : 'http://localhost/';
    return new URL(`${BASE_URL}${FONT_DIR}${file}`, base).href;
}

// url -> Promise<{ characterSet: Set<number> }>
const loadedFonts = new Map();

async function loadFont(url) {
    if (!loadedFonts.has(url)) {
        const task = (async () => {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`字体加载失败：${url}（HTTP ${response.status}）`);
            }
            const bytes = new Uint8Array(await response.arrayBuffer());
            const fontkit = await import('fontkit');
            const font = fontkit.create(bytes);
            // Hand the bytes to pdfmake so it does not fetch the file again.
            pdfMake.virtualfs.writeFileSync(url, bytes);
            return { characterSet: new Set(font.characterSet) };
        })();
        task.catch(() => loadedFonts.delete(url));
        loadedFonts.set(url, task);
    }
    return loadedFonts.get(url);
}

/**
 * Pick the file for each font slot. Faces that are not used by the document
 * point back at the regular file so pdfmake does not download them.
 */
function fontRef(face) {
    return typeof face === 'string' ? absoluteUrl(face) : face;
}

function pickFace(files, needs) {
    const regular = fontRef(files.regular);
    const bold = needs.hasBold ? fontRef(files.bold || files.regular) : regular;
    const italics = needs.hasItalic ? fontRef(files.italics || files.regular) : regular;
    const bolditalics = (needs.hasBold && needs.hasItalic) ? fontRef(files.bolditalics || files.bold || files.regular) : bold;
    return { regular, bold, italics, bolditalics };
}

function fileForPdf(face, slot, family) {
    if (typeof face === 'string') return face;
    const path = `${family.value}-${slot}.${face.format}`;
    pdfMake.virtualfs.writeFileSync(path, face.bytes);
    return path;
}

async function coverageFor(face) {
    return typeof face === 'string' ? (await loadFont(face)).characterSet : face.characterSet;
}

/**
 * Load and register the PDF fonts needed for a document.
 *
 * @param {{ hasCJK: boolean, hasBold: boolean, hasItalic: boolean, hasCode: boolean }} needs
 * @returns {Promise<{ families: Record<string, string>, coverage: Record<string, Set<number>> }>}
 */
export async function prepareFonts(needs, selection, codeCJKTexts = []) {
    const fonts = {};
    const coverage = {};
    const selected = getDocumentFonts(selection);

    if (needs.hasCJK) {
        const faces = pickFace({
            regular: selected.chinese.custom ? selected.chinese.faces.regular : selected.chinese.regular,
            bold: selected.chinese.custom ? selected.chinese.faces.bold : selected.chinese.bold,
            // Bundled CJK faces do not have a separate italic face.
            italics: selected.chinese.custom ? selected.chinese.faces.italic : selected.chinese.regular,
            bolditalics: selected.chinese.custom ? selected.chinese.faces.boldItalic : selected.chinese.bold,
        }, needs);

        fonts[FONT_FAMILIES.cjk] = {
            normal: fileForPdf(faces.regular, 'regular', selected.chinese),
            bold: fileForPdf(faces.bold, 'bold', selected.chinese),
            italics: fileForPdf(faces.italics, 'italic', selected.chinese),
            bolditalics: fileForPdf(faces.bolditalics, 'boldItalic', selected.chinese),
        };

        coverage.body = await coverageFor(faces.regular);
        if (faces.bold !== faces.regular) await coverageFor(faces.bold);
    }
    {
        const faces = pickFace({
            regular: selected.english.custom ? selected.english.faces.regular : selected.english.regular,
            bold: selected.english.custom ? selected.english.faces.bold : selected.english.bold,
            italics: selected.english.custom ? selected.english.faces.italic : selected.english.italic,
            bolditalics: selected.english.custom ? selected.english.faces.boldItalic : selected.english.boldItalic,
        }, needs);

        fonts[FONT_FAMILIES.latin] = {
            normal: fileForPdf(faces.regular, 'regular', selected.english),
            bold: fileForPdf(faces.bold, 'bold', selected.english),
            italics: fileForPdf(faces.italics, 'italic', selected.english),
            bolditalics: fileForPdf(faces.bolditalics, 'boldItalic', selected.english),
        };

        const regular = await coverageFor(faces.regular);
        for (const url of new Set([faces.bold, faces.italics, faces.bolditalics])) {
            if (url !== faces.regular) await coverageFor(url);
        }
        if (!needs.hasCJK) coverage.body = regular;
        coverage.latin = regular;
        coverage.latinItalic = await coverageFor(faces.italics);
    }

    for (const [kind, family] of [['mathRegular', MATH_FONTS.regular], ['mathItalic', MATH_FONTS.italic], ['mathLogo', MATH_FONTS.logo]]) {
        if (!needs[kind]) continue;
        const url = absoluteUrl(FONT_FILES[kind]);
        fonts[family] = { normal: url, bold: url, italics: url, bolditalics: url };
        coverage[kind] = (await loadFont(url)).characterSet;
    }

    let codeCJKFamily = FONT_FAMILIES.cjk;
    // Documents without code do not load the selected code font.
    if (needs.hasCode) {
        const code = selected.code;
        const faces = pickFace({
            regular: code.custom ? code.faces.regular : code.regular,
            bold: code.custom ? code.faces.bold : code.bold,
            italics: code.custom ? code.faces.italic : code.italic,
            bolditalics: code.custom ? code.faces.boldItalic : code.boldItalic,
        }, needs);
        fonts[FONT_FAMILIES.code] = {
            normal: fileForPdf(faces.regular, 'regular', code),
            bold: fileForPdf(faces.bold, 'bold', code),
            italics: fileForPdf(faces.italics, 'italic', code),
            bolditalics: fileForPdf(faces.bolditalics, 'boldItalic', code),
        };
        coverage.code = await coverageFor(faces.regular);
        if (codeCJKTexts.length && codeCJKTexts.every(segment => [...segment].every(char => coverage.code.has(char.codePointAt(0))))) {
            codeCJKFamily = FONT_FAMILIES.code;
        }
    }

    pdfMake.setFonts(fonts);

    return {
        families: {
            body: needs.hasCJK ? FONT_FAMILIES.cjk : FONT_FAMILIES.latin,
            code: FONT_FAMILIES.code,
            codeCJK: codeCJKFamily,
        },
        coverage: { ...coverage, codeCJK: codeCJKFamily === FONT_FAMILIES.code ? coverage.code : coverage.body },
    };
}

export { pdfMake };

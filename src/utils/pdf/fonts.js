import pdfMake from 'pdfmake/build/pdfmake';

// Same-origin font hosting. Files live in public/fonts and are copied to the
// build output root, so they must be resolved against the deploy base URL.
const BASE_URL = import.meta.env?.BASE_URL ?? '/';
const FONT_DIR = 'fonts/';

export const FONT_FILES = {
    cjkRegular: 'NotoSansSC-Regular.otf',
    cjkBold: 'NotoSansSC-Bold.otf',
    latinRegular: 'NotoSans-Regular.ttf',
    latinBold: 'NotoSans-Bold.ttf',
    latinItalic: 'NotoSans-Italic.ttf',
    latinBoldItalic: 'NotoSans-BoldItalic.ttf',
    monoRegular: 'JetBrainsMono-Regular.ttf',
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
function pickFace(files, needs) {
    const regular = absoluteUrl(files.regular);
    const bold = needs.hasBold ? absoluteUrl(files.bold) : regular;
    const italics = needs.hasItalic ? absoluteUrl(files.italics) : regular;
    const bolditalics = (needs.hasBold && needs.hasItalic) ? absoluteUrl(files.bolditalics) : bold;
    return { regular, bold, italics, bolditalics };
}

/**
 * Load and register the PDF fonts needed for a document.
 *
 * @param {{ hasCJK: boolean, hasBold: boolean, hasItalic: boolean, hasCode: boolean }} needs
 * @returns {Promise<{ families: Record<string, string>, coverage: Record<string, Set<number>> }>}
 */
export async function prepareFonts(needs) {
    const fonts = {};
    const coverage = {};

    if (needs.hasCJK) {
        const faces = pickFace({
            regular: FONT_FILES.cjkRegular,
            bold: FONT_FILES.cjkBold,
            // Noto Sans SC ships no italic face.
            italics: FONT_FILES.cjkRegular,
            bolditalics: FONT_FILES.cjkBold,
        }, needs);

        fonts[FONT_FAMILIES.cjk] = {
            normal: faces.regular,
            bold: faces.bold,
            italics: faces.italics,
            bolditalics: faces.bolditalics,
        };

        const regular = await loadFont(faces.regular);
        if (faces.bold !== faces.regular) await loadFont(faces.bold);
        coverage.body = regular.characterSet;
    } else {
        const faces = pickFace({
            regular: FONT_FILES.latinRegular,
            bold: FONT_FILES.latinBold,
            italics: FONT_FILES.latinItalic,
            bolditalics: FONT_FILES.latinBoldItalic,
        }, needs);

        fonts[FONT_FAMILIES.latin] = {
            normal: faces.regular,
            bold: faces.bold,
            italics: faces.italics,
            bolditalics: faces.bolditalics,
        };

        const regular = await loadFont(faces.regular);
        for (const url of new Set([faces.bold, faces.italics, faces.bolditalics])) {
            if (url !== faces.regular) await loadFont(url);
        }
        coverage.body = regular.characterSet;
    }

    // Only register the monospace family when the document actually uses code,
    // so documents without code never touch the extra font.
    if (needs.hasCode) {
        const monoUrl = absoluteUrl(FONT_FILES.monoRegular);
        const mono = await loadFont(monoUrl);
        fonts[FONT_FAMILIES.code] = {
            normal: monoUrl,
            bold: monoUrl,
            italics: monoUrl,
            bolditalics: monoUrl,
        };
        coverage.code = mono.characterSet;
    }

    pdfMake.setFonts(fonts);

    return {
        families: {
            body: needs.hasCJK ? FONT_FAMILIES.cjk : FONT_FAMILIES.latin,
            code: FONT_FAMILIES.code,
        },
        coverage,
    };
}

export { pdfMake };

import { simpleInlineMath } from './inlineMath';
import { prepareFonts, pdfMake } from './fonts';
import {
    parseMarkdown,
    analyze,
    checkCoverage,
    buildDocument,
} from './markdownToDocument';
import { renderMath } from './math';
import { prepareImages } from './images';
import { createTheme } from './theme';
import { themeColors } from '../../themes/base46';

/**
 * Convert the given Markdown snapshot into a PDF Blob for the browser preview.
 *
 * The snapshot is taken by the caller; this function never reads the DOM,
 * scroll position, editor folding state or the web themes.
 *
 * @param {string} markdown
 * @param {{ palette?: object, fonts?: object, confirmWarnings?: (warnings: string[]) => Promise<boolean> }} [options]
 * @returns {Promise<{ unsupported: string[], blob?: Blob, cancelled?: boolean }>}
 */
export async function exportMarkdownToPdf(markdown, options = {}) {
    const text = String(markdown ?? '');
    if (!text.trim()) {
        throw new Error('文档为空，没有可导出的内容。');
    }

    let tokens = parseMarkdown(text);
    const imageMap = await prepareImages(tokens);
    const analysis = analyze(tokens, imageMap);

    const { families, coverage } = await prepareFonts(analysis.needs, options.fonts, analysis.texts.codeCJK);

    const warnings = [];
    const missing = checkCoverage(analysis, coverage);
    if (missing.length) {
        const lines = text.split('\n');
        for (const { char } of missing) {
            const locations = lines.flatMap((value, index) => value.includes(char) ? [index + 1] : []);
            for (const token of tokens) {
                for (const child of token.children || []) {
                    if (child.type === 'math_inline' && simpleInlineMath(child.content).runs.some(run => run.text.includes(char))) {
                        if (!locations.includes(child.sourceLine)) locations.push(child.sourceLine);
                    }
                }
            }
            locations.sort((a, b) => a - b);
            warnings.push(`${locations.length ? `第 ${locations.join('、')} 行` : '转换后的文本'}：字体缺少 ${char}（U+${char.codePointAt(0).toString(16).toUpperCase()}），预览中以 ? 替代。`);
        }
        const missingChars = new Set(missing.map(({ char }) => char));
        const imageSources = tokens.flatMap(token => (token.children || []).filter(child => child.type === 'image').map(child => child.attrGet('src')));
        tokens = parseMarkdown([...text].map(char => missingChars.has(char) ? '?' : char).join(''));
        // Converted symbols (e.g. \alpha) also need a safe fallback.
        for (const token of tokens) {
            for (const child of token.children || []) {
                if (child.type === 'image') child.attrSet('src', imageSources.shift());
                if (child.type === 'math_inline') {
                    const converted = simpleInlineMath(child.content);
                    if (converted.runs.some(run => [...run.text].some(char => missingChars.has(char)))) {
                        child.type = 'text';
                        child.content = converted.runs.map(run => [...run.text].map(char => missingChars.has(char) ? '?' : char).join('')).join('');
                    }
                }
            }
        }
    }

    const colors = themeColors(options.palette);
    const theme = createTheme(families, options.palette);
    const mathMap = await renderMath(analysis.math, colors?.text || '#1f2328');

    const docDefinition = {
        ...theme,
        content: buildDocument(tokens, { mathMap, imageMap, warnings, colors }),
        // Generic orphan control: never leave a section heading alone at the
        // bottom of a page. Matches on our own headline level, not on text.
        pageBreakBefore: (currentNode, nodeContainer) => {
            if (!currentNode.headlineLevel || currentNode.headlineLevel > 3) {
                return false;
            }
            try {
                return nodeContainer.getFollowingNodesOnPage().length === 0;
            } catch {
                return false;
            }
        },
    };

    const pdf = pdfMake.createPdf(docDefinition);
    const blob = await pdf.getBlob();
    const unsupported = [...new Set(warnings)];
    if (unsupported.length && options.confirmWarnings && !await options.confirmWarnings(unsupported)) {
        return { unsupported, cancelled: true };
    }
    return { unsupported, blob };
}

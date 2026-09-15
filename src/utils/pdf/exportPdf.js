import { prepareFonts, pdfMake } from './fonts';
import {
    parseMarkdown,
    analyze,
    checkCoverage,
    buildDocument,
} from './markdownToDocument';
import { renderMath } from './math';
import { createTheme } from './theme';

function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Convert the given Markdown snapshot into a PDF and download it.
 *
 * The snapshot is taken by the caller; this function never reads the DOM,
 * scroll position, editor folding state or the web themes.
 *
 * @param {string} markdown
 * @param {{ fileName?: string, confirmWarnings?: (warnings: string[]) => Promise<boolean> }} [options]
 * @returns {Promise<{ unsupported: string[] }>}
 */
export async function exportMarkdownToPdf(markdown, options = {}) {
    const fileName = options.fileName || 'Markdown.pdf';
    const text = String(markdown ?? '');
    if (!text.trim()) {
        throw new Error('文档为空，没有可导出的内容。');
    }

    const tokens = parseMarkdown(text);
    const analysis = analyze(tokens);

    const { families, coverage } = await prepareFonts(analysis.needs);

    const missing = checkCoverage(analysis, coverage);
    if (missing.length) {
        const lines = text.split('\n');
        const details = missing.map(({ char }) => {
            const line = lines.findIndex((value) => value.includes(char));
            return `${char}（U+${char.codePointAt(0).toString(16).toUpperCase()}）${line >= 0 ? `：第 ${line + 1} 行` : '：转换后的文本'}`;
        });
        throw new Error(`当前 PDF 字体缺少 ${missing.length} 个字符，未生成 PDF。请调整以下内容后重试：\n${details.join('\n')}`);
    }

    const theme = createTheme(families);
    const warnings = [];
    const mathMap = await renderMath(analysis.math);

    const docDefinition = {
        ...theme,
        content: buildDocument(tokens, { mathMap, warnings }),
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
    const unsupported = [...new Set([...analysis.unsupported, ...warnings])];
    if (unsupported.length && options.confirmWarnings && !await options.confirmWarnings(unsupported)) {
        return { unsupported, cancelled: true };
    }
    downloadBlob(blob, fileName);

    return { unsupported: [...analysis.unsupported, ...warnings] };
}

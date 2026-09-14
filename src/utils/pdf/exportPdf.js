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
 * @param {{ fileName?: string }} [options]
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
        const sample = missing.slice(0, 20).map((item) => item.char).join(' ');
        const suffix = missing.length > 20 ? ' …' : '';
        throw new Error(
            `当前 PDF 字体缺少 ${missing.length} 个字符：${sample}${suffix}。请移除这些字符后重试。`,
        );
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
    downloadBlob(blob, fileName);

    return { unsupported: [...analysis.unsupported, ...warnings] };
}

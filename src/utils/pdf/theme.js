import { themeColors } from '../../themes/base46';

// The paper preset remains independent. The caller supplies the selected
// Base46 palette for light themes or when dark output is explicitly enabled.
export function createTheme(families, palette = null) {
    const colors = themeColors(palette);
    const heading = colors?.accent || '#1f2328';
    return {
        pageSize: 'A4',
        pageMargins: [48, 44, 48, 44],
        ...(colors ? { background: (_page, size) => ({
            canvas: [{ type: 'rect', x: 0, y: 0, w: size.width, h: size.height, color: colors.background }],
        }) } : {}),
        info: {
            title: 'Markdown Export',
            creator: 'Markdown Editor Web',
            producer: 'pdfmake',
        },
        defaultStyle: {
            font: families.body,
            fontSize: 10.5,
            lineHeight: 1.5,
            color: colors?.text || '#1f2328',
        },
        styles: {
            title: {
                fontSize: 20,
                bold: true,
                color: heading,
                margin: [0, 6, 0, 12],
            },
            h1: { fontSize: 18, bold: true, color: heading, margin: [0, 6, 0, 8] },
            h2: { fontSize: 15, bold: true, color: heading, margin: [0, 14, 0, 7] },
            h3: { fontSize: 12.5, bold: true, color: heading, margin: [0, 12, 0, 6] },
            h4: { fontSize: 11.5, bold: true, color: heading, margin: [0, 10, 0, 5] },
            h5: { fontSize: 10.5, bold: true, color: heading, margin: [0, 9, 0, 4] },
            h6: { fontSize: 10.5, bold: true, color: heading, margin: [0, 9, 0, 4] },
            paragraph: { margin: [0, 0, 0, 7] },
            listItem: { margin: [0, 0, 0, 3] },
            inlineCode: {
                font: families.code,
                fontSize: 9,
                background: colors?.raised || '#f0f2f4',
                color: colors?.codeText || '#24292f',
            },
            inlineCodeCJK: {
                font: families.codeCJK || families.body,
                fontSize: 9.5,
                background: colors?.raised || '#f0f2f4',
                color: colors?.codeText || '#24292f',
            },
            codeBlock: {
                font: families.code,
                fontSize: 8.8,
                lineHeight: 1.2,
                preserveLeadingSpaces: true,
                wordBreak: 'break-all',
                color: colors?.codeText || '#24292f',
            },
            codeLineNumber: {
                font: families.code,
                fontSize: 8,
                color: colors?.codeMuted || '#8c959f',
                alignment: 'right',
            },
            codeCJK: {
                font: families.codeCJK || families.body,
                fontSize: 8.8,
                lineHeight: 1.2,
                preserveLeadingSpaces: true,
                color: colors?.codeText || '#24292f',
            },
            tableHeader: {
                bold: true,
                fontSize: 10,
                color: colors?.text || '#1f2328',
                fillColor: colors?.raised || '#eef1f4',
            },
            tableCell: {
                fontSize: 10,
            },
            blockquoteText: {
                color: colors?.quote || '#3d444d',
                italics: false,
            },
            link: {
                color: colors?.link || '#1f2328',
                decoration: 'underline',
            },
            caption: {
                fontSize: 9,
                color: colors?.muted || '#6e7781',
                italics: true,
            },
        },
    };
}

export const PAGE_CONTENT_WIDTH = 595.28 - 48 - 48;

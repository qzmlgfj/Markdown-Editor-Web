// Single, fixed PDF style. Independent from the web render/code themes and from
// the light/dark toggle on purpose: the PDF is its own document format.
export function createTheme(families) {
    return {
        pageSize: 'A4',
        pageMargins: [48, 44, 48, 44],
        info: {
            title: 'Markdown Export',
            creator: 'Markdown Editor Web',
            producer: 'pdfmake',
        },
        defaultStyle: {
            font: families.body,
            fontSize: 10.5,
            lineHeight: 1.5,
            color: '#1f2328',
        },
        styles: {
            title: {
                fontSize: 20,
                bold: true,
                color: '#111418',
                margin: [0, 6, 0, 12],
            },
            h1: { fontSize: 18, bold: true, color: '#111418', margin: [0, 6, 0, 8] },
            h2: { fontSize: 15, bold: true, color: '#0f6f83', margin: [0, 14, 0, 7] },
            h3: { fontSize: 12.5, bold: true, color: '#0f6f83', margin: [0, 12, 0, 6] },
            h4: { fontSize: 11.5, bold: true, color: '#1f2328', margin: [0, 10, 0, 5] },
            h5: { fontSize: 10.5, bold: true, color: '#1f2328', margin: [0, 9, 0, 4] },
            h6: { fontSize: 10.5, bold: true, color: '#57606a', margin: [0, 9, 0, 4] },
            paragraph: { margin: [0, 0, 0, 7] },
            listItem: { margin: [0, 0, 0, 3] },
            inlineCode: {
                font: families.code,
                fontSize: 9,
                background: '#f0f2f4',
                color: '#24292f',
            },
            inlineCodeCJK: {
                font: families.body,
                fontSize: 9.5,
                background: '#f0f2f4',
                color: '#24292f',
            },
            codeBlock: {
                font: families.code,
                fontSize: 8.8,
                lineHeight: 1.2,
                preserveLeadingSpaces: true,
                wordBreak: 'break-all',
                color: '#24292f',
            },
            codeLineNumber: {
                font: families.code,
                fontSize: 8,
                color: '#8c959f',
                alignment: 'right',
            },
            codeCJK: {
                font: families.body,
                fontSize: 8.8,
                lineHeight: 1.2,
                preserveLeadingSpaces: true,
                color: '#24292f',
            },
            tableHeader: {
                bold: true,
                fontSize: 10,
                color: '#1f2328',
                fillColor: '#eef1f4',
            },
            tableCell: {
                fontSize: 10,
            },
            blockquoteText: {
                color: '#3d444d',
                italics: false,
            },
            link: {
                color: '#0969da',
                decoration: 'underline',
            },
            caption: {
                fontSize: 9,
                color: '#6e7781',
                italics: true,
            },
        },
    };
}

export const PAGE_CONTENT_WIDTH = 595.28 - 48 - 48;

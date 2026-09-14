import MarkdownIt from 'markdown-it';
import { buildCodeBlock, codeRuns } from './codeBlock';
import { PAGE_CONTENT_WIDTH } from './theme';

const CJK_RE = /[\u2e80-\u303f\u3040-\u30ff\u31c0-\u31ef\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/;

function createParser() {
    const md = new MarkdownIt({
        html: false,
        linkify: false,
        typographer: false,
        breaks: false,
    });
    md.block.ruler.before('fence', 'math_block', mathBlockRule, {
        alt: ['paragraph', 'reference', 'blockquote', 'list'],
    });
    return md;
}

// Standalone `$$ ... $$` blocks only. Fenced code is consumed by the fence
// rule first, so `$` inside code is never treated as math.
function mathBlockRule(state, startLine, endLine, silent) {
    const lineStart = state.bMarks[startLine] + state.tShift[startLine];
    const lineEnd = state.eMarks[startLine];
    const firstLine = state.src.slice(lineStart, lineEnd);

    if (!firstLine.startsWith('$$')) return false;
    if (silent) return true;

    const rest = firstLine.slice(2);
    let content;
    let closed = false;
    let nextLine = startLine;

    const sameLineClose = rest.indexOf('$$');
    if (sameLineClose >= 0) {
        content = rest.slice(0, sameLineClose);
        closed = true;
    } else {
        content = rest;
        while (++nextLine < endLine) {
            const start = state.bMarks[nextLine] + state.tShift[nextLine];
            const end = state.eMarks[nextLine];
            const line = state.src.slice(start, end);
            const close = line.indexOf('$$');
            if (close >= 0) {
                content += `\n${line.slice(0, close)}`;
                closed = true;
                break;
            }
            content += `\n${line}`;
        }
    }

    if (!closed) return false;

    const token = state.push('math_block', 'math', 0);
    token.block = true;
    token.content = content.trim();
    token.map = [startLine, nextLine + 1];
    state.line = nextLine + 1;
    return true;
}

export function parseMarkdown(text) {
    return createParser().parse(String(text ?? ''), {});
}

// Single source of truth for the image fallback text, so font analysis and the
// rendered document always agree on what will actually appear.
function imagePlaceholder(token) {
    const src = token.attrGet ? token.attrGet('src') || '' : '';
    return `[图片：${token.content || src}]`;
}

// Collect code text by the font that will actually render it: CJK characters
// go to the body font, everything else to the monospace font.
function collectCodeText(text, needs, texts) {
    for (const char of String(text ?? '')) {
        if (CJK_RE.test(char)) {
            needs.hasCJK = true;
            texts.codeCJK.push(char);
        } else {
            texts.codeMono.push(char);
        }
    }
}

function classifyInline(children, needs, texts, unsupported) {
    const walk = (tokens) => {
        for (const token of tokens) {
            switch (token.type) {
                case 'text': {
                    texts.body.push(token.content);
                    if (CJK_RE.test(token.content)) needs.hasCJK = true;
                    break;
                }
                case 'code_inline':
                    needs.hasCode = true;
                    collectCodeText(token.content, needs, texts);
                    break;
                case 'strong_open':
                    needs.hasBold = true;
                    break;
                case 'em_open':
                    needs.hasItalic = true;
                    break;
                case 'image': {
                    unsupported.add('图片');
                    const placeholder = imagePlaceholder(token);
                    texts.body.push(placeholder);
                    if (CJK_RE.test(placeholder)) needs.hasCJK = true;
                    break;
                }
                case 'html_inline':
                    unsupported.add('行内 HTML');
                    break;
                default:
                    break;
            }
        }
    };
    walk(children);
}

/**
 * First pass over the tokens: decide which fonts are required and collect all
 * text runs, grouped by the font that will render them, so glyph coverage can
 * be checked after the fonts are loaded.
 */
export function analyze(tokens) {
    const needs = { hasCJK: false, hasBold: false, hasItalic: false, hasCode: false };
    const texts = { body: [], codeMono: [], codeCJK: [] };
    const math = [];
    const unsupported = new Set();

    for (const token of tokens) {
        if (token.type === 'heading_open') {
            needs.hasBold = true;
        } else if (token.type === 'fence' || token.type === 'code_block') {
            needs.hasCode = true;
            collectCodeText(token.content, needs, texts);
        } else if (token.type === 'math_block') {
            math.push(token.content);
        } else if (token.type === 'html_block') {
            unsupported.add('HTML 块');
        } else if (token.type === 'inline' && token.children) {
            classifyInline(token.children, needs, texts, unsupported);
        }
    }

    return { needs, texts, math, unsupported: [...unsupported] };
}

/**
 * Report characters that the font actually assigned to them cannot render.
 * This mirrors the run-level font assignment, so a passing check means the PDF
 * will not contain a missing glyph.
 */
export function checkCoverage(analysis, coverage) {
    const missing = new Map();

    const check = (segments, characterSet) => {
        if (!characterSet) return;
        for (const segment of segments) {
            for (const char of segment) {
                const cp = char.codePointAt(0);
                if (cp === 0x0a || cp === 0x0d || cp === 0x09) continue;
                if (characterSet.has(cp)) continue;
                if (!missing.has(cp)) {
                    missing.set(cp, { char });
                }
            }
        }
    };

    check(analysis.texts.body, coverage.body);
    check(analysis.texts.codeMono, coverage.code);
    check(analysis.texts.codeCJK, coverage.body);

    return [...missing.values()];
}

function alignmentFromStyle(styleAttr) {
    if (!styleAttr) return null;
    const match = /text-align:\s*(left|center|right)/.exec(styleAttr);
    return match ? match[1] : null;
}

function buildInlineRuns(children, state) {
    const runs = [];
    const ctx = { bold: 0, italics: 0, strike: 0, link: null };

    const push = (text, { code = false } = {}) => {
        if (text === '') return;
        if (code) {
            for (const run of codeRuns(text, 'inlineCode', 'inlineCodeCJK')) {
                runs.push(run);
            }
            return;
        }
        const run = { text };
        if (ctx.bold) run.bold = true;
        if (ctx.italics) run.italics = true;
        if (ctx.strike) run.decoration = 'lineThrough';
        if (ctx.link) {
            run.link = ctx.link;
            run.color = '#0969da';
            run.decoration = 'underline';
        }
        runs.push(run);
    };

    const walk = (tokens) => {
        for (const token of tokens) {
            switch (token.type) {
                case 'text':
                    push(token.content);
                    break;
                case 'code_inline':
                    push(token.content, { code: true });
                    break;
                case 'strong_open':
                    ctx.bold += 1;
                    break;
                case 'strong_close':
                    ctx.bold -= 1;
                    break;
                case 'em_open':
                    ctx.italics += 1;
                    break;
                case 'em_close':
                    ctx.italics -= 1;
                    break;
                case 's_open':
                    ctx.strike += 1;
                    break;
                case 's_close':
                    ctx.strike -= 1;
                    break;
                case 'link_open':
                    ctx.link = token.attrGet('href');
                    break;
                case 'link_close':
                    ctx.link = null;
                    break;
                case 'softbreak':
                    push(' ');
                    break;
                case 'hardbreak':
                    push('\n');
                    break;
                case 'image': {
                    push(imagePlaceholder(token));
                    break;
                }
                default:
                    if (token.children) walk(token.children);
                    break;
            }
        }
    };

    walk(children);
    void state;
    return runs;
}

function inlineOf(tokens, index) {
    const next = tokens[index + 1];
    return next && next.type === 'inline' ? next.children : [];
}

function convertBlocks(tokens, ctx) {
    const nodes = [];
    let i = 0;

    while (i < tokens.length) {
        const token = tokens[i];
        switch (token.type) {
            case 'heading_open': {
                const level = Number(token.tag.slice(1));
                nodes.push({
                    text: buildInlineRuns(inlineOf(tokens, i), ctx),
                    style: `h${Math.min(level, 6)}`,
                    headlineLevel: level,
                });
                i += 3;
                break;
            }
            case 'paragraph_open': {
                nodes.push({
                    text: buildInlineRuns(inlineOf(tokens, i), ctx),
                    style: 'paragraph',
                });
                i += 3;
                break;
            }
            case 'bullet_list_open':
            case 'ordered_list_open': {
                const ordered = token.type === 'ordered_list_open';
                const list = convertList(tokens, i, ctx, ordered);
                const node = ordered ? { ol: list.items } : { ul: list.items };
                if (ordered) {
                    const startAttr = token.attrGet('start');
                    const start = startAttr === null ? 1 : Number(startAttr);
                    if (Number.isFinite(start) && start !== 1) {
                        node.start = start;
                    }
                }
                node.margin = [0, 2, 0, 8];
                nodes.push(node);
                i = list.next;
                break;
            }
            case 'blockquote_open': {
                const inner = convertBlocksUntil(tokens, i + 1, 'blockquote_close', ctx);
                nodes.push(buildBlockquote(inner.nodes));
                i = inner.next;
                break;
            }
            case 'fence':
            case 'code_block': {
                nodes.push(buildCodeBlock(token.content));
                i += 1;
                break;
            }
            case 'math_block': {
                nodes.push(buildMathNode(token.content, ctx));
                i += 1;
                break;
            }
            case 'hr': {
                nodes.push({
                    canvas: [{
                        type: 'line',
                        x1: 0,
                        y1: 0,
                        x2: PAGE_CONTENT_WIDTH,
                        y2: 0,
                        lineWidth: 0.5,
                        lineColor: '#d0d7de',
                    }],
                    margin: [0, 6, 0, 12],
                });
                i += 1;
                break;
            }
            case 'table_open': {
                const table = convertTable(tokens, i, ctx);
                nodes.push(table.node);
                i = table.next;
                break;
            }
            case 'html_block': {
                nodes.push({
                    text: token.content.trim(),
                    style: 'paragraph',
                    preserveLeadingSpaces: true,
                });
                i += 1;
                break;
            }
            default:
                i += 1;
        }
    }

    return nodes;
}

// Take the token slice up to the matching close token, tracking nesting of the
// same container so inner blocks are not mistaken for the end.
function sliceUntil(tokens, start, stopType) {
    const containerOpen = stopType.replace('_close', '_open');
    const slice = [];
    let depth = 0;
    let i = start;
    while (i < tokens.length) {
        const type = tokens[i].type;
        if (type === stopType && depth === 0) break;
        if (type === containerOpen) depth += 1;
        if (type === stopType) depth -= 1;
        slice.push(tokens[i]);
        i += 1;
    }
    return { tokens: slice, next: i + 1 };
}

function convertBlocksUntil(tokens, start, stopType, ctx) {
    const inner = sliceUntil(tokens, start, stopType);
    return { nodes: convertBlocks(inner.tokens, ctx), next: inner.next };
}

function convertList(tokens, start, ctx, ordered) {
    const closeType = ordered ? 'ordered_list_close' : 'bullet_list_close';
    const items = [];
    let i = start + 1;
    while (i < tokens.length && tokens[i].type !== closeType) {
        if (tokens[i].type === 'list_item_open') {
            const inner = sliceUntil(tokens, i + 1, 'list_item_close');
            // A list item is converted with the same block logic as the rest of
            // the document, so headings, tables, formulas and quotes inside a
            // list are preserved instead of silently dropped.
            items.push(convertBlocks(inner.tokens, ctx).map(asListItem));
            i = inner.next;
        } else {
            i += 1;
        }
    }
    return { items, next: i + 1 };
}

function asListItem(node) {
    if (node && node.style === 'paragraph') {
        return { ...node, style: 'listItem' };
    }
    return node;
}

function buildBlockquote(nodes) {
    return {
        table: {
            widths: ['*'],
            body: [[{ stack: nodes, style: 'blockquoteText' }]],
        },
        layout: {
            hLineWidth: () => 0,
            vLineWidth: (index) => (index === 0 ? 2 : 0),
            vLineColor: () => '#c7ccd1',
            paddingLeft: () => 10,
            paddingRight: () => 8,
            paddingTop: () => 5,
            paddingBottom: () => 5,
            fillColor: () => '#f7f8fa',
        },
        margin: [0, 4, 0, 10],
    };
}

function convertTable(tokens, start, ctx) {
    const rows = [];
    let headerRows = 0;
    let inHead = false;
    let columnAlignments = [];
    let i = start + 1;

    while (i < tokens.length && tokens[i].type !== 'table_close') {
        const token = tokens[i];
        if (token.type === 'thead_open') {
            inHead = true;
            i += 1;
        } else if (token.type === 'thead_close') {
            inHead = false;
            i += 1;
        } else if (token.type === 'tr_open') {
            const row = [];
            const rowAlignments = [];
            i += 1;
            while (i < tokens.length && tokens[i].type !== 'tr_close') {
                const cell = tokens[i];
                if (cell.type === 'th_open' || cell.type === 'td_open') {
                    const isHeader = cell.type === 'th_open';
                    const runs = buildInlineRuns(inlineOf(tokens, i), ctx);
                    const node = {
                        text: runs,
                        style: isHeader ? 'tableHeader' : 'tableCell',
                    };
                    const alignment = alignmentFromStyle(cell.attrGet('style'));
                    if (alignment) node.alignment = alignment;
                    rowAlignments.push(alignment || 'left');
                    row.push(node);
                    i += 3;
                } else {
                    i += 1;
                }
            }
            if (columnAlignments.length === 0) columnAlignments = rowAlignments;
            rows.push(row);
            if (inHead) headerRows = rows.length;
            i += 1;
        } else {
            i += 1;
        }
    }

    const columns = rows.reduce((max, row) => Math.max(max, row.length), 0) || 1;

    return {
        node: {
            table: {
                headerRows,
                widths: Array(columns).fill('*'),
                body: rows,
            },
            layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#d8dee4',
                vLineColor: () => '#d8dee4',
                paddingLeft: () => 6,
                paddingRight: () => 6,
                paddingTop: () => 3,
                paddingBottom: () => 3,
            },
            margin: [0, 4, 0, 10],
        },
        next: i + 1,
    };
}

/**
 * Second pass: produce the pdfmake document content using the loaded families
 * and the pre-rendered math SVGs.
 *
 * @param {object[]} tokens
 * @param {{ mathMap: Map<string, {svg?: string, error?: string}>, warnings: string[] }} options
 */
export function buildDocument(tokens, options) {
    return convertBlocks(tokens, options);
}

function buildMathNode(content, ctx) {
    const entry = ctx.mathMap?.get(content);
    if (entry && entry.svg) {
        return { svg: entry.svg, alignment: 'center', margin: [0, 4, 0, 10] };
    }

    const reason = entry?.error ? `公式渲染失败：${entry.error}` : '公式未能渲染';
    ctx.warnings.push(`${reason}，已保留原文（${content.slice(0, 40)}）`);

    return {
        text: `$$ ${content} $$`,
        alignment: 'center',
        preserveLeadingSpaces: true,
        color: '#b35900',
        margin: [0, 4, 0, 10],
    };
}

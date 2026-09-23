import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';

const EX = 5.25;
const EM = 10.5;

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
// Drop the `noundefined` package: it silently renders unknown commands in red
// instead of reporting an error. Without it, TeX errors surface normally.
const packages = AllPackages.filter((name) => name !== 'noundefined');
const texInput = new TeX({ packages });
const svgOutput = new SVG({ fontCache: 'none' });
const mathDocument = mathjax.document('', { InputJax: texInput, OutputJax: svgOutput });

// MathJax emits ex-based sizes and currentColor. Rewrite both so the SVG can be
// placed by pdfmake as a self-contained, light-themed vector graphic.
function normalizeSvg(svgText, color) {
    const openTag = /<svg[^>]*>/.exec(svgText)?.[0] ?? '';
    const widthEx = Number.parseFloat(/width="([\d.]+)ex"/.exec(openTag)?.[1] ?? '0');
    const heightEx = Number.parseFloat(/height="([\d.]+)ex"/.exec(openTag)?.[1] ?? '0');

    let result = svgText;
    if (widthEx > 0) {
        result = result.replace(/width="[\d.]+ex"/, `width="${(widthEx * EX).toFixed(2)}"`);
    }
    if (heightEx > 0) {
        result = result.replace(/height="[\d.]+ex"/, `height="${(heightEx * EX).toFixed(2)}"`);
    }
    result = result.replace(/vertical-align:[^";]*;?/g, '');
    result = result.replace(/currentColor/g, color);
    return result;
}

function render(source, color) {
    const node = mathDocument.convert(source, {
        display: true,
        em: EM,
        ex: EX,
        containerWidth: 500,
    });
    const svg = normalizeSvg(adaptor.innerHTML(node), color);
    const error = /data-mjx-error="([^"]*)"/.exec(svg);
    if (error) {
        throw new Error(error[1] || '公式解析失败');
    }
    return svg;
}

self.onmessage = (event) => {
    const { id, source, color = '#1f2328' } = event.data;
    try {
        self.postMessage({ id, svg: render(source, color) });
    } catch (error) {
        self.postMessage({ id, error: error?.message || String(error) });
    }
};

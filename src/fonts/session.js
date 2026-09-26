// Imported fonts live only for this page session. Keep the original bytes for
// pdfmake; the browser's FontFace uses those same bytes for preview and print.
import { shallowReactive } from 'vue';

const sessionFonts = shallowReactive(new Map());
let nextId = 1;

const MAX_FACE_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 120 * 1024 * 1024;

export function getSessionFont(script, id) {
    return sessionFonts.get(script)?.find(entry => entry.value === id) || null;
}

export function sessionFontOptions(script) {
    return (sessionFonts.get(script) || []).map(({ value, label }) => ({ value, label }));
}

function fontFormat(bytes) {
    const signature = String.fromCharCode(...bytes.subarray(0, 4));
    if (signature === 'OTTO') return 'otf';
    if (signature === '\u0000\u0001\u0000\u0000' || signature === 'true') return 'ttf';
    return null;
}

async function readFace(file, fontkit) {
    if (!file) return null;
    if (file.size > MAX_FACE_BYTES) throw new Error(`字体 ${file.name} 超过 50 MB 限制。`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const format = fontFormat(bytes);
    if (!format) throw new Error(`字体 ${file.name} 不是受支持的静态 TTF/OTF。`);
    try {
        const parsed = fontkit.create(bytes);
        if (parsed.variationAxes && Object.keys(parsed.variationAxes).length) {
            throw new Error('暂不支持可变字体');
        }
        if (!parsed.characterSet?.length) throw new Error('字体没有可用字符');
        return {
            bytes,
            format,
            characterSet: new Set(parsed.characterSet),
            localizedFamilyName: parsed.name?.records?.fontFamily?.zh || parsed.familyName,
        };
    } catch (error) {
        throw new Error(`字体 ${file.name} 无法解析：${error.message}`, { cause: error });
    }
}

/** Keep English imports available to both selectors; Chinese retains one selection. */
export async function registerSessionFont({ script, label, files }) {
    if (script !== 'chinese' && script !== 'english') throw new Error('未知字体类别。');
    if (!files.regular) throw new Error('请选择 Regular 字体文件。');
    const slots = script === 'chinese'
        ? ['regular', 'bold']
        : ['regular', 'bold', 'italic', 'boldItalic'];
    const total = slots.reduce((sum, slot) => sum + (files[slot]?.size || 0), 0);
    if (total > MAX_TOTAL_BYTES) throw new Error('本次导入的字体文件总计不能超过 120 MB。');

    const fontkit = await import('fontkit');
    const provided = {};
    for (const slot of slots) provided[slot] = await readFace(files[slot], fontkit);
    for (const slot of slots.filter(key => key !== 'regular' && provided[key])) {
        if ([...provided.regular.characterSet].some(cp => !provided[slot].characterSet.has(cp))) {
            throw new Error(`${slot} 字面缺少 Regular 中的部分字符，请使用同一字体家族的完整字面。`);
        }
    }
    const faces = {
        regular: provided.regular,
        bold: provided.bold || provided.regular,
        italic: provided.italic || provided.regular,
        boldItalic: provided.boldItalic || provided.bold || provided.italic || provided.regular,
    };
    const id = `session-${script}-${nextId++}`;
    const family = `Session Document ${script} ${id}`;
    const codeFamily = script === 'english' ? `${family} Code` : null;
    const loaded = [];
    try {
        for (const [slot, weight, style] of [
            ['regular', '400', 'normal'], ['bold', '700', 'normal'],
            ...(script === 'english' ? [['italic', '400', 'italic'], ['boldItalic', '700', 'italic']] : []),
        ]) {
            const descriptors = { weight, style };
            if (script === 'english') descriptors.unicodeRange = 'U+0000-024F';
            const face = new FontFace(family, faces[slot].bytes, descriptors);
            await face.load();
            document.fonts.add(face);
            loaded.push(face);
        }
        if (codeFamily) {
            const codeFace = new FontFace(codeFamily, faces.regular.bytes);
            await codeFace.load();
            document.fonts.add(codeFace);
            loaded.push(codeFace);
        }
    } catch (error) {
        for (const face of loaded) document.fonts.delete(face);
        throw new Error(`浏览器无法加载该字体：${error.message}`, { cause: error });
    }

    const previous = sessionFonts.get(script) || [];
    if (script === 'chinese') {
        for (const old of previous) for (const face of old.webFaces) document.fonts.delete(face);
    }
    const entry = {
        value: id,
        label: String(label || provided.regular.localizedFamilyName || files.regular.name.replace(/\.(ttf|otf)$/i, '')).trim().slice(0, 60),
        family,
        codeFamily,
        fallback: script === 'chinese' ? 'sans-serif' : undefined,
        faces,
        webFaces: loaded,
        custom: true,
    };
    sessionFonts.set(script, script === 'chinese' ? [entry] : [...previous, entry]);
    return entry;
}

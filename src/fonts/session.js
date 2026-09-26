// Installed fonts keep only their PostScript names between visits. File imports
// and all font bytes remain in this page session.
import { shallowReactive } from 'vue';

const sessionFonts = shallowReactive(new Map());
let nextId = 1;
let cacheGeneration = 0;
const SYSTEM_FONT_KEY = 'markdown-editor.system-fonts-v1';

const MAX_FACE_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 120 * 1024 * 1024;

function fontIdentity(script, id) {
    const family = `Session Document ${script} ${id}`;
    return { family, codeFamily: script === 'english' ? `${family} Code` : null };
}

function savedSystemFonts() {
    try {
        const entries = JSON.parse(localStorage.getItem(SYSTEM_FONT_KEY));
        if (!Array.isArray(entries)) return [];
        return entries.filter(entry =>
            ['chinese', 'english'].includes(entry?.script)
            && /^session-(chinese|english)-\d+$/.test(entry.value)
            && entry.value.startsWith(`session-${entry.script}-`)
            && typeof entry.label === 'string'
            && typeof entry.postscriptNames?.regular === 'string'
        );
    } catch {
        return [];
    }
}

const systemFontIndex = savedSystemFonts();
for (const record of systemFontIndex) {
    const { family, codeFamily } = fontIdentity(record.script, record.value);
    const previous = sessionFonts.get(record.script) || [];
    sessionFonts.set(record.script, [...previous, {
        value: record.value, label: record.label, family, codeFamily,
        fallback: record.script === 'chinese' ? 'sans-serif' : undefined,
        custom: true, systemPersistent: true, pending: true,
    }]);
    nextId = Math.max(nextId, Number(record.value.match(/\d+$/)[0]) + 1);
}

function saveSystemFontIndex() {
    try {
        localStorage.setItem(SYSTEM_FONT_KEY, JSON.stringify(systemFontIndex));
    } catch {
        // The font remains available for this page session.
    }
}

export function isSystemFontPending(script, id) {
    return Boolean(getSessionFont(script, id)?.pending);
}

export function hasImportedFonts() {
    return [...sessionFonts.values()].some(entries => entries.length > 0);
}

export function clearImportedFonts() {
    localStorage.removeItem(SYSTEM_FONT_KEY);
    cacheGeneration++;
    systemFontIndex.length = 0;
    for (const entries of sessionFonts.values()) {
        for (const entry of entries) {
            for (const face of entry.webFaces || []) document.fonts.delete(face);
        }
    }
    sessionFonts.clear();
}

let restoreQueue = Promise.resolve();

export function restoreSystemFonts(selections) {
    const task = restoreQueue.then(() => restorePendingSystemFonts(selections));
    restoreQueue = task.catch(() => {});
    return task;
}

async function restorePendingSystemFonts(selections) {
    const generation = cacheGeneration;
    const pending = [...new Set(selections.map(({ script, id }) => getSessionFont(script, id)?.pending ? id : null).filter(Boolean))];
    if (!pending.length) return;
    if (typeof window.queryLocalFonts !== 'function') throw new Error('当前浏览器不支持恢复已安装字体。');
    const records = pending.map(id => systemFontIndex.find(record => record.value === id));
    const postscriptNames = [...new Set(records.flatMap(record => Object.values(record.postscriptNames).filter(Boolean)))];
    const available = await window.queryLocalFonts({ postscriptNames });
    if (generation !== cacheGeneration) return;
    const byName = new Map(available.map(font => [font.postscriptName, font]));
    for (const record of records) {
        const files = {};
        for (const [slot, name] of Object.entries(record.postscriptNames)) {
            const face = byName.get(name);
            if (!face) throw new Error(`找不到已保存的系统字体“${record.label}”，请检查字体是否仍已安装。`);
            files[slot] = new File([await face.blob()], `${name}.otf`, { type: 'font/otf' });
            if (generation !== cacheGeneration) return;
        }
        await registerSessionFont({ script: record.script, id: record.value, label: record.label, files,
            systemPostscriptNames: record.postscriptNames, expectedGeneration: generation });
    }
}

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

/** Keep English imports available to both selectors; preserve imported options. */
export async function registerSessionFont({ script, id: restoredId, label, files, systemPostscriptNames, expectedGeneration }) {
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
    const id = restoredId || `session-${script}-${nextId++}`;
    const { family, codeFamily } = fontIdentity(script, id);
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

    if (expectedGeneration !== undefined && expectedGeneration !== cacheGeneration) {
        for (const face of loaded) document.fonts.delete(face);
        return null;
    }

    const previous = sessionFonts.get(script) || [];
    const old = previous.find(item => item.value === id);
    for (const face of old?.webFaces || []) document.fonts.delete(face);
    const entry = {
        value: id,
        label: String(label || provided.regular.localizedFamilyName || files.regular.name.replace(/\.(ttf|otf)$/i, '')).trim().slice(0, 60),
        family,
        codeFamily,
        fallback: script === 'chinese' ? 'sans-serif' : undefined,
        faces,
        webFaces: loaded,
        custom: true,
        systemPersistent: Boolean(systemPostscriptNames),
    };
    sessionFonts.set(script, old ? previous.map(item => item.value === id ? entry : item) : [...previous, entry]);
    if (systemPostscriptNames) {
        const record = { value: id, script, label: entry.label, postscriptNames: systemPostscriptNames };
        const index = systemFontIndex.findIndex(item => item.value === id);
        if (index < 0) systemFontIndex.push(record);
        else systemFontIndex[index] = record;
        saveSystemFontIndex();
    }
    return entry;
}

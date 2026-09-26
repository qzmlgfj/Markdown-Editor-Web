import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
});

it('restores installed fonts from PostScript names without storing bytes, while file imports expire', async () => {
    const values = new Map();
    vi.stubGlobal('localStorage', {
        getItem: key => values.get(key) || null,
        setItem: (key, value) => values.set(key, value),
        removeItem: key => values.delete(key),
    });
    const webFaces = new Set();
    vi.stubGlobal('document', { createElement: () => ({}), fonts: {
        add: face => webFaces.add(face), delete: face => webFaces.delete(face),
    } });
    vi.stubGlobal('FontFace', class {
        async load() { return this; }
    });
    const bytes = await readFile(resolve('public/fonts/NotoSans-Regular.ttf'));
    const file = { name: 'test.ttf', size: bytes.length,
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
    let fonts = await import('../session.js');
    const installed = await fonts.registerSessionFont({
        script: 'english', label: 'Installed', files: { regular: file },
        systemPostscriptNames: { regular: 'NotoSans-Regular' },
    });
    const temporary = await fonts.registerSessionFont({ script: 'english', label: 'Temporary', files: { regular: file } });
    let store = (await import('../../utils/store.js')).default;
    store.commit('changeDocumentFont', { script: 'english', id: installed.value });
    store.commit('changeDocumentFont', { script: 'english', id: temporary.value });
    expect(JSON.parse(values.get('markdown-editor.appearance-v1')).fonts.english).toBe(installed.value);
    const saved = values.get('markdown-editor.system-fonts-v1');
    expect(saved).toContain('NotoSans-Regular');
    expect(saved).not.toContain('Temporary');
    expect(saved.length).toBeLessThan(300);

    vi.resetModules();
    // A real page refresh discards FontFace objects from the previous document.
    webFaces.clear();
    let queriedNames;
    vi.stubGlobal('window', { queryLocalFonts: async ({ postscriptNames }) => {
        queriedNames = postscriptNames;
        return [{ postscriptName: 'NotoSans-Regular', blob: async () => new Blob([bytes]) }];
    } });
    fonts = await import('../session.js');
    store = (await import('../../utils/store.js')).default;
    expect(store.state.documentFonts.english).toBe(installed.value);
    expect(fonts.getSessionFont('english', installed.value)?.pending).toBe(true);
    expect(fonts.getSessionFont('english', temporary.value)).toBeNull();
    await fonts.restoreSystemFonts([{ script: 'english', id: installed.value }]);
    expect(queriedNames).toEqual(['NotoSans-Regular']);
    expect(fonts.getSessionFont('english', installed.value)?.faces.regular.characterSet.size).toBeGreaterThan(0);
    expect(fonts.isSystemFontPending('english', installed.value)).toBe(false);
    expect(fonts.hasImportedFonts()).toBe(true);
    fonts.clearImportedFonts();
    store.commit('resetDocumentFonts');
    expect(values.has('markdown-editor.system-fonts-v1')).toBe(false);
    expect(fonts.hasImportedFonts()).toBe(false);
    expect(fonts.getSessionFont('english', installed.value)).toBeNull();
    expect(webFaces.size).toBe(0);
    expect(store.state.documentFonts).toEqual({ chinese: 'sans', english: 'sans', code: 'mono' });
    expect(JSON.parse(values.get('markdown-editor.appearance-v1')).fonts).toEqual(store.state.documentFonts);
});

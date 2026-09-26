import { createStore } from 'vuex';
import { getBase46Theme } from '../themes/base46';
import { getDocumentFonts } from '../fonts/options';

const STORAGE_KEY = 'markdown-editor.appearance-v1';

function savedAppearance() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        const fonts = getDocumentFonts(saved.fonts);
        return {
            theme: getBase46Theme(saved.theme) ? saved.theme : 'default',
            fonts: { chinese: fonts.chinese.value, english: fonts.english.value, code: fonts.code.value },
        };
    } catch {
        return { theme: 'default', fonts: { chinese: 'sans', english: 'sans', code: 'mono' } };
    }
}

const initialAppearance = savedAppearance();

function saveAppearance(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: state.appearanceTheme, fonts: state.savedDocumentFonts }));
    } catch {
        // Choices remain usable when storage is unavailable.
    }
}

const store = createStore({
    state() {
        return {
            appearanceTheme: initialAppearance.theme,
            documentFonts: initialAppearance.fonts,
            savedDocumentFonts: { ...initialAppearance.fonts },
        }
    },
    mutations: {
        changeAppearanceTheme(state, id) {
            state.appearanceTheme = getBase46Theme(id) ? id : 'default';
            saveAppearance(state);
        },
        changeDocumentFont(state, { script, id }) {
            if (script !== 'chinese' && script !== 'english' && script !== 'code') return;
            const fonts = getDocumentFonts({ ...state.documentFonts, [script]: id });
            state.documentFonts = { chinese: fonts.chinese.value, english: fonts.english.value, code: fonts.code.value };
            if (!fonts[script].custom) state.savedDocumentFonts = { ...state.savedDocumentFonts, [script]: fonts[script].value };
            saveAppearance(state);
        }
    }
})

export default store;

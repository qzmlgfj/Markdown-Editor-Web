import { createStore } from 'vuex';

const store = createStore({
    state() {
        return {
            previewTheme: "default",
            codeTheme: "atom"
        }
    },
    mutations: {
        changePreviewTheme(state, previewTheme) {
            state.previewTheme = previewTheme;
        },
        changeCodeTheme(state, codeTheme) {
            state.codeTheme = codeTheme;
        }
    }
})

export default store;

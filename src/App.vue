<template>
    <n-config-provider :theme="naiveTheme" :theme-overrides="naiveThemeOverrides">
        <n-message-provider>
        <n-dialog-provider>
            <n-layout>
                <div id="container" :class="{ 'base46-active': activePalette }" :style="{ '--document-font-family': documentFontFamily, '--code-font-family': codeFontFamily }">
                    <n-layout-header bordered>
                        <head-bar></head-bar>
                    </n-layout-header>
                    <n-layout-content>
                        <div class="editor-workspace">
                            <editor :theme="editorTheme" />
                        </div>
                    </n-layout-content>
                    <n-layout-footer bordered>
                        <foot-bar></foot-bar>
                    </n-layout-footer>
                </div>
            </n-layout>
        </n-dialog-provider>
        </n-message-provider>
    </n-config-provider>
</template>

<script>
import { ref, computed, provide, watch } from "vue";
import { useStore } from 'vuex';
import { getBase46Theme, themeColors, themeCssVariables } from './themes/base46';
import { documentFontStack, codeFontStack, registerDocumentFonts } from './fonts/options';

import {
    NLayout,
    NConfigProvider,
    NMessageProvider,
    NDialogProvider,
    NLayoutHeader,
    NLayoutContent,
    NLayoutFooter,
    darkTheme
} from "naive-ui";

import HeadBar from "./components/HeadBar.vue";
import Editor from "./components/Editor.vue";
import FootBar from "./components/FootBar.vue";

export default {
    name: 'App',
    components: {
        NLayout,
        NConfigProvider,
        NMessageProvider,
    NDialogProvider,
        NLayoutHeader,
        NLayoutContent,
        NLayoutFooter,
        HeadBar,
        Editor,
        FootBar
    },
    setup() {
        const store = useStore();
        registerDocumentFonts();
        const documentFontFamily = computed(() => documentFontStack(store.state.documentFonts));
        const codeFontFamily = computed(() => codeFontStack(store.state.documentFonts));
        const isDaytime = ref(true);
        const activePalette = computed(() => getBase46Theme(store.state.appearanceTheme));
        const isDark = computed(() => activePalette.value ? activePalette.value.type === 'dark' : !isDaytime.value);
        const naiveTheme = computed(() => isDark.value ? darkTheme : null);
        const editorTheme = computed(() => isDark.value ? 'dark' : 'light');
        const naiveThemeOverrides = computed(() => {
            const colors = themeColors(activePalette.value);
            if (!colors) return {};
            return {
                common: {
                    primaryColor: colors.accent,
                    primaryColorHover: colors.link,
                    primaryColorPressed: colors.link,
                    bodyColor: colors.background,
                    cardColor: colors.surface,
                    popoverColor: colors.raised,
                    borderColor: colors.border,
                    textColorBase: colors.text,
                    textColor1: colors.text,
                    textColor2: colors.muted,
                    textColor3: colors.muted,
                    dividerColor: colors.border,
                },
                Layout: { color: colors.background, headerColor: colors.background, footerColor: colors.background },
            };
        });
        watch(activePalette, (palette) => {
            const root = document.documentElement;
            for (const key of Object.keys(themeCssVariables(activePalette.value || getBase46Theme('onedark')))) {
                root.style.removeProperty(key);
            }
            if (palette) {
                for (const [key, value] of Object.entries(themeCssVariables(palette))) root.style.setProperty(key, value);
                root.dataset.base46 = palette.id;
            } else {
                delete root.dataset.base46;
            }
        }, { immediate: true });
        const showModal = ref(false);

        const switchTheme = () => {
            isDaytime.value = !isDaytime.value;
        };

        const closeModal = () => {
            showModal.value = false;
        };

        provide("switchTheme", {
            isDaytime,
            switchTheme,
        })

        provide("closeModal", {
            closeModal
        })

        return {
            isDaytime,
            naiveTheme,
            naiveThemeOverrides,
            editorTheme,
            activePalette,
            documentFontFamily,
            codeFontFamily,
            showModal,
            closeModal
        }
    }
}
</script>

<style>
body {
    box-sizing: border-box;
    margin: 0;
    font-family: v-sans, system-ui, -apple-system, BlinkMacSystemFont,
        "Segoe UI", sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
        "Segoe UI Symbol";
}

#container {
    height: 100vh;
    display: flex;
    flex-direction: column;
}

.n-layout-header {
    height: 10vh;
    flex: none;
}

.n-layout-content {
    flex: 1;
    min-height: 0;
    margin: 0 2.5vw;
    box-sizing: border-box;
}

.n-layout-footer {
    height: 36px;
    flex: none;
}

.editor-workspace {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.editor-workspace .screen-editor {
    flex: 1;
    min-height: 0;
    height: auto;
}

/* A dedicated preview keeps printing independent of editor layout and toggles. */
.print-preview {
    display: none;
}

.md-editor {
    --md-bk-color: var(--n-color);
    transition: background-color .3s var(--n-bezier);
}

.screen-editor .md-editor-preview,
.print-preview .md-editor-preview,
.screen-editor .cm-content {
    font-family: var(--document-font-family) !important;
}

.screen-editor .md-editor-preview pre,
.screen-editor .md-editor-preview code,
.print-preview .md-editor-preview pre,
.print-preview .md-editor-preview code {
    font-family: var(--code-font-family) !important;
}

@media print {
    @page {
        margin: 12mm 14mm;

        /* Empty margin boxes replace Chromium's automatic title/date/URL/pages. */
        @top-left { content: ""; }
        @top-center { content: ""; }
        @top-right { content: ""; }
        @bottom-left { content: ""; }
        @bottom-center { content: ""; }
        @bottom-right { content: ""; }
    }

    .n-layout-header,
    .n-layout-footer,
    .n-h,
    .screen-editor,
    .editor-actions {
        display: none !important;
    }

    html,
    body,
    #app,
    #container,
    .n-layout,
    .n-layout-scroll-container,
    .n-layout-content {
        height: auto !important;
        overflow: visible !important;
        background: white !important;
    }

    .n-layout-content {
        margin: 0;
    }

    .editor-workspace {
        display: block;
        height: auto !important;
    }

    .print-preview {
        display: block;
        border: 0;
        --md-bk-color: white;
    }

    .print-preview .md-editor-preview-wrapper {
        padding: 0 !important;
        overflow: visible !important;
    }

    .print-preview .md-editor-code-head,
    .print-preview [rn-wrapper] {
        display: none !important;
    }

    /* Scroll containers and inline-block code are atomic when paginated. */
    .print-preview .md-editor-preview,
    .print-preview .md-editor-code,
    .print-preview pre,
    .print-preview pre code,
    .print-preview .md-editor-code-block {
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
        break-inside: auto !important;
        box-shadow: none !important;
    }

    .print-preview pre code,
    .print-preview .md-editor-code-block {
        display: block !important;
        white-space: pre-wrap !important;
        overflow-wrap: anywhere !important;
        word-break: normal !important;
        orphans: 2;
        widows: 2;
    }

    .print-preview pre code {
        padding: 10px 12px !important;
    }
}
</style>

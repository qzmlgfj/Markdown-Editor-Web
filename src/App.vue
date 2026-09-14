<template>
    <n-config-provider :theme="naiveTheme">
        <n-layout>
            <div id="container">
                <n-layout-header bordered>
                    <head-bar></head-bar>
                </n-layout-header>
                <n-layout-content>
                    <n-h2>这是一个简易MarkDown渲染器</n-h2>
                    <n-h3>编辑完成后可使用浏览器的打印功能导出pdf</n-h3>
                    <editor :theme="editorTheme" />
                </n-layout-content>
                <n-layout-footer bordered>
                    <foot-bar></foot-bar>
                </n-layout-footer>
            </div>
        </n-layout>
    </n-config-provider>
</template>

<script>
import { ref, computed, provide } from "vue";

import {
    NLayout,
    NConfigProvider,
    NLayoutHeader,
    NLayoutContent,
    NLayoutFooter,
    darkTheme,
    NH2,
    NH3
} from "naive-ui";

import HeadBar from "./components/HeadBar.vue";
import Editor from "./components/Editor.vue";
import FootBar from "./components/FootBar.vue";

export default {
    name: 'App',
    components: {
        NLayout,
        NConfigProvider,
        NLayoutHeader,
        NLayoutContent,
        NLayoutFooter,
        NH2,
        NH3,
        HeadBar,
        Editor,
        FootBar
    },
    setup() {
        const isDaytime = ref(true);
        const naiveTheme = computed(() => isDaytime.value ? null : darkTheme);
        const editorTheme = computed(() => isDaytime.value ? 'light' : 'dark');
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
            editorTheme,
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
}

.n-layout-header {
    height: 10vh;
}

.n-layout-content {
    height: 80vh;
    margin: 0 2.5vw;
    box-sizing: border-box;
}

.n-layout-footer {
    height: 10vh;
}

/* A dedicated preview keeps printing independent of editor layout and toggles. */
.print-preview {
    display: none;
}

.md-editor {
    --md-bk-color: var(--n-color);
    transition: background-color .3s var(--n-bezier);
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
    .screen-editor {
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

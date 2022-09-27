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
        const naiveTheme = computed(() => isDaytime.value ? {} : darkTheme);
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

@media print {

    .n-layout-header,
    .n-layout-footer,
    .n-h,
    .md-toolbar-wrapper,
    #md-editor-v3-textarea,
    .md-footer,
    .copy-button {
        display: none;
    }

    #container {
        height: auto;
    }

    .n-layout-content {
        margin: 0;
        height: auto;
    }

    .default-theme pre {
        box-shadow: unset;
    }

    .md-content {
        display: block;
    }

    .md {
        border: 0;
        height: auto;
    }
}

.md-dark,
.md {
    --md-bk-color: var(--n-color);
    transition: background-color .3s var(--n-bezier);
}
</style>

<template>
    <div class="head-bar">
        <n-h1>Markdown Editor</n-h1>
        <n-space>
            <n-popselect v-model:value="previewTheme" :options="previewThemeOptions" trigger="click"
                @update:value="changePreviewTheme">
                <n-button quaternary size="large">
                    <template #icon>
                        <n-icon>
                            <chart-arcs />
                        </n-icon>
                    </template>
                    渲染主题
                </n-button>
            </n-popselect>
            <n-popselect v-model:value="codeTheme" :options="codeThemeOptions" trigger="click"
                @update:value="changeCodeTheme">
                <n-button quaternary size="large">
                    <template #icon>
                        <n-icon>
                            <Code />
                        </n-icon>
                    </template>
                    代码块主题
                </n-button>
            </n-popselect>
            <n-button quaternary @click="switchTheme" size="large">
                <template #icon>
                    <n-icon>
                        <sun v-if="isDaytime" />
                        <moon v-else />
                    </n-icon>
                </template>
                {{theme}}
            </n-button>
            <n-button quaternary size="large" tag="a" href="https://github.com/qzmlgfj/markdown-editor-web">
                <template #icon>
                    <n-icon>
                        <brand-github />
                    </n-icon>
                </template>
                GitHub
            </n-button>
        </n-space>
    </div>
</template>

<script>
import { inject, computed, ref } from "vue";
import { useStore } from "vuex";
import { NH1, NSpace, NButton, NIcon, NPopselect } from "naive-ui";
import { ChartArcs, Code, BrandGithub, Sun, Moon } from "@vicons/tabler";

export default {
    name: 'HeadBar',
    components: {
        NH1,
        NSpace,
        NButton,
        NIcon,
        NPopselect,
        ChartArcs,
        Code,
        BrandGithub,
        Sun,
        Moon
    },
    setup() {
        const { isDaytime, switchTheme } = inject("switchTheme");
        const theme = computed(() => isDaytime.value ? "深色" : "浅色");

        const store = useStore();
        const previewTheme = ref("default");
        const codeTheme = ref("atom");

        const previewThemeOptions = [
            // 'default' | 'github' | 'vuepress' | 'mk-cute' | 'smart-blue' | 'cyanosis'
            {
                label: "default",
                value: "default",
            },
            {
                label: "github",
                value: "github",
            },
            {
                label: "vuepress",
                value: "vuepress",
            },
            {
                label: "mk-cute",
                value: "mk-cute",
            },
            {
                label: "smart-blue",
                value: "smart-blue",
            },
            {
                label: "cyanosis",
                value: "cyanosis",
            },
        ]

        const codeThemeOptions = [
            // 'atom'|'a11y'|'github'|'gradient'|'kimbie'|'paraiso'|'qtcreator'|'stackoverflow'
            {
                label: "atom",
                value: "atom",
            },
            {
                label: "a11y",
                value: "a11y",
            },
            {
                label: "github",
                value: "github",
            },
            {
                label: "gradient",
                value: "gradient",
            },
            {
                label: "kimbie",
                value: "kimbie",
            },
            {
                label: "paraiso",
                value: "paraiso",
            },
            {
                label: "qtcreator",
                value: "qtcreator",
            },
            {
                label: "stackoverflow",
                value: "stackoverflow",
            },
        ]

        const changePreviewTheme = (value) => {
            store.commit("changePreviewTheme", value);
        };

        const changeCodeTheme = (value) => {
            store.commit("changeCodeTheme", value);
        };

        return {
            isDaytime,
            theme,
            switchTheme,
            previewTheme,
            codeTheme,
            previewThemeOptions,
            codeThemeOptions,
            changePreviewTheme,
            changeCodeTheme
        }
    },
    data() {
        return {
            poetry: ""
        }
    }
}
</script>

<style scoped>
.head-bar {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
}

h1 {
    margin: 0;
    padding: 0;
}
</style>

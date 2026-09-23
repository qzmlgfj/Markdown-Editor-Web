<template>
    <div class="head-bar">
        <n-tooltip trigger="hover">
            <template #trigger>
                <n-h1 tabindex="0">Markdown Editor</n-h1>
            </template>
            这是一个简易MarkDown渲染器
        </n-tooltip>
        <n-space>
            <n-popselect :value="appearanceTheme" :options="appearanceThemeOptions" trigger="click" :z-index="10010"
                @update:value="changeAppearanceTheme">
                <n-button quaternary size="large">
                    <span v-if="isBase46" class="theme-swatch" :style="{ backgroundColor: selectedThemeColor }" aria-hidden="true"></span>
                    {{ selectedThemeName }}
                </n-button>
            </n-popselect>
            <n-button v-if="!isBase46" quaternary @click="switchTheme" size="large">
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
import { inject, computed } from "vue";
import { useStore } from "vuex";
import { base46Themes, getBase46Theme } from '../themes/base46';
import { NH1, NSpace, NButton, NIcon, NPopselect, NTooltip } from "naive-ui";
import { BrandGithub, Sun, Moon } from "@vicons/tabler";

export default {
    name: 'HeadBar',
    components: {
        NH1,
        NSpace,
        NButton,
        NIcon,
        NPopselect,
        NTooltip,
        BrandGithub,
        Sun,
        Moon
    },
    setup() {
        const { isDaytime, switchTheme } = inject("switchTheme");
        const theme = computed(() => isDaytime.value ? "深色" : "浅色");

        const store = useStore();
        const appearanceTheme = computed(() => store.state.appearanceTheme);
        const selectedTheme = computed(() => getBase46Theme(appearanceTheme.value));
        const isBase46 = computed(() => Boolean(selectedTheme.value));
        const selectedThemeName = computed(() => selectedTheme.value?.name || '默认配色');
        const selectedThemeColor = computed(() => selectedTheme.value?.base_30.blue);
        const appearanceThemeOptions = [
            { label: '默认配色', value: 'default' },
            ...base46Themes.map(({ id, name }) => ({ label: name, value: id })),
        ];
        const changeAppearanceTheme = (value) => {
            store.commit('changeAppearanceTheme', value);
        };

        return {
            isDaytime,
            theme,
            switchTheme,
            appearanceTheme,
            appearanceThemeOptions,
            selectedThemeName,
            selectedThemeColor,
            isBase46,
            changeAppearanceTheme,
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

.theme-swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 7px;
    box-shadow: 0 0 0 1px currentColor;
}
</style>

<template>
    <md-editor v-model="text" :theme="theme" :preview-theme="previewTheme" :code-theme="codeTheme" />
</template>
  
<script>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';

import MdEditor from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';

export default {
    name: 'Editor',
    props: {
        theme: {
            type: String,
            default: 'light'
        }
    },
    components: {
        MdEditor
    },
    setup() {
        const text = ref("## Markdown Render\n\nMarkdown 编辑器，基于 vue3\n\n## 基本演示\n\n**加粗**，<u>下划线</u>，_斜体_，~删除线~，上标<sup>26</sup>，下标<sub>[1]</sub>，`inline code`，[超链接](https://imbf.cc)\n\n> 引用：麻雀虽小，五脏俱全\n\n## 代码演示\n\n```javascript\nvar s = \"JavaScript syntax highlighting\";\nalert(s);\n```\n\n## 文本演示\n\n依照普朗克长度这项单位，目前可观测的宇宙的直径估计值（直径约 930 亿光年，即 8.8 × 10<sup>26</sup> 米）即为 5.4 × 10<sup>61</sup>倍普朗克长度。而可观测宇宙体积则为 8.4 × 10<sup>184</sup>立方普朗克长度（普朗克体积）。\n\n## 表格演示\n\n| Tables        |      Are      | Cool |\n| ------------- | :-----------: | ---: |\n| col 3 is      | right-aligned |      |\n| col 2 is      |   centered    |      |\n| zebra stripes |   are neat    |      |\n \n## 数学公式 \n\n支持 $\\TeX$公式如 \n\n$$\n\\int_1^\\infty f(x)dx\n$$");
        const store = useStore();
        const previewTheme = computed(() => store.state.previewTheme);
        const codeTheme = computed(() => store.state.codeTheme);

        return {
            text,
            previewTheme,
            codeTheme
        }
    }
}
</script>
<template>
    <md-editor
        v-model="text"
        editorClass="markdown-body"
        highlightCss="https://cdn.jsdelivr.net/npm/highlight.js@11.2.0/styles/arduino-light.css"
        @onHtmlChanged="htmlChanged"
        toolbars="['bold', 'underline', 'italic', 'strikeThrough', 'sub', 'sup', 'quote', 'unorderedList',
            'orderedList', 'codeRow', 'code', 'link', 'image', 'table', 'revoke', 'next',
            'pageFullscreen', 'fullscreen', 'preview', 'htmlPreview', 'prettier']"
    />
</template>

<script>
import MdEditor from "md-editor-v3";
import "md-editor-v3/lib/style.css";
import "github-markdown-css";

export default {
    name: "Editor",
    components: {
        MdEditor,
    },
    data() {
        return {
            text: "## Markdown Render\n\nMarkdown 编辑器，基于 vue3\n\n## 基本演示\n\n**加粗**，<u>下划线</u>，_斜体_，~删除线~，上标<sup>26</sup>，下标<sub>[1]</sub>，`inline code`，[超链接](https://imbf.cc)\n\n> 引用：麻雀虽小，五脏俱全\n\n## 代码演示\n\n```javascript\nvar s = \"JavaScript syntax highlighting\";\nalert(s);\n```\n\n## 文本演示\n\n依照普朗克长度这项单位，目前可观测的宇宙的直径估计值（直径约 930 亿光年，即 8.8 × 10<sup>26</sup> 米）即为 5.4 × 10<sup>61</sup>倍普朗克长度。而可观测宇宙体积则为 8.4 × 10<sup>184</sup>立方普朗克长度（普朗克体积）。\n\n## 表格演示\n\n| Tables        |      Are      | Cool |\n| ------------- | :-----------: | ---: |\n| col 3 is      | right-aligned |      |\n| col 2 is      |   centered    |      |\n| zebra stripes |   are neat    |      |\n",
            html: "",
        };
    },
    methods: {
        htmlChanged(h) {
            this.html = h;
        },
    },
};
</script>

<style>
.md-preview pre::before {
    display: none;
}

.md-preview pre {
    box-shadow: none;
}

.copy-button {
    display: none;
}

.md-preview pre code {
    color: black;
}
</style>

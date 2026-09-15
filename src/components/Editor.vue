<template>
    <div class="editor-actions">
        <n-button type="primary" :loading="exporting" :disabled="exporting" @click="handleExportPdf">
            导出 PDF
        </n-button>
        <n-text depth="3" class="export-hint">使用独立 PDF 样式</n-text>
    </div>
    <md-editor class="screen-editor" v-model="text" :theme="theme" :preview-theme="previewTheme" :code-theme="codeTheme"
        :auto-fold-threshold="Infinity" @save="handleSave" />
    <md-preview class="print-preview" :model-value="text" theme="light" :preview-theme="previewTheme"
        :code-theme="codeTheme" :code-foldable="false" :auto-fold-threshold="Infinity" :show-code-row-number="false" />
</template>
  
<script>
import { ref, computed, h } from 'vue';
import { useStore } from 'vuex';
import { NButton, NText, useMessage, useDialog } from 'naive-ui';

import { MdEditor, MdPreview } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';

export default {
    name: 'MarkdownEditor',
    props: {
        theme: {
            type: String,
            default: 'light'
        }
    },
    components: {
        MdEditor,
        MdPreview,
        NButton,
        NText
    },
    setup() {
        const message = useMessage();
        const dialog = useDialog();
        const text = ref("# Markdown Render\n\nMarkdown 编辑器，基于 vue3\n\n## 基本演示\n\n**加粗**，<u>下划线</u>，_斜体_，~删除线~，上标<sup>26</sup>，下标<sub>[1]</sub>，`inline code`，[超链接](https://imbf.cc)\n\n> 引用：麻雀虽小，五脏俱全\n\n## 代码演示\n\n```javascript\nvar s = \"JavaScript syntax highlighting\";\nalert(s);\n```\n\n## 文本演示\n\n依照普朗克长度这项单位，目前可观测的宇宙的直径估计值（直径约 930 亿光年，即 8.8 × 10<sup>26</sup> 米）即为 5.4 × 10<sup>61</sup>倍普朗克长度。而可观测宇宙体积则为 8.4 × 10<sup>184</sup>立方普朗克长度（普朗克体积）。\n\n## 表格演示\n\n| Tables        |      Are      | Cool |\n| ------------- | :-----------: | ---: |\n| col 3 is      | right-aligned |      |\n| col 2 is      |   centered    |      |\n| zebra stripes |   are neat    |      |\n \n## 数学公式 \n\n支持 $\\TeX$公式如 \n\n$$\n\\int_1^\\infty f(x)dx\n$$");
        const store = useStore();
        const previewTheme = computed(() => store.state.previewTheme);
        const codeTheme = computed(() => store.state.codeTheme);

        // 以.md格式保存
        const handleSave = (str) => {
            const blob = new Blob([str], { type: 'text/plain' });
            const a = document.createElement('a');
            const url = URL.createObjectURL(blob);
            a.href = url;
            a.download = 'Markdown.md';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        };

        const exporting = ref(false);

        // Snapshot the Markdown at click time so edits made while the PDF is
        // being generated cannot leak into the exported file.
        const handleExportPdf = async () => {
            if (exporting.value) return;
            const snapshot = text.value;
            exporting.value = true;
            try {
                const { exportMarkdownToPdf } = await import('../utils/pdf/exportPdf');
                const { cancelled } = await exportMarkdownToPdf(snapshot, {
                    fileName: 'Markdown.pdf',
                    confirmWarnings: (warnings) => new Promise((resolve) => {
                        dialog.warning({
                            title: 'PDF 导出有以下问题',
                            content: () => h('div', { style: 'max-height: 50vh; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere' },
                                warnings.map((warning) => h('p', warning))),
                            positiveText: '继续下载',
                            negativeText: '返回编辑',
                            onPositiveClick: () => resolve(true),
                            onNegativeClick: () => resolve(false),
                            onClose: () => resolve(false),
                            onMaskClick: () => resolve(false),
                            onEsc: () => resolve(false),
                        });
                    }),
                });
                if (cancelled) return;
                message.success('PDF 已生成');
            } catch (error) {
                dialog.error({ title: 'PDF 导出失败', content: () => h('div', { style: 'white-space: pre-wrap; max-height: 50vh; overflow: auto' }, error?.message || 'PDF 导出失败'), positiveText: '返回编辑' });
            } finally {
                exporting.value = false;
            }
        };

        return {
            text,
            previewTheme,
            codeTheme,
            handleSave,
            exporting,
            handleExportPdf
        }
    }
}
</script>

<style scoped>
.editor-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}

.export-hint {
    font-size: 12px;
}
</style>

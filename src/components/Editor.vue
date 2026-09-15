<template>
    <div class="editor-actions">
        <n-text depth="3" class="export-hint">使用独立 PDF 样式</n-text>
        <n-button type="primary" :loading="exporting" :disabled="exporting" @click="handleExportPdf">
            预览 PDF
        </n-button>
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
            // Reserve a tab during the click gesture, before asynchronous font loading.
            const preview = window.open('about:blank', '_blank');
            if (!preview) {
                dialog.error({ title: '无法打开 PDF 预览', content: '浏览器拦截了新标签页，请允许本站弹出窗口后重试。', positiveText: '知道了' });
                return;
            }
            preview.opener = null;
            preview.document.title = '正在生成 PDF';
            preview.document.body.textContent = '正在生成 PDF，请稍候。如有转换问题，请返回编辑器确认。';
            window.focus();
            exporting.value = true;
            try {
                const { exportMarkdownToPdf } = await import('../utils/pdf/exportPdf');
                const { cancelled, blob } = await exportMarkdownToPdf(snapshot, {
                    confirmWarnings: (warnings) => new Promise((resolve) => {
                        dialog.warning({
                            title: '以下位置存在问题，是否继续预览？',
                            content: () => h('div', { style: 'max-height: 50vh; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere' },
                                warnings.map((warning) => h('p', warning))),
                            positiveText: '继续预览',
                            negativeText: '返回编辑',
                            onPositiveClick: () => resolve(true),
                            onNegativeClick: () => resolve(false),
                            onClose: () => resolve(false),
                            onMaskClick: () => resolve(false),
                            onEsc: () => resolve(false),
                        });
                    }),
                });
                if (cancelled) { preview.close(); return; }
                if (preview.closed) return;
                const url = URL.createObjectURL(blob);
                preview.location.replace(url);
                preview.focus();
                // Keep the URL alive for the viewer's save button / Ctrl+S.
                const cleanup = setInterval(() => {
                    if (preview.closed) {
                        URL.revokeObjectURL(url);
                        clearInterval(cleanup);
                    }
                }, 1000);
                message.success('PDF 已在新标签页打开，可使用查看器下载或 Ctrl+S 保存');
            } catch (error) {
                preview.close();
                dialog.error({ title: 'PDF 预览失败', content: () => h('div', { style: 'white-space: pre-wrap; max-height: 50vh; overflow: auto' }, error?.message || 'PDF 导出失败'), positiveText: '返回编辑' });
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
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}

.export-hint {
    font-size: 12px;
}
</style>

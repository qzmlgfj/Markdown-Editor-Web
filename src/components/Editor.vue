<template>
    <div class="editor-actions">
        <n-popselect :value="documentFonts.chinese" :options="chineseFontOptions" :render-label="renderFontLabel" trigger="click" :z-index="10010"
            @update:value="value => changeFont('chinese', value)">
            <n-button quaternary size="small">中文：{{ selectedChineseFont }}</n-button>
        </n-popselect>
        <n-popselect :value="documentFonts.english" :options="englishFontOptions" :render-label="renderFontLabel" trigger="click" :z-index="10010"
            @update:value="value => changeFont('english', value)">
            <n-button quaternary size="small">English: {{ selectedEnglishFont }}</n-button>
        </n-popselect>
        <n-popselect :value="documentFonts.code" :options="codeFontOptions" :render-label="renderFontLabel" trigger="click" :z-index="10010"
            @update:value="value => changeFont('code', value)">
            <n-button quaternary size="small">代码块：{{ selectedCodeFont }}</n-button>
        </n-popselect>
        <n-button quaternary size="small" :disabled="!hasLocalFonts || importingFont || exporting"
            @click="clearFontCache">清除字体缓存</n-button>
        <n-button v-if="hasPendingSystemFont" quaternary size="small" :loading="restoringFonts"
            @click="restoreSelectedFonts">恢复已安装字体</n-button>
        <n-text depth="3" class="export-hint">PDF 样式</n-text>
        <n-tooltip trigger="hover">
            <template #trigger>
                <span class="pdf-dark-control">
                    <n-checkbox v-model:checked="keepPdfDark" :disabled="!canKeepPdfDark">保持深色</n-checkbox>
                </span>
            </template>
            {{ pdfStyleHint }}
        </n-tooltip>
        <n-button type="primary" :loading="exporting" :disabled="exporting" @click="handleExportPdf">
            预览 PDF
        </n-button>
    </div>
    <md-editor class="screen-editor" v-model="text" :theme="theme" preview-theme="default" code-theme="atom"
        :auto-fold-threshold="Infinity" @save="handleSave" />
    <md-preview class="print-preview" :model-value="text" theme="light" preview-theme="default"
        code-theme="atom" :code-foldable="false" :auto-fold-threshold="Infinity" :show-code-row-number="false" />
    <n-modal v-model:show="showFontImport">
        <n-card class="font-import-card" :title="importTarget === 'chinese' ? '使用本机中文字体' : importTarget === 'code' ? '使用本机代码字体' : '使用本机英文字体'" closable
            @close="showFontImport = false">
            <p>字体不上传服务器。已安装字体只保存名称索引，刷新后尝试恢复；文件导入的字体刷新后失效。</p>
            <p v-if="importScript === 'english'">英文正文与代码块共用已导入的字体列表，导入后可分别选择。</p>
            <div class="font-source">
                <n-button :loading="scanningSystemFonts" :disabled="scanningSystemFonts || !systemFontSupported"
                    @click="scanSystemFonts">选择已安装字体</n-button>
                <span v-if="!systemFontSupported" class="font-note">当前浏览器不支持读取系统字体，可选择本机 TTF/OTF 文件。</span>
                <span v-else class="font-note">浏览器会请求访问系统字体的权限。部分中文字体在系统列表中以英文名称显示，也可直接选择字体文件。</span>
            </div>
            <template v-if="systemFonts.length">
                <label class="font-field">字体族
                    <n-select v-model:value="systemFamily" filterable :options="systemFamilyOptions"
                        placeholder="搜索已安装字体" @update:value="selectSystemFamily" />
                </label>
                <label v-for="slot in importSlots" :key="`system-${slot.key}`" class="font-field">
                    {{ slot.label }} <span v-if="slot.key !== 'regular'">（可选）</span>
                    <n-select v-model:value="systemFaceSelection[slot.key]" clearable filterable
                        :options="systemFaceOptions" :placeholder="slot.key === 'regular' ? '选择字面' : '缺省时复用 Regular'" />
                </label>
                <n-button type="primary" :loading="importingFont" :disabled="systemFaceSelection.regular == null || !fontLicenseConfirmed || importingFont"
                    @click="useSystemFont">使用系统字体</n-button>
            </template>
            <div class="font-divider">或选择本机 TTF/OTF 文件</div>
            <label class="font-field">显示名称 <n-input v-model:value="importLabel" placeholder="留空时使用字体内的名称" /></label>
            <label v-for="slot in importSlots" :key="slot.key" class="font-field">
                {{ slot.label }} <span v-if="slot.key !== 'regular'">（可选）</span>
                <input type="file" accept=".ttf,.otf,font/ttf,font/otf" @change="event => selectFontFile(slot.key, event)" />
            </label>
            <p class="font-note">缺少粗体或斜体文件时会复用已有字面，外观可能与真正的粗体或斜体不同。</p>
            <n-checkbox v-model:checked="fontLicenseConfirmed">我确认有权在本机使用所选字体并将其嵌入导出的 PDF</n-checkbox>
            <div class="font-import-actions">
                <n-button @click="showFontImport = false">取消</n-button>
                <n-button type="primary" :loading="importingFont" :disabled="!importFiles.regular || !fontLicenseConfirmed || importingFont"
                    @click="importLocalFont">使用字体</n-button>
            </div>
        </n-card>
    </n-modal>
</template>
  
<script>
import { ref, shallowRef, computed, h, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import { getBase46Theme } from '../themes/base46';
import { chineseFonts, englishFonts, defaultCodeFont, getDocumentFonts } from '../fonts/options';
import { registerSessionFont, sessionFontOptions, restoreSystemFonts, isSystemFontPending, hasImportedFonts, clearImportedFonts, removeSessionFont } from '../fonts/session';
import { Check, X } from '@vicons/tabler';
import defaultMarkdown from '../../examples/default.md?raw';
import { NButton, NText, NCheckbox, NTooltip, NPopselect, NModal, NCard, NInput, NSelect, useMessage, useDialog } from 'naive-ui';

import { MdEditor, MdPreview } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';

const ADD_LOCAL_FONT = '__add-local-font';

function fontOptions(builtinFonts, script, poolScript = script) {
    const local = sessionFontOptions(poolScript);
    return [
        ...builtinFonts.map(({ value, label }) => ({ value, label })),
        {
            value: `__local-font-heading-${script}`,
            label: '本地字体',
            disabled: true,
            style: { borderTop: '1px solid var(--n-action-divider-color)', marginTop: '4px', paddingTop: '6px' },
        },
        ...local.map(option => ({ ...option, imported: true, poolScript })),
        { value: ADD_LOCAL_FONT, label: '添加本地字体' },
    ];
}

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
        NText,
        NCheckbox,
        NTooltip,
        NPopselect,
        NModal,
        NCard,
        NInput,
        NSelect,
    },
    setup() {
        const message = useMessage();
        const dialog = useDialog();
        const text = ref(defaultMarkdown);
        const store = useStore();
        const activePalette = computed(() => getBase46Theme(store.state.appearanceTheme));
        const documentFonts = computed(() => store.state.documentFonts);
        const selectedChineseFont = computed(() => getDocumentFonts(documentFonts.value).chinese.label);
        const selectedEnglishFont = computed(() => getDocumentFonts(documentFonts.value).english.label);
        const selectedCodeFont = computed(() => getDocumentFonts(documentFonts.value).code.label);
        const chineseFontOptions = computed(() => fontOptions(chineseFonts, 'chinese'));
        const englishFontOptions = computed(() => fontOptions(englishFonts, 'english'));
        const codeFontOptions = computed(() => fontOptions([defaultCodeFont, ...englishFonts], 'code', 'english'));
        const fontUses = (id) => ['chinese', 'english', 'code']
            .filter(script => documentFonts.value[script] === id)
            .map(script => ({ chinese: '中文', english: '英文', code: '代码块' })[script]);
        const deleteFont = (script, id) => {
            if (fontUses(id).length) return;
            try {
                if (!removeSessionFont(script, id)) return;
                store.commit('forgetDocumentFont', id);
                message.success('已删除字体');
            } catch (error) {
                message.error(`删除字体失败：${error.message}`);
            }
        };
        const renderFontLabel = (option, isSelected) => {
            if (!option.imported || isSelected) return option.label;
            const uses = fontUses(option.value);
            const iconPosition = {
                position: 'absolute', right: 'calc(var(--n-option-padding-right) - 7px)',
                top: '50%', transform: 'translateY(-50%)', width: '22px', height: '22px',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            };
            if (uses.length) {
                return h('span', [option.label, h(NTooltip, { trigger: 'hover' }, {
                    trigger: () => h('span', {
                        style: { ...iconPosition, color: 'var(--n-option-check-color)' },
                        onClick: event => event.stopPropagation(),
                    }, [h(Check, { size: 16 })]),
                    default: () => `正用于${uses.join('、')}，请先切换字体`,
                })]);
            }
            return h('span', [option.label, h('button', {
                type: 'button',
                'aria-label': `删除字体 ${option.label}`,
                style: {
                    ...iconPosition, padding: 0, border: 0, borderRadius: '4px',
                    background: 'transparent', color: 'inherit', opacity: 0.7, cursor: 'pointer',
                },
                onMousedown: event => event.stopPropagation(),
                onKeydown: event => event.stopPropagation(),
                onClick: event => {
                    event.preventDefault();
                    event.stopPropagation();
                    deleteFont(option.poolScript, option.value);
                },
            }, [h(X, { size: 15 })])]);
        };
        const hasLocalFonts = computed(() => hasImportedFonts());
        const clearFontCache = () => {
            try {
                clearImportedFonts();
                store.commit('resetDocumentFonts');
                message.success('已清除字体缓存，字体选择已恢复默认');
            } catch (error) {
                message.error(`清除字体缓存失败：${error.message}`);
            }
        };
        const selectedSystemFonts = () => ['chinese', 'english', 'code']
            .map(script => ({ script: script === 'code' ? 'english' : script, id: documentFonts.value[script] }));
        const hasPendingSystemFont = computed(() => selectedSystemFonts()
            .some(({ script, id }) => isSystemFontPending(script, id)));
        const restoringFonts = ref(false);
        const restoreSelectedFonts = async () => {
            restoringFonts.value = true;
            try {
                await restoreSystemFonts(selectedSystemFonts());
            } catch (error) {
                message.warning(`已安装字体尚未恢复：${error.message}`);
            } finally {
                restoringFonts.value = false;
            }
        };
        onMounted(() => { if (hasPendingSystemFont.value) restoreSelectedFonts(); });
        const changeFont = async (script, id) => {
            if (id === ADD_LOCAL_FONT) { openFontImport(script); return; }
            const poolScript = script === 'code' ? 'english' : script;
            try {
                await restoreSystemFonts([{ script: poolScript, id }]);
                store.commit('changeDocumentFont', { script, id });
            } catch (error) {
                message.error(`无法使用已安装字体：${error.message}`);
            }
        };
        const showFontImport = ref(false);
        const importTarget = ref('chinese');
        const importScript = ref('chinese');
        const importLabel = ref('');
        const importFiles = ref({});
        const importingFont = ref(false);
        const fontLicenseConfirmed = ref(false);
        const systemFontSupported = typeof window !== 'undefined' && typeof window.queryLocalFonts === 'function';
        const scanningSystemFonts = ref(false);
        const systemFonts = shallowRef([]);
        const systemFamily = ref(null);
        const systemFaceSelection = ref({});
        const systemFamilyOptions = computed(() => {
            const families = new Map();
            for (const font of systemFonts.value) {
                if (!families.has(font.family)) families.set(font.family, new Set());
                for (const name of [font.fullName, font.postscriptName]) {
                    if (name && name !== font.family) families.get(font.family).add(name);
                }
            }
            return [...families.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([family, aliases]) => ({
                    label: aliases.size ? `${family} · ${[...aliases].join(' · ')}` : family,
                    value: family,
                }));
        });
        const systemFaceOptions = computed(() => systemFonts.value
            .filter(font => font.family === systemFamily.value)
            .map((font, index) => ({ label: `${font.fullName} (${font.style})`, value: index })));
        const importSlots = computed(() => importScript.value === 'chinese'
            ? [{ key: 'regular', label: 'Regular' }, { key: 'bold', label: 'Bold' }]
            : [{ key: 'regular', label: 'Regular' }, { key: 'bold', label: 'Bold' },
                { key: 'italic', label: 'Italic' }, { key: 'boldItalic', label: 'Bold Italic' }]);
        const openFontImport = (target) => {
            importTarget.value = target;
            importScript.value = target === 'code' ? 'english' : target;
            importLabel.value = '';
            importFiles.value = {};
            fontLicenseConfirmed.value = false;
            systemFonts.value = [];
            systemFamily.value = null;
            systemFaceSelection.value = {};
            showFontImport.value = true;
        };
        const scanSystemFonts = async () => {
            scanningSystemFonts.value = true;
            try {
                systemFonts.value = await window.queryLocalFonts();
                if (!systemFonts.value.length) message.warning('浏览器未返回可用的系统字体');
            } catch (error) {
                message.error(error.name === 'NotAllowedError' ? '未获得读取系统字体的权限' : `无法读取系统字体：${error.message}`);
            } finally {
                scanningSystemFonts.value = false;
            }
        };
        const selectSystemFamily = (family) => {
            systemFamily.value = family;
            const faces = systemFonts.value.filter(font => font.family === family);
            const find = (pattern) => {
                const index = faces.findIndex(font => pattern.test(font.style));
                return index < 0 ? null : index;
            };
            systemFaceSelection.value = {
                regular: find(/^(regular|normal|book)$/i) ?? (faces.length ? 0 : null),
                bold: find(/^bold$/i),
                italic: find(/^(italic|oblique)$/i),
                boldItalic: find(/^bold[ -]?(italic|oblique)$/i),
            };
        };
        const applyFont = async (files, label, systemPostscriptNames) => {
            const entry = await registerSessionFont({ script: importScript.value, label, files, systemPostscriptNames });
            store.commit('changeDocumentFont', { script: importTarget.value, id: entry.value });
            showFontImport.value = false;
            message.success('本机字体已应用到预览，PDF 导出也将使用它');
        };
        const useSystemFont = async () => {
            importingFont.value = true;
            try {
                const familyFaces = systemFonts.value.filter(font => font.family === systemFamily.value);
                const files = {};
                const systemPostscriptNames = {};
                for (const slot of importSlots.value) {
                    const index = systemFaceSelection.value[slot.key];
                    if (index === null || index === undefined) continue;
                    const face = familyFaces[index];
                    const blob = await face.blob();
                    files[slot.key] = new File([blob], `${face.postscriptName}.otf`, { type: 'font/otf' });
                    systemPostscriptNames[slot.key] = face.postscriptName;
                }
                await applyFont(files, '', systemPostscriptNames);
            } catch (error) {
                message.error(error.message || '系统字体无法使用');
            } finally {
                importingFont.value = false;
            }
        };
        const selectFontFile = (slot, event) => {
            importFiles.value = { ...importFiles.value, [slot]: event.target.files?.[0] || null };
        };
        const importLocalFont = async () => {
            importingFont.value = true;
            try {
                await applyFont(importFiles.value, importLabel.value);
            } catch (error) {
                message.error(error.message || '字体导入失败');
            } finally {
                importingFont.value = false;
            }
        };
        const keepPdfDark = ref(false);
        const canKeepPdfDark = computed(() => activePalette.value?.type === 'dark');
        const pdfStyleHint = computed(() => {
            if (!activePalette.value) return '选择 Base46 配色后，可决定是否保留深色 PDF。';
            if (!canKeepPdfDark.value) return '当前配色是浅色，PDF 将使用该浅色配色。';
            return '勾选后使用当前深色配色；取消勾选则使用标准浅色 PDF。';
        });
        watch(activePalette, (palette) => {
            if (palette?.type !== 'dark') keepPdfDark.value = false;
        });

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
            const fontSelection = { ...documentFonts.value };
            const pdfPalette = activePalette.value?.type === 'light' || keepPdfDark.value
                ? activePalette.value : null;
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
                await restoreSystemFonts(['chinese', 'english', 'code'].map(script => ({
                    script: script === 'code' ? 'english' : script, id: fontSelection[script],
                })));
                const fontSnapshot = getDocumentFonts(fontSelection);
                const { exportMarkdownToPdf } = await import('../utils/pdf/exportPdf');
                const { cancelled, blob } = await exportMarkdownToPdf(snapshot, {
                    palette: pdfPalette,
                    fonts: fontSnapshot,
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
            keepPdfDark,
            canKeepPdfDark,
            pdfStyleHint,
            documentFonts,
            selectedChineseFont,
            selectedEnglishFont,
            selectedCodeFont,
            chineseFontOptions,
            englishFontOptions,
            codeFontOptions,
            renderFontLabel,
            hasLocalFonts,
            clearFontCache,
            changeFont,
            hasPendingSystemFont,
            restoringFonts,
            restoreSelectedFonts,
            showFontImport,
            importTarget,
            importScript,
            importLabel,
            importFiles,
            importingFont,
            fontLicenseConfirmed,
            systemFontSupported,
            scanningSystemFonts,
            systemFonts,
            systemFamily,
            systemFaceSelection,
            systemFamilyOptions,
            systemFaceOptions,
            scanSystemFonts,
            selectSystemFamily,
            useSystemFont,
            importSlots,
            selectFontFile,
            importLocalFont,
            handleSave,
            exporting,
            handleExportPdf
        }
    }
}
</script>

<style scoped>
.font-import-card {
    width: min(520px, calc(100vw - 32px));
    max-height: calc(100vh - 48px);
    overflow-y: auto;
}

.font-field {
    display: block;
    margin: 12px 0;
}

.font-field input[type="file"] {
    display: block;
    max-width: 100%;
    margin-top: 6px;
}

.font-source {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.font-divider {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--n-border-color);
}

.font-note {
    opacity: .75;
    font-size: 13px;
}

.font-import-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
}
</style>

<style scoped>
.editor-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 8px;
}

.export-hint {
    font-size: 12px;
}

.pdf-dark-control {
    display: inline-flex;
    align-items: center;
}
</style>

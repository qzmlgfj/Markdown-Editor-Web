# Markdown Editor Web

基于 Vue 3、Naive UI 和 [md-editor-v3](https://imzbf.github.io/md-editor-v3/) 的纯前端 Markdown 编辑器，使用 Vite 构建。

PDF 导出使用 pdfmake 在浏览器内直接生成并下载，采用独立文档样式。支持范围和限制见下文；字体来源与许可见 [字体说明](public/fonts/LICENSES.md)。

## 本地运行

建议使用 Node.js 24 LTS（仓库提供 `.nvmrc`），也支持 Node.js 22.13+。

```sh
npm ci
npm run dev
```

`npm run serve` 保留为开发服务器的兼容命令。

```sh
npm run lint     # ESLint 检查
npm run test     # Vitest 单元测试
npm run build    # 构建至 dist/
npm run preview  # 本地预览构建产物
```

将 `dist/` 部署到静态网站服务即可。资源使用相对路径，支持部署到子目录。

## 功能与数据流

- `src/components/Editor.vue`：保存当前 Markdown 文本，提供实时编辑、预览、`.md` 下载，以及“导出 PDF”按钮。
- `src/utils/store.js`：Vuex 管理渲染主题、代码主题；`HeadBar.vue` 提供切换入口。
- `src/App.vue`：管理浅色／深色模式，通过组件属性和 provide/inject 同步到编辑器与导航。
- `src/utils/pdf/`：PDF 导出实现（编排、Markdown 转换、样式、字体、代码块、公式）。
- 浏览器打印：保留独立的浅色 `MdPreview` 与 `@media print` 样式，供用户自行使用浏览器打印（Ctrl/Cmd + P）。这是一条手动后备路径，界面不提供显式入口，也不与 pdfmake 导出共用样式。

当前没有后端、自动保存或本地持久化；刷新页面会恢复示例内容，请先下载 `.md` 保存。图片上传未配置服务端处理。编辑器的公式、图表、代码高亮等扩展默认依赖外部 CDN，使用这些功能需要网络连接。

## PDF 导出

点击编辑器上方的“导出 PDF”，从当前 Markdown 快照生成并下载 PDF。导出不读取网页预览的 DOM、滚动位置或折叠状态，也不套用网页的渲染主题、代码主题与深浅色；PDF 使用自己的一套固定浅色文档样式（A4、无页眉页脚）。

支持范围：

- 标题、段落、粗体、斜体、删除线、行内代码、链接、分隔线。
- 有序／无序列表及常见嵌套、引用；列表内可包含标题、表格、公式等块。
- Markdown 表格（表头、对齐、跨页重复表头）。
- 代码块：真实文本、等宽字体、默认行号、保留缩进与空行、允许自然跨页；超长行自动换行且不重复逻辑行号。
- 独立公式 `$$ ... $$`：由 MathJax 生成为自包含矢量 SVG。代码块内的 `$` / `$$` 按代码输出，不会被当作公式。

字体与加载：

- 正文使用 Noto Sans SC（含中文时）或 Noto Sans（纯拉丁），代码使用 JetBrains Mono，均为 SIL OFL 1.1；来源与许可见 `public/fonts/LICENSES.md`。
- 字体在首次导出时按需加载并由浏览器缓存；纯拉丁文档不加载中文字体，无加粗/斜体内容不加载对应字面，无代码不加载等宽字体。
- 导出前会检查每个字符实际使用的字体；缺字会中止导出并列出字符，不会静默生成方框。
- 生成的 PDF 只嵌入实际用到的字形子集。

已知限制：

- 简单行内公式 `$...$` 支持普通表达式、上下标、常见希腊字母和运算符，以及 `\TeX` / `\LaTeX` 的文字形式；不复刻 TeX 标志的特殊字形。分式、根式、矩阵等复杂命令保留源码，并在下载前弹窗提示，可返回编辑或继续下载。
- 图片、Mermaid、任意 HTML 暂不渲染。图片保留为 `[图片：alt]` 文本并提示；HTML 保留原文，Mermaid 围栏按普通代码输出。
- 导出缺字时弹窗列出字符、Unicode 编码和源文行号，并停止下载；转换降级问题在下载前集中提示。检查针对 PDF 导出，不在每次网页预览更新时弹窗。
- 代码块与行内代码中的中文使用正文字体渲染（等宽字体不含 CJK），因此中文部分不是等宽外观。
- 含中文的文档统一使用 Noto Sans SC，因此其中的斜体（包括拉丁文字）保持正体；纯拉丁文档使用配套斜体字面。
- 导出依赖同源字体资源；首次导出需要网络可用（加载后可缓存复用）。
- 独立公式是矢量图形，不承诺像正文一样被复制或搜索；简单行内公式使用文本排版。

## PDF 导出输入样例

- `examples/pdf-export.md`：PDF 导出开发与回归验证的 Markdown 输入，包含中文正文、列表、引用、表格、93 行代码和独立公式。
- `output/pdf/markdown-export-sample.pdf`：pdfmake + MathJax 的原始效果参考样稿（非编辑器内生成）。
- `output/pdf/markdown-export-browser.pdf`：当前第一版在 Chrome 生产预览中实际导出的样例。

回归关注点：代码逐行完整且顺序正确、跨页后的正文存在、中文字体、公式清晰度、无页眉页脚；Web 预览与打印路径应继续独立工作。

## 依赖升级（2026-09）

- Vue CLI 4 / Webpack 4 / Babel 构建链迁移至 Vite 8 + Vue 插件 6。
- Vue 升级至 3.5，Vuex 升级至 4.1；保留现有状态管理方式。
- md-editor-v3 从 2.x 升级至 6.5，适配具名导入及打印预览。
- Naive UI 升级至 2.45，图标库升级至 0.13。
- ESLint 升级至 10，使用 flat config；移除旧 Babel ESLint parser 和 core-js。
- `vfonts` 保持 0.0.3（本次核对时的最新版本）。实际安装版本以 `package-lock.json` 为准。

## PDF 导出依赖

- `pdfmake`：浏览器内 PDF 引擎，按需动态加载。
- `markdown-it`：Markdown 解析（与 md-editor-v3 同主版本）。
- `mathjax-full`：独立公式转自包含 SVG，运行在 Web Worker 中。
- `fontkit`：读取字体 cmap 用于导出前的缺字检查。
- `vitest`：PDF 转换逻辑的单元测试。

## 第一版验证

已通过 Lint、34 项单元测试和生产构建。Chrome 中验证了子目录部署、英文首次导出、中文行内代码、列表内块、列表起始编号、错误公式反馈、图片占位文本、160 行代码分页及超长代码行。

部署字体约 20 MB，按内容需求加载；首屏不主动加载 PDF 引擎。Safari、其他平台和线上限速环境尚未实测。生产构建仍有大 chunk 提示。

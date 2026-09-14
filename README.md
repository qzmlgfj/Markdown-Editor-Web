# Markdown Editor Web

基于 Vue 3、Naive UI 和 [md-editor-v3](https://imzbf.github.io/md-editor-v3/) 的纯前端 Markdown 编辑器，使用 Vite 构建。

## 本地运行

建议使用 Node.js 24 LTS（仓库提供 `.nvmrc`），也支持 Node.js 22.13+。

```sh
npm ci
npm run dev
```

`npm run serve` 保留为开发服务器的兼容命令。

```sh
npm run lint     # ESLint 检查
npm run build    # 构建至 dist/
npm run preview  # 本地预览构建产物
```

将 `dist/` 部署到静态网站服务即可。资源使用相对路径，支持部署到子目录。

## 功能与数据流

- `src/components/Editor.vue`：保存当前 Markdown 文本，提供实时编辑、预览及 `.md` 下载。
- `src/utils/store.js`：Vuex 管理渲染主题、代码主题；`HeadBar.vue` 提供切换入口。
- `src/App.vue`：管理浅色／深色模式，通过组件属性和 provide/inject 同步到编辑器与导航。
- PDF 导出：使用浏览器打印（Ctrl/Cmd + P），选择“另存为 PDF”。打印时显示独立的浅色 `MdPreview`，沿用当前内容与选中的渲染／代码主题，隐藏导航、编辑框、工具栏、代码块装饰与行号。长代码块允许跨页，超长行自动换行。每页保留上下 12mm、左右 14mm 留白，使用空白页边栏覆盖 Chromium 默认的标题、日期、网址和页码；若其他浏览器仍显示这些信息，请在打印设置中取消“页眉和页脚”。

当前没有后端、自动保存或本地持久化；刷新页面会恢复示例内容，请先下载 `.md` 保存。图片上传未配置服务端处理。编辑器的公式、图表、代码高亮等扩展默认依赖外部 CDN，使用这些功能需要网络连接。

## PDF 导出输入样例

- `examples/pdf-export.md`：用于后续 PDF 导出开发与回归验证的 Markdown 输入，包含中文正文、列表、引用、表格、93 行代码和独立公式。
- `output/pdf/markdown-export-sample.pdf`：对应的 pdfmake + MathJax 初版效果参考。该 PDF 尚未通过编辑器内的导出功能生成。

迁移导出引擎时，应验证代码行顺序、跨页后的正文、中文字体、公式清晰度及页眉页脚；Web 预览应继续独立工作。

## 依赖升级（2026-09）

- Vue CLI 4 / Webpack 4 / Babel 构建链迁移至 Vite 8 + Vue 插件 6。
- Vue 升级至 3.5，Vuex 升级至 4.1；保留现有状态管理方式。
- md-editor-v3 从 2.x 升级至 6.5，适配具名导入及打印预览。
- Naive UI 升级至 2.45，图标库升级至 0.13。
- ESLint 升级至 10，使用 flat config；移除旧 Babel ESLint parser 和 core-js。
- `vfonts` 保持 0.0.3（本次核对时的最新版本）。实际安装版本以 `package-lock.json` 为准。

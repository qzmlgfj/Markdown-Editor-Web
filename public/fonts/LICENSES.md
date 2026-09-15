# 导出字体的来源与许可

本目录的字体用于“预览 PDF”功能（pdfmake 排版），与网页渲染主题无关。

| 文件 | 字体 | 版本/来源 | 许可 |
| --- | --- | --- | --- |
| `NotoSansSC-Regular.otf` | Noto Sans SC Regular | [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk) `Sans/SubsetOTF/SC/`，即 Noto Sans CJK SC 区域子集 | SIL Open Font License 1.1（见 `LICENSE-NotoSansSC.txt`） |
| `NotoSansSC-Bold.otf` | Noto Sans SC Bold | 同上 `Sans/SubsetOTF/SC/` | SIL Open Font License 1.1（见 `LICENSE-NotoSansSC.txt`） |
| `NotoSans-Regular.ttf` | Noto Sans Regular | [notofonts/noto-fonts](https://github.com/notofonts/noto-fonts) `hinted/ttf/NotoSans/` | SIL Open Font License 1.1（见 `LICENSE-NotoSans.txt`） |
| `NotoSans-Bold.ttf` | Noto Sans Bold | 同上 `hinted/ttf/NotoSans/` | SIL Open Font License 1.1（见 `LICENSE-NotoSans.txt`） |
| `NotoSans-Italic.ttf` | Noto Sans Italic | 同上 `hinted/ttf/NotoSans/` | SIL Open Font License 1.1（见 `LICENSE-NotoSans.txt`） |
| `NotoSans-BoldItalic.ttf` | Noto Sans Bold Italic | 同上 `hinted/ttf/NotoSans/` | SIL Open Font License 1.1（见 `LICENSE-NotoSans.txt`） |
| `JetBrainsMono-Regular.ttf` | JetBrains Mono Regular | [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono) `fonts/ttf/` | SIL Open Font License 1.1（见 `LICENSE-JetBrainsMono.txt`） |
| `KaTeX_Main-Regular.ttf` | KaTeX Main | 官方 npm 包 `katex@0.18.7` 的 `dist/fonts/` | SIL OFL 1.1（见 `LICENSE-KaTeX.txt`） |
| `KaTeX_Math-Italic.ttf` | KaTeX Math Italic | 同上 | SIL OFL 1.1（见 `LICENSE-KaTeX.txt`） |
| `MarkdownTeXLogo.ttf` | MarkdownTeXLogo | 从 KaTeX Main 派生的重命名字体子集，用于 TeX/LaTeX 标志 | SIL OFL 1.1（见 `LICENSE-KaTeX.txt`） |

## 说明

- 所有字体均为 SIL OFL 1.1，允许嵌入、分发与再分发。
- Noto Sans SC 采用 SubsetOTF（简体中文区域子集），覆盖约 31000 字形，包含常用汉字、拉丁、数字与常用数学/标点符号，**不含斜体字面**。
- Noto Sans（拉丁）提供 Regular/Bold/Italic/BoldItalic 四个字面，用于纯拉丁文档；中文文档中的拉丁斜体也使用其 Italic/BoldItalic 字面。
- JetBrains Mono 不含 CJK 字形；代码块与行内代码中的中文会改由正文字体渲染，两个字体都不含的字符会命中导出前的缺字检查并给出提示，不会静默生成方框。
- 字体通过同源（`public/fonts/`）提供，导出时按需加载并由浏览器缓存。生成的 PDF 仅嵌入文档实际用到的字形子集，不会包含整份字体。

- 数学字体仅在行内公式需要时加载。`MarkdownTeXLogo` 将 E 下沉、A 缩小抬升并调整字距；可用 `python scripts/build-tex-logo-font.py` 重建（需要 `fonttools==4.65.0`）。原始版权与许可保留，派生字体名称已更改；运行和部署无需 Python。

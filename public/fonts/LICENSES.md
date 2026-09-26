# 导出字体的来源与许可

本目录的 TTF/OTF 正文字体用于“预览 PDF”（pdfmake 排版）；同名字体的 WOFF2 副本用于 Markdown 网页预览和浏览器打印。WOFF2 由原始字体转换，保留原许可与字形覆盖。

| 文件 | 字体 | 版本/来源 | 许可 |
| --- | --- | --- | --- |
| `NotoSansSC-Regular.otf` | Noto Sans SC Regular | [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk) `Sans/SubsetOTF/SC/`，即 Noto Sans CJK SC 区域子集 | SIL Open Font License 1.1（见 `LICENSE-NotoSansSC.txt`） |
| `NotoSansSC-Bold.otf` | Noto Sans SC Bold | 同上 `Sans/SubsetOTF/SC/` | SIL Open Font License 1.1（见 `LICENSE-NotoSansSC.txt`） |
| `NotoSerifSC-Regular.otf`、`NotoSerifSC-Bold.otf` | Noto Serif SC | [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk) `Serif/SubsetOTF/SC/` | SIL Open Font License 1.1（同 `LICENSE-NotoSansSC.txt`） |
| `NotoSans-Regular.ttf` | Noto Sans Regular | [notofonts/noto-fonts](https://github.com/notofonts/noto-fonts) `hinted/ttf/NotoSans/` | SIL Open Font License 1.1（见 `LICENSE-NotoSans.txt`） |
| `NotoSans-Bold.ttf` | Noto Sans Bold | 同上 `hinted/ttf/NotoSans/` | SIL Open Font License 1.1（见 `LICENSE-NotoSans.txt`） |
| `NotoSans-Italic.ttf` | Noto Sans Italic | 同上 `hinted/ttf/NotoSans/` | SIL Open Font License 1.1（见 `LICENSE-NotoSans.txt`） |
| `NotoSans-BoldItalic.ttf` | Noto Sans Bold Italic | 同上 `hinted/ttf/NotoSans/` | SIL Open Font License 1.1（见 `LICENSE-NotoSans.txt`） |
| `NotoSerif-Regular.ttf`、`NotoSerif-Bold.ttf`、`NotoSerif-Italic.ttf`、`NotoSerif-BoldItalic.ttf` | Noto Serif | [notofonts/noto-fonts](https://github.com/notofonts/noto-fonts) `hinted/ttf/NotoSerif/` | SIL Open Font License 1.1（见 `LICENSE-NotoSerif.txt`） |
| `Lato-Regular.ttf`、`Lato-Bold.ttf`、`Lato-Italic.ttf`、`Lato-BoldItalic.ttf` | Lato | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/lato) `ofl/lato/` | SIL Open Font License 1.1（见 `LICENSE-Lato.txt`） |
| `JetBrainsMono-Regular.ttf` | JetBrains Mono Regular | [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono) `fonts/ttf/` | SIL Open Font License 1.1（见 `LICENSE-JetBrainsMono.txt`） |
| `KaTeX_Main-Regular.ttf` | KaTeX Main | 官方 npm 包 `katex@0.18.7` 的 `dist/fonts/` | SIL OFL 1.1（见 `LICENSE-KaTeX.txt`） |
| `KaTeX_Math-Italic.ttf` | KaTeX Math Italic | 同上 | SIL OFL 1.1（见 `LICENSE-KaTeX.txt`） |
| `MarkdownTeXLogo.ttf` | MarkdownTeXLogo | 从 KaTeX Main 派生的重命名字体子集，用于 TeX/LaTeX 标志 | SIL OFL 1.1（见 `LICENSE-KaTeX.txt`） |

## 说明

- 所有字体均为 SIL OFL 1.1，允许嵌入、分发与再分发。
- 两种中文字体均采用简体中文区域子集，包含常用汉字；都不含斜体字面。
- 三种英文字体均提供 Regular/Bold/Italic/BoldItalic 四个字面。混排正文的英文字母、数字及拉丁标点使用所选英文字体。
- JetBrains Mono 不含 CJK 字形；代码块与行内代码中的中文会改由正文字体渲染，两个字体都不含的字符会命中导出前的缺字检查并给出提示，不会静默生成方框。
- 字体通过同源（`public/fonts/`）提供，网页使用 WOFF2，导出时按需加载原始 TTF/OTF 并由浏览器缓存。生成的 PDF 仅嵌入文档实际用到的字形子集，不会包含整份字体。

- 数学字体仅在行内公式需要时加载。`MarkdownTeXLogo` 将 E 下沉、A 缩小抬升并调整字距；可用 `python scripts/build-tex-logo-font.py` 重建（需要 `fonttools==4.65.0`）。原始版权与许可保留，派生字体名称已更改；运行和部署无需 Python。

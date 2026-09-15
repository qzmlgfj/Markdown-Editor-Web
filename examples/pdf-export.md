# 把技术笔记变成一份好读的 PDF

这是一份 Markdown 导出样稿。内容包含中文正文、英文术语、列表、表格、常用公式和一个跨页代码块，重点观察日常技术笔记的阅读体验。

## 01 / 正文与信息层次

写笔记时，我们希望注意力停留在内容上。导出以后，标题应该容易定位，段落之间留有呼吸空间，代码也应该保留清晰的缩进。**可复制的正文**与稳定的分页，比把整个网页截成一张长图更实用。

> 一份好的导出文档，不需要把编辑器的按钮、网址和日期一起带走。

- 标题与正文保持一致的对齐关系。
- 中文、英文和数字混排，例如 Vue 3、UTF-8 与 2026。
- 代码沿用等宽字体，长内容可以连续跨页。

| 内容类型 | 这份样稿的处理 |
| --- | --- |
| 正文与列表 | 真实 PDF 文字，可选择与搜索 |
| 长代码块 | 文本分页，保留缩进与行号 |
| 独立公式 | MathJax 生成矢量图形 |
| 页眉与页脚 | 不添加标题、网址、日期或页码 |

下划线 <u>用于强调</u>；H<sub>2</sub>O 与 10<sup>26</sup> 使用上下标。中文也可以混排 <i>italic Latin</i> 和 <b><i>bold italic</i></b>。

支持 $\TeX$ 公式如 $E=mc^2$，以及 $x_i + \alpha \leq 10$；$\LaTeX$ 标志也应保留衬线造型。

## 02 / 日常公式

先看一个常见的加权平均。它包含求和、上下标和分式，用于检查公式的清晰度与段落间距。

$$
\bar{x}_{w}=\frac{\sum_{i=1}^{n}w_i x_i}{\sum_{i=1}^{n}w_i}
$$

正态分布的概率密度包含指数和根号；这里保留独立公式的自然尺寸，不用位图截图。

$$
f(x)=\frac{1}{\sigma\sqrt{2\pi}}\exp\!\left(-\frac{(x-\mu)^2}{2\sigma^2}\right)
$$

## 03 / 一个连续跨页的代码块

下面是一个完整的本地笔记检索示例。它对标题命中赋予更高权重，并为正文命中设置上限。这段代码不手动插入分页符，可以检查从一页到下一页时是否漏行、错序或截断。

```javascript
// A small search utility for a local Markdown notebook.
// All filtering stays local; source notes are never modified.

const defaults = {
  limit: 20,
  minScore: 0,
  caseSensitive: false,
};

function normalize(value, caseSensitive = false) {
  const text = String(value ?? '').trim();
  return caseSensitive ? text : text.toLocaleLowerCase();
}

function tokenize(query) {
  return [...new Set(query.split(/\s+/).filter(Boolean))];
}

function countMatches(text, token) {
  let count = 0;
  let offset = 0;

  while (offset < text.length) {
    const index = text.indexOf(token, offset);
    if (index === -1) break;
    count += 1;
    offset = index + token.length;
  }

  return count;
}

function scoreNote(note, tokens, options) {
  const title = normalize(note.title, options.caseSensitive);
  const body = normalize(note.body, options.caseSensitive);
  let score = 0;

  for (const token of tokens) {
    const titleHits = countMatches(title, token);
    const bodyHits = countMatches(body, token);
    score += titleHits * 3 + Math.min(bodyHits, 10);
  }

  return score;
}

function makeSnippet(body, token, radius = 48) {
  const text = String(body ?? '');
  const index = text.toLocaleLowerCase().indexOf(token);
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, start + radius * 2);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return prefix + text.slice(start, end) + suffix;
}

export function searchNotes(notes, query, overrides = {}) {
  const options = { ...defaults, ...overrides };
  const normalized = normalize(query, options.caseSensitive);
  const tokens = tokenize(normalized);
  if (tokens.length === 0) return [];

  const matches = [];
  for (const note of notes) {
    const score = scoreNote(note, tokens, options);
    if (score <= options.minScore) continue;

    matches.push({
      id: note.id,
      title: note.title,
      score,
      snippet: makeSnippet(note.body, tokens[0]),
    });
  }

  matches.sort((left, right) => {
    const scoreDifference = right.score - left.score;
    if (scoreDifference !== 0) return scoreDifference;
    return String(left.id).localeCompare(String(right.id));
  });

  return matches.slice(0, options.limit);
}

// A caller can use the same function for live previews.
const notes = [
  { id: 'a', title: 'Markdown export', body: 'Keep text searchable.' },
  { id: 'b', title: 'Code pagination', body: 'Allow code to cross pages.' },
];

const results = searchNotes(notes, 'code', { limit: 5 });
console.log(JSON.stringify(results, null, 2));
// END_OF_CODE
```

代码后的正文应该紧接着出现。看到这一段，说明文档没有把后续内容遗留在代码容器之外。

## 04 / 矩阵与多行推导

向量和矩阵也是技术笔记中的常见内容。下面用二维线性变换检验括号大小和列对齐。

$$
\begin{pmatrix}y_1\\y_2\end{pmatrix}
=\begin{pmatrix}a&b\\c&d\end{pmatrix}
\begin{pmatrix}x_1\\x_2\end{pmatrix}
$$

再放一组简短推导，检查等号对齐与多行公式的垂直间距。

$$
\begin{aligned}
\mathcal{L}(\theta)&=\frac{1}{n}\sum_{i=1}^{n}(y_i-\theta x_i)^2\\
\frac{\partial\mathcal{L}}{\partial\theta}&=-\frac{2}{n}\sum_{i=1}^{n}x_i(y_i-\theta x_i)
\end{aligned}
$$

## 05 / 导出后的检查

- 中文是否清楚，正文是否能够选中复制。
- 长代码是否连续，末尾的 END_OF_CODE 是否完整保留。
- 公式放大后是否清晰，矩阵和等号是否对齐。
- 每页是否保留留白，是否没有多余的页眉页脚。

这份样稿使用独立的文档样式。它演示的是 pdfmake 排版与 MathJax 公式的组合效果，尚未接入编辑器的导出按钮。

全文结束。

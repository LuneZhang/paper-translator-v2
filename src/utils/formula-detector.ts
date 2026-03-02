/**
 * 公式检测与保护模块（前端）
 * 
 * 识别文本中的数学公式、化学式、代码等，替换为占位符保护不被翻译。
 * 翻译完成后再还原。
 */

/** 公式匹配规则（按优先级排序） */
const FORMULA_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  // LaTeX 行间公式: $$...$$ 或 \[...\]
  { name: 'display-math', pattern: /\$\$[\s\S]+?\$\$/g },
  { name: 'display-math-bracket', pattern: /\\\[[\s\S]+?\\\]/g },
  // LaTeX 环境: \begin{equation}...\end{equation} 等
  { name: 'latex-env', pattern: /\\begin\{(?:equation|align|gather|multline|eqnarray|cases|matrix|bmatrix|pmatrix|vmatrix|array)\*?\}[\s\S]+?\\end\{(?:equation|align|gather|multline|eqnarray|cases|matrix|bmatrix|pmatrix|vmatrix|array)\*?\}/g },
  // LaTeX 行内公式: $...$ 或 \(...\)
  { name: 'inline-math', pattern: /\$(?!\s)(?:[^$\\]|\\.)+?(?<!\s)\$/g },
  { name: 'inline-math-paren', pattern: /\\\([\s\S]+?\\\)/g },
  // LaTeX 命令序列（如 \alpha, \frac{}{}, \sqrt{} 等）
  { name: 'latex-cmd', pattern: /\\(?:frac|sqrt|sum|prod|int|lim|inf|sup|max|min|log|ln|exp|sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|partial|nabla|Delta|Gamma|Lambda|Omega|Sigma|Theta|alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|varepsilon|varphi|cdot|times|div|pm|mp|leq|geq|neq|approx|equiv|sim|propto|infty|forall|exists|in|notin|subset|supset|cup|cap|wedge|vee|oplus|otimes|rightarrow|leftarrow|Rightarrow|Leftarrow|leftrightarrow|uparrow|downarrow|mapsto|hat|bar|vec|dot|ddot|tilde|overline|underline|overbrace|underbrace)(?:\{[^}]*\})*(?:\^[{]?[^}\s]*[}]?)?(?:_[{]?[^}\s]*[}]?)?/g },
  // 独立数学表达式：变量关系式（如 x = 5, n ≥ 2, O(n log n)）
  { name: 'math-expr', pattern: /\b[A-Za-z]\s*[=≈≠≤≥<>±∓×÷∝]\s*[0-9A-Za-z.+\-*/^()]+/g },
  // O-notation
  { name: 'o-notation', pattern: /[OΘΩo]\s*\([^)]+\)/g },
  // 化学式（如 H₂O, CO₂, NaCl, CH₃COOH）
  { name: 'chemical', pattern: /\b[A-Z][a-z]?(?:[₀₁₂₃₄₅₆₇₈₉]+|[0-9]+)*(?:[A-Z][a-z]?(?:[₀₁₂₃₄₅₆₇₈₉]+|[0-9]+)*)+\b/g },
  // 带单位的数值（如 100 MHz, 3.14 m/s, 10^6）
  { name: 'unit-value', pattern: /\b\d+(?:\.\d+)?(?:\s*[×x]\s*10\s*\^\s*[{]?\d+[}]?)?\s*(?:Hz|kHz|MHz|GHz|THz|nm|μm|mm|cm|km|mg|kg|mol|cd|Pa|kPa|MPa|GPa|eV|keV|MeV|GeV|TeV|K|°C|°F|dB|bps|Mbps|Gbps|FLOPS|fps|px|ms|μs|ns|rad|sr|lm|lx|Bq|Gy|Sv|mol\/L|m\/s|m\/s²|kg\/m³|J\/mol|W\/m²)\b/g },
  // 参考文献编号 [1], [2,3], [1-5], (Author et al., 2024)
  { name: 'citation', pattern: /\[[\d,\s\-–]+\]/g },
  { name: 'citation-author', pattern: /\([A-Z][a-z]+(?:\s+(?:et\s+al\.|and\s+[A-Z][a-z]+))?,?\s*\d{4}[a-z]?\)/g },
  // 图表编号 Figure 1, Table 2, Fig. 3, Eq. (1)
  { name: 'figure-ref', pattern: /(?:Figure|Fig\.|Table|Tab\.|Equation|Eq\.|Algorithm|Alg\.|Theorem|Thm\.|Lemma|Corollary|Proposition|Prop\.|Definition|Def\.)\s*[\d.]+(?:\s*\([a-z]\))?/gi },
  // Unicode 数学符号独立出现
  { name: 'math-symbol', pattern: /[∀∃∄∅∈∉∋∌⊂⊃⊄⊅⊆⊇⊈⊉⊊⊋∪∩∧∨⊕⊗⊥∥∠∡∢∏∑∫∬∭∮∯∰∇∂√∛∜∞≈≉≠≡≢≤≥≪≫⊢⊣⊤⊥⊨⊩⊪⊫⊬⊭⊮⊯→←↑↓↔↕↦⇒⇐⇑⇓⇔⇕ℂℍℕℙℚℝℤℵℶ]/g },
]

export interface FormulaProtectionResult {
  /** 替换后的文本（公式被占位符替代） */
  cleanText: string
  /** 占位符到原始公式的映射 */
  formulas: Array<{ placeholder: string; original: string }>
}

/**
 * 保护文本中的公式，替换为占位符
 */
export function protectFormulas(text: string): FormulaProtectionResult {
  const formulas: Array<{ placeholder: string; original: string }> = []
  let cleanText = text
  let formulaIndex = 0

  // 记录已被保护的区域，防止重叠匹配
  const protectedRanges: Array<[number, number]> = []

  for (const { pattern } of FORMULA_PATTERNS) {
    // 每次从头开始匹配（因为 cleanText 可能已被修改）
    const regex = new RegExp(pattern.source, pattern.flags)
    const matches: Array<{ match: string; index: number }> = []
    let m: RegExpExecArray | null

    while ((m = regex.exec(cleanText)) !== null) {
      // 检查是否已在保护区域内
      const start = m.index
      const end = start + m[0].length
      const overlaps = protectedRanges.some(
        ([rs, re]) => start < re && end > rs
      )
      if (!overlaps && m[0].trim().length > 0) {
        matches.push({ match: m[0], index: start })
      }
    }

    // 从后往前替换，避免索引偏移
    for (let i = matches.length - 1; i >= 0; i--) {
      const { match, index } = matches[i]!
      const placeholder = `<formula_${formulaIndex}>`
      formulas.push({ placeholder, original: match })
      cleanText = cleanText.slice(0, index) + placeholder + cleanText.slice(index + match.length)
      protectedRanges.push([index, index + placeholder.length])
      formulaIndex++
    }
  }

  return { cleanText, formulas }
}

/**
 * 还原翻译文本中的公式占位符
 */
export function restoreFormulas(
  translatedText: string,
  formulas: Array<{ placeholder: string; original: string }>
): string {
  let result = translatedText
  for (const { placeholder, original } of formulas) {
    result = result.replace(placeholder, original)
  }
  return result
}

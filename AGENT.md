# Paper Translator — 项目指导文档

> 一个本地运行的学术论文双语对照翻译器。拖入 PDF 即可自动翻译，左侧原始 PDF，右侧中文译文，段落级对照高亮，极简现代风设计。

---

## 一、产品定位与差异化

### 1.1 核心定位

面向中国学术研究者的 PDF 论文翻译工具，强调「拖入即翻译、双栏对照阅读」的极简体验。

### 1.2 竞品分析与差异化

| 竞品痛点 | 本产品解决方案 |
|---------|--------------|
| 沉浸式翻译：论文公式被翻译后变成乱码 | **公式智能识别与保护**：识别 LaTeX 公式、行内/行间数学符号，一律保留原文不翻译 |
| 沉浸式翻译：浏览器插件形态，依赖在线 PDF 查看器 | **独立本地应用**：本地运行，原生 PDF.js 渲染，不依赖浏览器插件生态 |
| 知云文献翻译：界面陈旧，交互粗糙 | **极简现代风设计**：Notion/Linear 级别的视觉与交互品质 |
| DeepL Doc：翻译后失去原文对照 | **实时段落级双向对照高亮 + 同步滚动** |
| 通用翻译工具：不理解学术语境 | **翻译上下文注入**：将论文标题/摘要作为上下文传给 LLM，提升术语翻译准确性 |
| 通用翻译工具：术语不一致 | **术语表管理**：用户可定义学科术语对照表，翻译时强制使用指定译法 |

### 1.3 公式保护策略（核心差异化）

这是区别于竞品最重要的技术特性，必须严格实现：

**需要保护的内容（不翻译，保留原文）：**

- LaTeX 行间公式：`$$...$$`、`\[...\]`、`\begin{equation}...\end{equation}` 等
- LaTeX 行内公式：`$...$`、`\(...\)`
- 独立数学符号和表达式：如 `α`, `β`, `∑`, `∫`, `≥`, `→` 等
- 变量与单位：如 `x = 5`, `100 MHz`, `O(n log n)`
- 化学式：如 `H₂O`, `CO₂`, `NaCl`
- 代码片段和伪代码块
- 参考文献编号：如 `[1]`, `[2,3]`, `(Smith et al., 2024)`
- 表格中的纯数值数据
- 图表编号：如 `Figure 1`, `Table 2`（编号部分保留，描述文字翻译）

**实现方式：**

1. 文本提取后，使用正则匹配标记所有公式/符号区域为 `<formula>` 占位符
2. 仅将纯文本部分发送给翻译引擎
3. 翻译结果返回后，将 `<formula>` 占位符还原为原始公式
4. 在右侧译文面板中，公式以等宽字体/斜体样式渲染，与译文形成视觉区分

---

## 二、技术栈

| 层级 | 技术 | 版本要求 | 说明 |
|------|------|---------|------|
| 前端框架 | Vue 3 | ^3.5 | Composition API + `<script setup>` SFC |
| 语言 | TypeScript | ^5.0 | 严格模式 |
| 构建工具 | Vite | ^6.0 | 开发服务器 + 生产构建 |
| CSS | Tailwind CSS | ^4.0 | 原子化 CSS |
| 状态管理 | Pinia | ^2.0 | Vue 官方状态管理 |
| PDF 渲染 | pdfjs-dist | ^4.0 | Mozilla PDF.js 的 npm 分发包 |
| 后端 | Express | ^4.21 | Node.js HTTP 服务器 |
| 运行时 | tsx | 最新 | 直接运行 TypeScript 后端代码 |
| AI 翻译 | @google/generative-ai | 最新 | Gemini API 官方 SDK |
| 备用翻译 | google-translate-api-x | 最新 | Google Translate 免费方案 |
| 本地存储 | IndexedDB (idb) | 最新 | 翻译历史 + 缓存 |
| HTTP 客户端 | 原生 fetch | - | 前后端通信 |

---

## 三、功能规格

### 3.1 核心功能（P0-P3）

#### F01 - PDF 拖拽上传

- 全窗口拖拽热区，拖入时显示优雅的视觉反馈（边框高亮 + 半透明遮罩 + 图标提示）
- 同时支持点击按钮选择文件
- 文件大小限制：100MB
- 仅接受 `.pdf` 格式，其他格式友好提示拒绝
- 上传后立即触发自动翻译流程

#### F02 - PDF 原文渲染（左栏）

- 使用 PDF.js 逐页渲染为 Canvas
- 支持缩放（Ctrl+滚轮 / 按钮）
- 支持页码导航（输入页码跳转 / 上下翻页）
- 渲染时同步在 Canvas 上方叠加透明文本层（textLayer），用于段落定位和高亮
- 当前页码指示器

#### F03 - 自动翻译与流式渲染（右栏）

- **自动触发**：PDF 加载完成后自动开始翻译，无需用户手动操作
- **视口优先策略**：优先翻译用户当前可见页面，再向前后页面扩展
- **流式渲染**：翻译结果逐段实时渲染到右侧面板
- **进度指示**：顶部显示整体翻译进度条（已翻译页数/总页数）
- **暂停/继续**：用户可随时暂停翻译以节省 API 配额
- **公式保护**：自动识别并保留数学公式、化学式、代码等，不翻译
- **翻译上下文**：将论文标题和摘要作为翻译上下文传给 Gemini，提升术语准确性
- **缓存命中**：若 IndexedDB 中已有该 PDF 的翻译缓存，直接加载，跳过翻译

#### F04 - 段落级对照高亮

- 鼠标悬停右侧某译文段落时，左侧 PDF 对应区域同步高亮（柔和蓝色半透明遮罩）
- 反向同理：悬停左侧原文段落，右侧对应译文高亮
- 高亮过渡动画：150ms ease-out

#### F05 - 左右同步滚动

- 左侧 PDF 滚动时，右侧译文自动跟随到对应段落位置
- 反向同理
- 提供开关按钮，允许关闭同步滚动以独立浏览
- 默认开启

### 3.2 重要功能（P4-P5）

#### F06 - 段落级重译

- 每个译文段落右上角显示刷新图标（hover 时才显示，不干扰阅读）
- 点击后仅重新翻译该段落，其余不变
- 重译时段落显示加载骨架屏效果

#### F07 - API Key 引导配置

- 首次打开应用时显示优雅的全屏引导页
- 分步引导：欢迎 → 填写 Gemini API Key → 选择默认模型 → 完成
- API Key 存储在浏览器 localStorage（加密存储）
- 提供「测试连接」按钮验证 Key 有效性
- 后续可在设置面板修改

#### F08 - 设置面板

- 侧边抽屉式面板，右侧滑入
- 内容分组：
  - **翻译引擎**：Gemini Flash / Flash-Lite / Google Translate 切换
  - **API Key 管理**：查看（脱敏）/ 修改 / 测试
  - **配额状态**：当日已使用次数 / 剩余次数，可视化进度条
  - **译文字号**：A- / A+ 调节，范围 14px - 24px
  - **同步滚动**：开关
  - **主题**：亮色 / 暗色 / 跟随系统

#### F09 - 翻译引擎与配额管理

- **自动切换逻辑**：
  1. 优先使用 Gemini 2.5 Flash（100次/天）
  2. Flash 额度耗尽 → 自动切换 Gemini 2.5 Flash-Lite（1000次/天）
  3. Flash-Lite 也耗尽 → 提示用户手动切换 Google Translate 或等待次日重置
- **配额计数**：本地 localStorage 记录，以自然日为周期重置
- **配额预警**：剩余 10% 时在 UI 顶部显示温和提示

### 3.3 增强功能（P6-P7）

#### F10 - 翻译历史与缓存管理

- IndexedDB 存储每篇翻译过的论文：
  - 文件名、文件哈希（用于识别重复文件）、翻译时间
  - 翻译结果全文（段落数组）
  - 阅读进度（页码 + 滚动位置）
  - 占用空间大小
- **历史列表**：侧边面板展示，按时间倒序
- **缓存清理**：
  - 单条删除：每条记录提供删除按钮（图标，hover 显示）
  - 批量删除：支持多选 + 批量删除
  - 全部清空：需二次确认弹窗
  - **安全保护**：当前正在打开/翻译的文档标记为 `active`，自动跳过清理。UI 上显示「使用中」标签，删除按钮置灰不可点击
  - 底部显示总占用空间统计

#### F11 - 阅读进度记忆

- 自动保存当前阅读位置（页码 + 滚动偏移量）
- 从历史记录打开论文时，自动恢复到上次阅读位置
- 轻量 toast 提示「已恢复到上次阅读位置」

#### F12 - 术语表管理

- 设置中独立的术语表管理页面
- 支持添加/编辑/删除术语对（英文 → 中文）
- 支持 CSV 导入/导出
- 翻译时将术语表注入到 Gemini prompt 中，要求使用指定译法
- 术语表中的术语在译文中以特殊样式标记（如下划线点缀），hover 显示原文

#### F13 - 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + O` | 打开文件选择器 |
| `Ctrl + D` | 切换暗色/亮色主题 |
| `Ctrl + G` | 打开/关闭术语表 |
| `Ctrl + H` | 打开/关闭历史面板 |
| `Ctrl + ,` | 打开设置面板 |
| `PageUp / PageDown` | PDF 翻页 |
| `Space` | 暂停/继续翻译 |

#### F14 - 译文可选可复制

- 右侧译文面板全文本可选中、可复制
- 复制时自动清除内部格式标记，输出纯净文本
- 复制成功后显示轻量 toast 反馈

### 3.4 打磨（P8）

#### F15 - 微交互与动画

- 页面切换：淡入淡出 + 微位移（translateY 8px）
- 按钮 hover：背景色渐变 150ms
- 面板展开/收起：300ms cubic-bezier 滑动
- 拖拽上传区域：边框呼吸动画
- 翻译中段落：优雅的骨架屏闪烁
- 进度条：流畅的宽度过渡

#### F16 - 响应式适配

- 最小支持宽度：1024px（论文阅读是桌面场景）
- 窗口过窄时自动切换为上下布局（PDF 在上，译文在下）
- 分栏比例可拖拽调节，默认 50:50

---

## 四、UI 设计规范

### 4.1 设计原则

- **极简克制**：每个元素都有存在的理由，没有装饰性冗余
- **信息层次**：通过字号、色重、间距建立清晰的视觉层级
- **安静阅读**：UI 退居幕后，内容为王，控件不喧宾夺主
- **优雅反馈**：所有交互都有微妙但可感知的响应

### 4.2 色彩系统

**亮色主题：**

| 用途 | 色值 | Tailwind |
|------|------|----------|
| 页面背景 | `#FAFAFA` | `gray-50` |
| 面板背景 | `#FFFFFF` | `white` |
| 主文本 | `#1A1A1A` | `gray-900` |
| 次要文本 | `#6B7280` | `gray-500` |
| 边框/分割线 | `#E5E7EB` | `gray-200` |
| 强调色 | `#6366F1` | `indigo-500` |
| 强调色悬停 | `#4F46E5` | `indigo-600` |
| 对照高亮 | `#EEF2FF` | `indigo-50` |
| 成功 | `#10B981` | `emerald-500` |
| 警告 | `#F59E0B` | `amber-500` |
| 错误 | `#EF4444` | `red-500` |

**暗色主题：**

| 用途 | 色值 | Tailwind |
|------|------|----------|
| 页面背景 | `#0F0F0F` | 自定义 |
| 面板背景 | `#1A1A1A` | 自定义 |
| 主文本 | `#F5F5F5` | `gray-100` |
| 次要文本 | `#9CA3AF` | `gray-400` |
| 边框/分割线 | `#2D2D2D` | 自定义 |
| 强调色 | `#818CF8` | `indigo-400` |
| 对照高亮 | `#1E1B4B` | `indigo-950` |

### 4.3 字体

```css
/* 西文 */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* 中文 */
font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;

/* 公式/代码 */
font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

### 4.4 间距与圆角

- 组件间距：基于 4px 倍数（8, 12, 16, 24, 32, 48）
- 卡片圆角：`rounded-xl`（12px）
- 按钮圆角：`rounded-lg`（8px）
- 输入框圆角：`rounded-lg`（8px）
- 弹窗圆角：`rounded-2xl`（16px）

### 4.5 阴影

- 卡片/面板：`shadow-sm`（极浅，仅做层次区分）
- 弹窗/浮层：`shadow-xl`
- 暗色主题下不使用阴影，改用边框区分层次

### 4.6 关键界面布局

```
┌──────────────────────────────────────────────────────────┐
│  [Logo] Paper Translator    [进度条]    [☀/🌙] [⚙] [📋]  │  ← 顶栏 48px
├────────────────────────┬─────────────────────────────────┤
│                        │                                 │
│                        │                                 │
│    PDF 原文渲染区       │     翻译文本渲染区               │
│    (PDF.js Canvas)     │     (段落列表，可滚动)           │
│                        │                                 │
│                        │                                 │
│    ← 页码导航 →        │     [A-] 字号 [A+]              │
│                        │                                 │
├────────────────────────┴─────────────────────────────────┤
│  Powered by Gemini  |  配额: Flash 87/100               │  ← 底栏 32px
└──────────────────────────────────────────────────────────┘
```

**空状态（未上传文件时）：**

```
┌──────────────────────────────────────────────────────────┐
│  [Logo] Paper Translator                   [☀/🌙] [⚙]   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                                                          │
│              ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐                  │
│                                                          │
│              │   📄                    │                  │
│                  拖拽 PDF 论文到此处                       │
│              │   或 点击选择文件        │                  │
│                                                          │
│              │   支持 .pdf 格式        │                  │
│                  最大 100MB                               │
│              └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                  │
│                                                          │
│                                                          │
│         [最近翻译]                                        │
│         ├── Attention Is All You Need.pdf    2h ago       │
│         ├── BERT: Pre-training of Deep...    1d ago       │
│         └── GPT-4 Technical Report.pdf       3d ago       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 五、项目结构

```
paper-translator/
├── AGENT.md                              # 本文档 - 项目指导
├── package.json                          # 项目依赖与脚本
├── tsconfig.json                         # 前端 TS 配置
├── tsconfig.node.json                    # 后端/构建 TS 配置
├── vite.config.ts                        # Vite 构建配置
├── index.html                            # 入口 HTML
│
├── server/                               # ===== 后端服务 =====
│   ├── index.ts                          # Express 入口，端口 3001
│   ├── routes/
│   │   └── translate.ts                  # POST /api/translate - 翻译路由
│   └── services/
│       ├── gemini.ts                     # Gemini API 封装（Flash + Flash-Lite）
│       ├── google-translate.ts           # Google Translate 备用引擎
│       └── quota-manager.ts             # 配额计数与自动切换
│
├── src/                                  # ===== 前端源码 =====
│   ├── main.ts                           # Vue 应用入口
│   ├── App.vue                           # 根组件
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppHeader.vue             # 顶栏：Logo + 进度 + 工具按钮
│   │   │   ├── AppFooter.vue             # 底栏：引擎状态 + 配额
│   │   │   ├── SplitPane.vue             # 可拖拽分栏（响应式：宽屏左右/窄屏上下）
│   │   │   └── EmptyState.vue            # 空状态：拖拽上传引导
│   │   │
│   │   ├── pdf/
│   │   │   ├── PdfDropZone.vue           # 全局拖拽区域
│   │   │   ├── PdfViewer.vue             # PDF.js Canvas 渲染 + 文本层
│   │   │   └── PdfPageNav.vue            # 页码导航控件
│   │   │
│   │   ├── translation/
│   │   │   ├── TranslationPanel.vue      # 译文段落列表（含虚拟滚动）
│   │   │   └── TranslationParagraph.vue  # 单个译文段落（含重译按钮）
│   │   │
│   │   ├── settings/
│   │   │   ├── SettingsDrawer.vue        # 设置抽屉面板
│   │   │   ├── ApiKeySetup.vue           # 首次引导 / API Key 管理
│   │   │   ├── EngineSelector.vue        # 翻译引擎选择
│   │   │   ├── QuotaDisplay.vue          # 配额可视化
│   │   │   ├── FontSizeControl.vue       # 字号调节
│   │   │
│   │   ├── glossary/
│   │   │   └── GlossaryManager.vue       # 术语表管理面板
│   │   │
│   │   ├── history/
│   │   │   ├── HistoryPanel.vue          # 历史记录列表
│   │   │   └── CacheManager.vue          # 缓存清理（空间统计 + 批量删除）
│   │   │
│   │   └── common/
│   │       ├── Toast.vue                 # 轻量通知
│   │       ├── ConfirmDialog.vue         # 确认弹窗
│   │       ├── SkeletonLoader.vue        # 骨架屏
│   │       └── IconButton.vue            # 图标按钮
│   │
│   ├── composables/                      # ===== 组合式函数 =====
│   │   ├── usePdfRenderer.ts             # PDF.js 渲染逻辑
│   │   ├── usePdfTextExtractor.ts        # PDF 文本提取
│   │   ├── useTranslation.ts             # 翻译流程控制（自动翻译 + 视口优先）
│   │   ├── useSyncScroll.ts              # 双栏同步滚动
│   │   ├── useParagraphHighlight.ts      # 段落对照高亮
│   │   ├── useTheme.ts                   # 主题管理
│   │   ├── useKeyboard.ts               # 键盘快捷键
│   │   └── useToast.ts                   # Toast 通知
│   │
│   ├── stores/                           # ===== Pinia 状态 =====
│   │   ├── document.ts                   # 当前文档状态（PDF 数据、页码、段落映射）
│   │   ├── translation.ts               # 翻译状态（进度、结果、暂停/继续）
│   │   ├── settings.ts                   # 用户设置（API Key、引擎、字号、主题）
│   │   ├── history.ts                    # 翻译历史
│   │   └── glossary.ts                   # 术语表
│   │
│   ├── services/                         # ===== 前端服务 =====
│   │   ├── api.ts                        # 后端 API 调用封装
│   │   ├── indexeddb.ts                  # IndexedDB 操作封装（idb）
│   │   └── file-hash.ts                 # 文件哈希计算（用于缓存识别）
│   │
│   ├── types/                            # ===== 类型定义 =====
│   │   ├── pdf.ts                        # PDF 相关类型
│   │   ├── translation.ts               # 翻译相关类型
│   │   └── settings.ts                  # 设置相关类型
│   │
│   ├── utils/                            # ===== 工具函数 =====
│   │   ├── formula-detector.ts           # 前端公式检测（辅助渲染）
│   │   ├── text-segmenter.ts             # 文本分段（按段落切分）
│   │   └── format.ts                     # 格式化工具（文件大小、时间等）
│   │
│   └── styles/
│       └── main.css                      # Tailwind 入口 + CSS 变量 + 自定义样式
│
└── public/
    └── favicon.svg                       # 应用图标
```

---

## 六、API 设计

### 6.1 翻译接口

```
POST /api/translate
Content-Type: application/json

Request:
{
  "text": string,              // 待翻译文本（已移除公式的纯文本）
  "context": { "title"?: string, "abstract"?: string },  // 论文标题 + 摘要（翻译上下文）
  "glossary": Record<string, string>,  // 术语表
  "engine": "gemini-flash" | "gemini-flash-lite" | "google-translate",
  "apiKey": string             // Gemini API Key
}

Response:
{
  "translation": string,       // 翻译结果
  "engine": string,            // 实际使用的引擎
  "quota": {
    "flash": { "used": number, "limit": number },
    "flashLite": { "used": number, "limit": number }
  }
}
```

### 6.2 配额查询接口

```
GET /api/quota

Response:
{
  "flash": { "used": number, "limit": 100, "resetAt": string },
  "flashLite": { "used": number, "limit": 1000, "resetAt": string }
}
```

### 6.3 连接测试接口

```
POST /api/test-connection
Content-Type: application/json

Request:
{
  "apiKey": string,
  "engine": string
}

Response:
{
  "success": boolean,
  "message": string
}
```

---

## 七、Gemini Prompt 设计

### 7.1 翻译 Prompt

```
你是一位专业的学术论文翻译专家，精通 {学科领域} 领域的中英文术语。

请将以下英文学术论文段落翻译为中文，要求：
1. 保持学术论文的正式语体
2. 专业术语翻译准确，参考以下术语表：
   {术语表内容}
3. 文本中的 <formula_N> 占位符代表数学公式，请原样保留，不要翻译或修改
4. 参考文献引用（如 [1], [2,3]）原样保留
5. 图表编号（Figure X, Table X）中的编号保留，描述性文字翻译
6. 译文流畅自然，符合中文学术写作习惯

论文标题：{title}
论文摘要：{abstract}

待翻译段落：
{text}
```

---

## 八、数据模型

### 8.1 IndexedDB Schema

```typescript
// 数据库名：PaperTranslatorDB
// 版本：1

// Object Store: translations
interface TranslationRecord {
  id: string;                    // 文件 SHA-256 哈希
  fileName: string;              // 原始文件名
  fileSize: number;              // 文件大小（字节）
  totalPages: number;            // 总页数
  translatedAt: number;          // 翻译时间戳
  lastOpenedAt: number;          // 上次打开时间戳
  readingProgress: {
    page: number;                // 当前页码
    scrollTop: number;           // 滚动位置
  };
  paragraphs: TranslatedParagraph[];  // 翻译结果
  context: {
    title: string;               // 论文标题
    abstract: string;            // 论文摘要
  };
  cacheSize: number;             // 缓存占用大小（字节）
}

interface TranslatedParagraph {
  pageIndex: number;             // 所在页码
  originalText: string;          // 原文
  translatedText: string;        // 译文
  formulas: FormulaMapping[];    // 公式映射
  boundingRect: {                // 在 PDF 页面中的位置
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

interface FormulaMapping {
  placeholder: string;           // <formula_0>, <formula_1>, ...
  original: string;              // 原始公式文本
}

// Object Store: glossary
interface GlossaryEntry {
  id: string;                    // UUID
  english: string;               // 英文术语
  chinese: string;               // 中文翻译
  createdAt: number;
}
```

---

## 九、开发阶段计划

### P0 - 项目初始化与基础骨架

- [x] 初始化 Vue 3 + TypeScript + Vite 项目
- [x] 配置 Tailwind CSS 4
- [x] 配置 Pinia 状态管理
- [x] 创建基础布局组件（AppHeader, AppFooter, SplitPane）
- [x] 实现主题系统（亮色/暗色/跟随系统）
- [x] 实现 EmptyState 空状态页面
- [x] 搭建 Express 后端基础框架

### P1 - PDF 上传与渲染

- [x] 实现全局拖拽上传（PdfDropZone）
- [x] 集成 PDF.js，实现 PDF 渲染（PdfViewer）
- [x] 实现虚拟渲染（仅渲染可见页 + 缓冲页）
- [x] 实现页码导航（PdfPageNav）
- [x] 实现 PDF 文本提取（usePdfTextExtractor）
- [x] 实现公式识别与保护（formula-detector，15+ 正则规则）
- [x] 实现文件哈希计算（SHA-256）

### P2 - 翻译引擎集成

- [x] 实现 Gemini API 封装（Flash + Flash-Lite）
- [x] 实现 Google Translate 备用引擎
- [x] 实现配额管理器（自动切换逻辑）
- [x] 实现翻译路由（POST /api/translate）
- [x] 实现连接测试接口
- [x] 设计翻译 Prompt（含上下文 + 术语表 + 公式保护）

### P3 - 自动翻译与双栏对照

- [x] 实现自动翻译流程（文件加载 → 自动触发）
- [x] 实现视口优先翻译策略
- [x] 实现翻译结果逐段渲染
- [x] 实现翻译进度条
- [x] 实现暂停/继续控制
- [x] 实现段落级对照高亮
- [x] 实现左右同步滚动
- [x] 实现段落重译功能

### P4 - 配置与设置

- [x] 实现首次使用 API Key 引导页（3步向导）
- [x] 实现设置抽屉面板（5个分区）
- [x] 实现引擎选择器（3引擎卡片式单选）
- [x] 实现配额可视化显示（双进度条 + 自动刷新）
- [x] 实现译文字号调节（14-24px）
- [x] 实现主题切换 UI（亮色/暗色/跟随系统三态循环）

### P5 - 历史与术语

- [x] 实现 IndexedDB 存储层（translations + glossary 两个 store）
- [x] 实现翻译历史列表
- [x] 实现缓存清理功能（单条/批量/全部，安全保护 active 文档）
- [x] 实现空间统计显示
- [x] 实现阅读进度记忆与恢复
- [x] 实现术语表管理（CRUD + CSV 导入导出 + 搜索过滤）

### P6 - 快捷键与打磨

- [x] 实现键盘快捷键系统（7个快捷键）
- [x] 添加过渡动画与微交互（fade/slide/scale transitions）
- [x] 实现骨架屏加载效果（shimmer animation）
- [x] 实现 Toast 通知系统（4种类型 + 自动消失）
- [x] 实现确认弹窗组件
- [x] App.vue 全局集成所有组件与功能

### P7 - 响应式、停止按钮与性能优化

- [x] 实现停止翻译按钮（AppHeader 进度条旁 + TranslationPanel 工具栏）
- [x] 清理死代码（移除未使用的 TranslationProgress.vue 和 ThemeToggle.vue）
- [x] 实现 F16 响应式布局（SplitPane 窄屏 <1024px 自动切换上下分栏）
- [x] 实现翻译面板虚拟滚动（>100 段落时启用页级窗口化，±3 页缓冲区）

---

## 十、开发约定

### 10.1 代码规范

- 所有组件使用 `<script setup lang="ts">` 语法
- 组件命名：PascalCase（`PdfViewer.vue`）
- 组合式函数命名：`use` 前缀（`useTheme.ts`）
- Pinia Store 使用 Setup Store 语法（`defineStore` + 函数形式）
- 类型定义集中在 `src/types/` 目录
- 后端代码使用 ES Module 语法

### 10.2 Git 提交规范

```
feat: 新增功能
fix: 修复缺陷
style: UI/样式调整
refactor: 代码重构
docs: 文档更新
chore: 构建/依赖/配置
```

### 10.3 注释规范

- 复杂业务逻辑必须添加注释
- 公式保护相关正则表达式必须逐条注释
- 组件 Props 使用 JSDoc 注释说明
- 不添加无意义的冗余注释

### 10.4 性能约定

- PDF 渲染使用 Canvas，避免 DOM 节点过多
- 翻译结果使用虚拟滚动（如段落超过 100 个）
- IndexedDB 操作全部异步，不阻塞 UI
- 文件哈希使用 Web Crypto API（SubtleCrypto.digest）

---

## 十一、启动与运行

```bash
# 安装依赖
npm install

# 开发模式（同时启动前端 + 后端）
npm run dev

# 仅启动前端
npm run dev:client

# 仅启动后端
npm run dev:server

# 生产构建
npm run build

# 生产运行
npm run start
```

**端口规划：**

- 前端开发服务器：`http://localhost:5173`
- 后端 API 服务器：`http://localhost:3001`
- Vite 开发模式自动代理 `/api` 到后端

---

*本文档是项目开发的唯一指导来源，所有开发决策应以本文档为准。如需调整方案，先更新本文档再执行变更。*

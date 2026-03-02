import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL_IDS: Record<string, string> = {
  'gemini-flash': 'gemini-2.5-flash',
  'gemini-flash-lite': 'gemini-2.5-flash-lite',
};

/**
 * Build the translation prompt with optional context and glossary.
 */
function buildPrompt(
  text: string,
  context?: { title?: string; abstract?: string },
  glossary?: Record<string, string>,
): string {
  let glossarySection = '';
  if (glossary && Object.keys(glossary).length > 0) {
    const entries = Object.entries(glossary)
      .map(([en, zh]) => `   - ${en} → ${zh}`)
      .join('\n');
    glossarySection = `\n   请参考以下术语表进行翻译：\n${entries}`;
  }

  let contextSection = '';
  if (context) {
    const parts: string[] = [];
    if (context.title) {
      parts.push(`论文标题：${context.title}`);
    }
    if (context.abstract) {
      parts.push(`摘要：${context.abstract}`);
    }
    if (parts.length > 0) {
      contextSection = `\n${parts.join('\n')}\n`;
    }
  }

  return `你是一位专业的学术论文翻译专家。
请将以下英文学术论文段落翻译为中文，要求：
1. 保持学术论文的正式语体
2. 专业术语翻译准确${glossarySection}
3. 文本中的 <formula_N> 占位符代表数学公式，请原样保留，不要翻译或修改
4. 参考文献引用（如 [1], [2,3]）原样保留
5. 图表编号中的编号保留，描述性文字翻译
6. 译文流畅自然，符合中文学术写作习惯
7. 只输出翻译结果，不要添加任何解释或注释
${contextSection}
待翻译段落：
${text}`;
}

/**
 * Translate text using the Gemini API.
 */
export async function translateWithGemini(
  text: string,
  context: { title?: string; abstract?: string } | undefined,
  glossary: Record<string, string> | undefined,
  apiKey: string,
  model: 'gemini-flash' | 'gemini-flash-lite' = 'gemini-flash',
): Promise<string> {
  const modelId = MODEL_IDS[model];
  if (!modelId) {
    throw new Error(`Unknown model: ${model}`);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const generativeModel = genAI.getGenerativeModel({ model: modelId });

  const prompt = buildPrompt(text, context, glossary);

  const result = await generativeModel.generateContent(prompt);
  const response = result.response;
  const translation = response.text();

  if (!translation) {
    throw new Error('Gemini returned an empty response');
  }

  return translation.trim();
}

/**
 * Test connectivity to the Gemini API with a simple prompt.
 */
export async function testGeminiConnection(apiKey: string): Promise<boolean> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_IDS['gemini-flash']! });

    const result = await model.generateContent('Reply with "ok" only.');
    const text = result.response.text();

    return typeof text === 'string' && text.length > 0;
  } catch (err) {
    console.error('Gemini connection test failed:', err instanceof Error ? err.message : err);
    return false;
  }
}

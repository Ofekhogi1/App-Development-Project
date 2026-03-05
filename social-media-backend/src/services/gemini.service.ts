import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import fs from 'fs';
import { env } from '../config/env';

export interface SearchIntent {
  keywords: string;
  daysAgo: number | null;
}

let genAI: GoogleGenerativeAI | null = null;

const getGenAI = (): GoogleGenerativeAI | null => {
  if (!genAI) {
    if (!env.GEMINI_API_KEY) return null;
    genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return genAI;
};

export const generateEmbedding = async (
  text: string,
  taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT
): Promise<number[] | null> => {
  const client = getGenAI();
  if (!client) return null;

  const model = client.getGenerativeModel({ model: 'gemini-embedding-001' });
  const result = await model.embedContent({
    content: { parts: [{ text }], role: 'user' },
    taskType,
  });
  return result.embedding.values;
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

const toEnglishImagePrompt = async (text: string): Promise<string> => {
  const client = getGenAI();
  if (!client) return text;
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
  try {
    const result = await model.generateContent(
      `Convert the following social media post text into a concise English image generation prompt (max 60 words). Focus on the key visual subject. Return only the prompt, no explanation.\n\nText: "${text}"`
    );
    return result.response.text().trim() || text;
  } catch {
    return text;
  }
};

export const generateImageFromText = async (text: string): Promise<string | null> => {
  if (!env.HF_TOKEN) throw new Error('HF_TOKEN is not configured');

  const englishPrompt = await toEnglishImagePrompt(text);

  const res = await fetch(
    'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: englishPrompt }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HF image generation failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
};

export const generateCaptionFromImage = async (imagePath: string, mimeType: string): Promise<string | null> => {
  if (!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured');

  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString('base64');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: 'text', text: 'Write a concise, engaging social media caption for this image. Return only the caption text, without quotes or extra formatting.' },
          ],
        },
      ],
      max_tokens: 150,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq caption failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const json = await res.json() as { choices: { message: { content: string } }[] };
  return json.choices?.[0]?.message?.content?.trim() || null;
};

export const interpretSearchQuery = async (userQuery: string): Promise<SearchIntent> => {
  const client = getGenAI();
  if (!client) {
    return { keywords: userQuery.trim(), daysAgo: null };
  }

  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

  const prompt = `You are a search assistant for a social media platform.
Analyze the user's search query and extract a structured search intent.

User query: "${userQuery}"

Return ONLY a valid JSON object (no markdown, no explanation) with this exact shape:
{
  "keywords": "<clean keyword string for full-text search, or empty string if none>",
  "daysAgo": <number of days ago to filter from, or null if no date filter>
}

Examples:
- "funny cat videos" → {"keywords": "funny cat", "daysAgo": null}
- "posts from last week" → {"keywords": "", "daysAgo": 7}
- "travel photos from yesterday" → {"keywords": "travel", "daysAgo": 1}
- "food posts from last month" → {"keywords": "food", "daysAgo": 30}
- "sunset" → {"keywords": "sunset", "daysAgo": null}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    try {
      const parsed = JSON.parse(cleaned) as SearchIntent;
      return {
        keywords: typeof parsed.keywords === 'string' ? parsed.keywords.trim() : userQuery.trim(),
        daysAgo: typeof parsed.daysAgo === 'number' ? parsed.daysAgo : null,
      };
    } catch (e) {
      // Parsing failed — fallback to raw query
      return { keywords: userQuery.trim(), daysAgo: null };
    }
  } catch (err) {
    // Model generation failed — fallback to raw query
    return { keywords: userQuery.trim(), daysAgo: null };
  }
};

import type { AIWordStudyRequest, AIWordStudyResponse, AIWordStudyCache } from '@/types/aiWordStudy';

const CACHE_KEY = 'ai-word-study-cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Get cache from localStorage
function getCache(): AIWordStudyCache {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

// Save cache to localStorage
function saveCache(cache: AIWordStudyCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to save AI word study cache:', e);
  }
}

// Generate cache key from request
function generateCacheKey(request: AIWordStudyRequest): string {
  return `${request.word}-${request.book}-${request.chapter}-${request.verse}-${request.translation}`;
}

// Clean expired cache entries
function cleanExpiredCache(): void {
  const cache = getCache();
  const now = Date.now();
  let hasExpired = false;

  for (const key in cache) {
    if (now - cache[key].timestamp > CACHE_DURATION) {
      delete cache[key];
      hasExpired = true;
    }
  }

  if (hasExpired) {
    saveCache(cache);
  }
}

// Get cached response if available and not expired
export function getCachedResponse(request: AIWordStudyRequest): AIWordStudyResponse | null {
  cleanExpiredCache();
  const cache = getCache();
  const key = generateCacheKey(request);
  const cached = cache[key];

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }

  return null;
}

// Save response to cache
export function saveToCache(request: AIWordStudyRequest, response: AIWordStudyResponse): void {
  const cache = getCache();
  const key = generateCacheKey(request);
  cache[key] = {
    response,
    timestamp: Date.now(),
  };
  saveCache(cache);
}

// Generate the AI prompt for biblical word study
function generatePrompt(request: AIWordStudyRequest): string {
  const { word, book, chapter, verse, translation, fullVerse } = request;

  return `You are a knowledgeable Bible teacher and theologian. Provide a comprehensive word study for the word/phrase "${word}" in the context of ${book} ${chapter}:${verse} (${translation}).

${fullVerse ? `Full verse context: "${fullVerse}"` : ''}

Please provide a JSON response with the following structure:
{
  "meaning": "A simple dictionary-style explanation of the word",
  "biblicalDefinition": "The theological meaning according to the Bible",
  "originalWord": {
    "word": "The original Hebrew or Greek word (if applicable)",
    "transliteration": "How to pronounce the original word",
    "pronunciation": "Phonetic pronunciation",
    "strongsNumber": "Strong's number if available",
    "literalMeaning": "Literal meaning of the original word",
    "language": "hebrew or greek"
  },
  "contextInScripture": "Explain what this word means specifically within the current verse and why it's important in its immediate biblical context",
  "crossReferences": [
    {
      "book": "Book name",
      "chapter": chapter number,
      "verse": verse number,
      "text": "Brief quote or description",
      "bookId": "Standard book ID (e.g., 'gen', 'exo', 'mat', 'jhn')"
    }
  ],
  "simpleExplanation": "Explain the word in everyday language that anyone can understand",
  "modernDayApplication": "Explain how this teaching applies to daily life in practical terms",
  "relatedTopics": [
    {
      "topic": "Related biblical concept",
      "description": "Brief description"
    }
  ],
  "relatedSermons": [
    {
      "id": "unique-id",
      "title": "Sermon title",
      "verse": "Reference verse"
    }
  ],
  "relatedDevotions": [
    {
      "id": "unique-id",
      "title": "Devotional title",
      "verse": "Reference verse"
    }
  ]
}

Important guidelines:
- For crossReferences, provide 4-6 relevant verses that teach the same concept
- For bookId, use standard 3-letter abbreviations (gen, exo, lev, num, deu, jos, jdg, rut, 1sa, 2sa, 1ki, 2ki, 1ch, 2ch, ezr, neh, est, job, psa, pro, ecc, sng, isa, jer, lam, ezk, dan, hos, jol, amo, oba, jon, mic, nam, hab, zep, hag, zec, mal, mat, mrk, luk, jhn, act, rom, 1co, 2co, gal, eph, php, col, 1th, 2th, 1ti, 2ti, tit, phm, heb, jas, 1pe, 2pe, 1jn, 2jn, 3jn, jud, rev)
- If the word doesn't have a specific Hebrew/Greek original (e.g., it's an English concept), set originalWord to null
- Keep explanations concise but thorough
- Focus on biblical accuracy and theological soundness
- For relatedSermons and relatedDevotions, generate realistic titles based on the topic`;
}

// Call OpenAI API
async function callOpenAI(prompt: string): Promise<any> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your environment variables.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a knowledgeable Bible teacher and theologian. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get AI response');
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}

// Main function to get AI word study
export async function getAIWordStudy(request: AIWordStudyRequest): Promise<AIWordStudyResponse> {
  // Check cache first
  const cached = getCachedResponse(request);
  if (cached) {
    return cached;
  }

  // Generate prompt
  const prompt = generatePrompt(request);

  // Call AI
  const aiResponse = await callOpenAI(prompt);

  // Build full response
  const response: AIWordStudyResponse = {
    word: request.word,
    context: {
      book: request.book,
      chapter: request.chapter,
      verse: request.verse,
      translation: request.translation,
      fullVerse: request.fullVerse || '',
    },
    meaning: aiResponse.meaning,
    biblicalDefinition: aiResponse.biblicalDefinition,
    originalWord: aiResponse.originalWord,
    contextInScripture: aiResponse.contextInScripture,
    crossReferences: aiResponse.crossReferences || [],
    simpleExplanation: aiResponse.simpleExplanation,
    modernDayApplication: aiResponse.modernDayApplication,
    relatedTopics: aiResponse.relatedTopics || [],
    relatedSermons: aiResponse.relatedSermons || [],
    relatedDevotions: aiResponse.relatedDevotions || [],
    timestamp: Date.now(),
  };

  // Save to cache
  saveToCache(request, response);

  return response;
}

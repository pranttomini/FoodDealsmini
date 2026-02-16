import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY is missing - AI features disabled");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const enhanceDealDescription = async (
  title: string,
  rawDescription: string,
  tags: string[]
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return rawDescription; // Fallback

  try {
    const prompt = `
      You are a marketing assistant for a local food deal app in Berlin.
      Rewrite the following deal description to be catchy, short, and appetizing (max 30 words).
      Highlight the savings and the taste.
      
      Deal Title: ${title}
      Raw Description: ${rawDescription}
      Tags: ${tags.join(', ')}
      
      Return ONLY the rewritten description text.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    return response.text?.trim() || rawDescription;
  } catch (error) {
    console.error("Error enhancing description with Gemini:", error);
    return rawDescription; // Fallback to original on error
  }
};

export const analyzeSpam = async (title: string, description: string): Promise<boolean> => {
  const ai = getAiClient();
  if (!ai) return false;

  try {
     const prompt = `
      Analyze if the following food deal post looks like spam, a scam, or inappropriate content.
      Title: ${title}
      Description: ${description}

      Return JSON: { "isSpam": boolean }
    `;

    // We request JSON for programmatic usage
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text;
    if (!text) return false;
    
    const result = JSON.parse(text);
    return result.isSpam === true;

  } catch (error) {
    return false;
  }
};
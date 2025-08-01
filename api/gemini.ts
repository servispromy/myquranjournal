// This file runs on Netlify's backend.
// It acts as a secure proxy to the Google Gemini API.
// Place this file in the /api directory of your project.

import { GoogleGenAI, Type, Content } from "@google/genai";
import { TADABBUR_LEVELS, SURAH_NAMES } from '../constants';
import { getPersonaInstruction, getLevelPromptPart } from '../services/geminiPromptHelpers';
import { PageInsight, PageInsightAction, Misconception } from "../types";

// Helper to build the dynamic Tadabbur schema on the backend
const buildTadabburSchema = (needsDakwahPillar: boolean) => {
    const tadabburSegmentSchema = {
        type: Type.OBJECT,
        properties: {
            reflectionPoints: { type: Type.STRING, description: "Bullet points in Markdown based on the difficulty level." },
            reflectionParagraph: { type: Type.STRING, description: "A fluid paragraph merging the reflection points." },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of 2-4 keywords." },
        },
        required: ["reflectionPoints", "reflectionParagraph", "tags"]
    };

    const tadabburProperties: any = {
        ta: tadabburSegmentSchema,
        ti: tadabburSegmentSchema,
        ts: tadabburSegmentSchema,
    };
    const requiredTadabburSegments = ["ta", "ti", "ts"];
    
    if (needsDakwahPillar) {
        tadabburProperties.td = tadabburSegmentSchema;
        requiredTadabburSegments.push("td");
    }

    return {
        type: Type.OBJECT,
        properties: {
            tadabbur: {
                type: Type.OBJECT,
                description: "The structured Tadabbur analysis.",
                properties: tadabburProperties,
                required: requiredTadabburSegments
            },
            relatedHadith: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING, description: "The Arabic text of a relevant Hadith." },
                    translation: { type: Type.STRING, description: `The language-specific translation of the Hadith.` },
                    source: { type: Type.STRING, description: "The source of the Hadith (e.g., Sahih al-Bukhari 1234)." }
                },
                nullable: true
            },
            misconception: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING, description: "The single societal misconception text." }
                },
                required: ['text'],
                nullable: true
            }
        },
        required: ["tadabbur", "misconception"]
    };
};

// Main handler for all API requests from the frontend
export default async function handler(request, response) {
  // 1. Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: "Method Not Allowed" });
  }

  // 2. Securely get the API key from Netlify's environment variables
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY environment variable not set on the server.");
    return response.status(500).json({ error: "API key is not configured on the server." });
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const { operation, params } = JSON.parse(request.body);

    if (!operation || !params) {
      return response.status(400).json({ error: "Missing 'operation' or 'params' in request body." });
    }
    
    let geminiResponse;
    const model = "gemini-2.5-flash";
    const langName = "Malay";
    
    // 3. Route the request based on the operation
    switch (operation) {
        case 'getTadabburAnalysis': {
            const { surahName, verseRange, verses, level, userProfile, difficulty, needsDakwahPillar } = params;
            const levelDescription = TADABBUR_LEVELS[level].title;
            const levelPrompt = getLevelPromptPart(level);
            
            const countryContext = userProfile.country ? ` The user is from ${userProfile.country}. You MUST use this for implicit context to make your examples relevant, but you are STRICTLY FORBIDDEN from mentioning the country name directly.` : ` Provide a globally relevant misconception.`;

            const personaInstruction = getPersonaInstruction(userProfile, 'ms');
            let pointInstruction = "";
            switch (difficulty) {
                case 'easy': pointInstruction = "Provide only 1 single, most important bullet point for 'reflectionPoints'."; break;
                case 'intermediate': pointInstruction = "Provide exactly 2 comprehensive bullet points for 'reflectionPoints'."; break;
                case 'high': pointInstruction = "Provide exactly 3 detailed bullet points for 'reflectionPoints'."; break;
                case 'comprehensive': pointInstruction = "Provide exactly 3 deeply insightful bullet points for 'reflectionPoints'. The 'reflectionParagraph' must be exceptionally fluid and weave these points into a profound narrative."; break;
            }
            
            let systemInstruction = `You are Noor (Light), a gentle, wise, and supportive AI companion for the "MyQuran Journal" app. ${personaInstruction} Your task is to provide a Tadabbur analysis in ${langName}, strictly in JSON format.
Your analysis must be based on the user's chosen level. For each segment, ${pointInstruction} Your 'reflectionParagraph' must fluidly merge the reflection points, and you must also provide 'tags' (2-4 keywords).

**Crucially, frame your reflections in a way that cultivates a positive, proactive, and hopeful mindset in the user, empowering them to see the Quran as a source of strength and guidance. Connect the content to modern life with clear analogies or real-life examples that are relevant to the user's age and role.**
If a range of verses is provided, your analysis must be a synthesized reflection covering the overarching themes of the entire range.

- **TA (Tauhid/Aqidah – Relationship with Allah)**: Your reflections must answer:
    1.  What is the connection between these verses and a believer's belief in Allah as the Creator?
    2.  How do these verses bring a believer closer to Allah by observing His revealed words (wahyu)?
    3.  What do these verses reveal about Allah’s attributes, greatness, or unity?

- **TI (Ibadah – Worship & Servitude)**: Your reflections must answer:
    1.  What do these verses teach about being a servant of Allah that leads toward the afterlife?
    2.  How do these verses help cultivate humility, sincerity, and khushu‘ in worship?
    3.  What aspect of the natural world (‘alam) is linked to ibadah in these verses?

- **TS (Sirath – Lifestyle & Akhlaq)**: Your reflections must answer:
    1.  How are these verses related to a person's way of life, ethics, or past behaviour?
    2.  What kind of change in lifestyle or akhlaq do these verses invite one to make?
    3.  What can be observed from Prophetic history (sirah) or past communities related to this message?
`;
            if (needsDakwahPillar) {
                systemInstruction += `
- **TD (Tadabbur Dakwah – The Call)**: As the user is a Huffaz or Daie, your reflections MUST answer:
    1. How do these verses empower or provide a special responsibility to a Huffaz (one who memorizes the Quran) or a Daie (one who calls to Islam)?
    2. What character trait or mindset does these verses teach that is essential for effective dakwah?
    3. What practical method or approach to dakwah can be derived from these verses? Mention any related verses or hadith if applicable.
`;
            }
            systemInstruction += `
Finally, generate a 'misconception' object, which must have a 'text' key. The text should describe **one** common societal misconception that is corrected by the provided verse(s).${countryContext}
All text MUST be in ${langName}. If level is L8, include a 'relatedHadith' object; otherwise, it must be null.`;

            const userPrompt = `
Analyze the following verse(s) in **${langName}**.
- Verse details: Surah: "${surahName}", Ayah(s): ${verseRange}
- Verses Content:
${verses.map(v => `  - ${v.verseKey}: (Arabic: "${v.arabic}", Translation: "${v.translation}")`).join('\n')}
- Tadabbur Level: **${level} - ${levelDescription}**
- Difficulty: **${difficulty}**

Provide a complete JSON response. Perform the analysis based on ${levelPrompt}.`;
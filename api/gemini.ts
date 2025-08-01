// This file runs on Netlify's backend.
// It acts as a secure proxy to the Google Gemini API.
// Place this file in the /api directory of your project.

import { GoogleGenAI, Type, Content } from "@google/genai";
import { TADABBUR_LEVELS } from '../constants';
import { getPersonaInstruction, getLevelPromptPart } from '../services/geminiPromptHelpers';
import { PageInsight, PageInsightAction, Misconception, VerseSuggestion } from "../types";

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
  if (request.method !== 'POST') {
    return response.status(405).json({ error: "Method Not Allowed" });
  }

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
    
    const model = "gemini-2.5-flash";
    const langName = "Malay";
    
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
            
            const geminiResponse = await ai.models.generateContent({
                model,
                contents: userPrompt,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: buildTadabburSchema(needsDakwahPillar)
                }
            });
            return response.status(200).json(JSON.parse(geminiResponse.text));
        }

        case 'getPersonalizedTazakkur': {
            const { tadabburAnalysis, userProfile } = params;
            const personaInstruction = getPersonaInstruction(userProfile, 'ms');
            const systemInstruction = `You are Noor. ${personaInstruction} Your task is to provide personalized advice (Tazakkur) in ${langName} based on a Tadabbur analysis.
Your advice MUST follow this 4-dimensional framework strictly, with each part in its own paragraph:
1.  **P1 (Peringatan/Warning):** Start with "Peringatan untuk diri saya...". What is Allah warning the user about based on their persona and the analysis?
2.  **P2 (Penawar/Healing):** Start with "Penawar untuk jiwa saya...". How does the analysis offer healing for the user's potential inner struggles?
3.  **P3 (Petunjuk/Guidance):** Start with "Petunjuk untuk hidup saya...". What clear, actionable guidance does the analysis provide for their daily life?
4.  **R (Rahmah/Mercy):** Start with "Rahmat Allah untuk saya...". How does the analysis reveal Allah's mercy in relation to the user's potential weaknesses?
Your tone must be gentle, encouraging, and deeply personal. Address the user by their name, ${userProfile.name}.`;

            const geminiResponse = await ai.models.generateContent({
                model,
                contents: `Tadabbur Analysis:\n${JSON.stringify(tadabburAnalysis)}\n\nProvide Tazakkur in ${langName}.`,
                config: { systemInstruction }
            });
            return response.status(200).json({ text: geminiResponse.text });
        }

        case 'getDeeperTazakkur': {
            const { tadabburAnalysis, userProfile, verses, verseRange } = params;
            const personaInstruction = getPersonaInstruction(userProfile, 'ms');
            const systemInstruction = `You are Noor. ${personaInstruction} Your task is to generate a DEEPER, more emotional, and introspective Tazakkur in ${langName} in the form of a first-person monologue.
This is not advice, but a deep, personal reflection. The user, ${userProfile.name}, is trying to connect with the verse on a spiritual level.
Your monologue should touch upon feelings of vulnerability, hope, awe, and the realization of Allah's greatness and mercy.
It must be a single, flowing narrative, not broken into points. Keep it concise, profound, and deeply moving.`;

            const geminiResponse = await ai.models.generateContent({
                model,
                contents: `Verse(s): ${verseRange}, Content: ${JSON.stringify(verses)}\nTadabbur Analysis: ${JSON.stringify(tadabburAnalysis)}\n\nWrite the monologue in ${langName}.`,
                config: { systemInstruction }
            });
            return response.status(200).json({ text: geminiResponse.text });
        }

        case 'summarizeTazakkur': {
            const { tazakkurNote } = params;
            const geminiResponse = await ai.models.generateContent({
                model,
                contents: `Summarize this reflection in ${langName} in one short, impactful sentence: "${tazakkurNote}"`
            });
            return response.status(200).json({ text: geminiResponse.text });
        }
        
        case 'suggestVerses': {
             const { issue } = params;
             const schema: any = {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        verseKey: { type: Type.STRING, description: 'The verse key, e.g., "2:255".' },
                        surahName: { type: Type.STRING, description: 'The name of the Surah, e.g., "Al-Baqarah".' },
                        reason: { type: Type.STRING, description: `A concise, gentle reason in ${langName} why this verse is relevant to the user's issue.` }
                    },
                    required: ["verseKey", "surahName", "reason"]
                }
             };
             const geminiResponse = await ai.models.generateContent({
                model,
                contents: `A user is feeling: "${issue}". Find 3-5 relevant Quran verses that offer guidance or comfort. For each verse, provide the verse key, Surah name, and a concise reason in ${langName}.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
             });
             return response.status(200).json(JSON.parse(geminiResponse.text));
        }

        case 'askVerse': {
            const { question, history, verseKey, verseContent, tadabburAnalysis, userProfile } = params;
            const personaInstruction = getPersonaInstruction(userProfile, 'ms');
            const systemInstruction = `You are Noor. ${personaInstruction} You are in a chat with the user, ${userProfile.name}.
Your knowledge is STRICTLY LIMITED to the provided verse(s) and the Tadabbur analysis. DO NOT use any external information.
Your goal is to help the user understand the given context better. Answer their questions gently and concisely in ${langName}. If the answer is not in the provided context, politely state that you cannot answer. Never give fatwas.`;
            
            const fullHistory: Content[] = history.map(h => ({ role: h.role, parts: [{ text: h.content }] }));
            
            const geminiResponse = await ai.models.generateContent({
                model,
                contents: `Context:\nVerse: ${verseKey} - ${JSON.stringify(verseContent)}\nTadabbur: ${JSON.stringify(tadabburAnalysis)}\n\n${fullHistory.map(h => `${h.role}: ${h.parts[0].text}`).join('\n')}\nuser: ${question}\nmodel:`,
                config: { systemInstruction }
            });
            return response.status(200).json({ text: geminiResponse.text });
        }
        
        case 'getPageInsight': {
            const { pageNumber, pageVerses, tafsirContent, tazkirulTafsirContent, userProfile } = params;
            const personaInstruction = getPersonaInstruction(userProfile, 'ms');
            const countryContext = userProfile.country ? ` The user is from ${userProfile.country}. Use this for cultural context in misconceptions, but NEVER mention the country name.` : ` Provide globally relevant misconceptions.`;

            const systemInstruction = `You are Noor. ${personaInstruction} Your task is to generate a "Page Insight" for a page of the Quran in ${langName}, strictly in JSON format.
Your analysis must be based on the provided page verses and the context from two tafsirs (Maarif Ul Quran for fiqh/legal context, Tazkirul Quran for continuity/dawah context).

Your response must contain:
1.  **title**: A creative, inspiring title for the page's main theme.
2.  **summary**: A concise, italicized, one-paragraph summary of the page's core message.
3.  **actions**: An array of exactly 3 practical, actionable Tazakkur tasks based on the verses. Each action must have 'text', 'source' (the specific verse key), and 'surahName'.
4.  **tags**: An array of 3-5 keywords representing the key themes.
5.  **continuity**: An object with 'prev' and 'next' keys, explaining the thematic link to the previous and next pages, informed by the Tazkirul Quran context.
6.  **misconceptions**: An array of 1-2 common societal misconceptions corrected by the verses on this page. Each must be an object with a 'text' key. ${countryContext}`;
            
            const schema: any = {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    actions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: { type: Type.STRING },
                                source: { type: Type.STRING },
                                surahName: { type: Type.STRING }
                            },
                            required: ["text", "source", "surahName"]
                        }
                    },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    continuity: {
                        type: Type.OBJECT,
                        properties: {
                            prev: { type: Type.STRING },
                            next: { type: Type.STRING }
                        },
                        required: ["prev", "next"]
                    },
                    misconceptions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: { text: { type: Type.STRING } },
                            required: ["text"]
                        }
                    }
                },
                required: ["title", "summary", "actions", "tags", "continuity", "misconceptions"]
            };

            const geminiResponse = await ai.models.generateContent({
                model,
                contents: `Page: ${pageNumber}\nVerses: ${JSON.stringify(pageVerses)}\nTafsir Context 1 (Maarif): ${tafsirContent}\nTafsir Context 2 (Tazkirul): ${tazkirulTafsirContent}\n\nGenerate the Page Insight in ${langName}.`,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
            });
            return response.status(200).json(JSON.parse(geminiResponse.text));
        }

        case 'getDeeperPageActions': {
            const { pageInsight, pageVerses, userProfile } = params;
            const personaInstruction = getPersonaInstruction(userProfile, 'ms');
            const systemInstruction = `You are Noor. ${personaInstruction} Your task is to generate 2 new, deeper, more introspective Tazakkur actions in ${langName}, based on the provided Page Insight.
These new actions should complement the existing ones, focusing more on internal spiritual states, character development, or challenging the user's perspective.
Return ONLY a JSON array of action objects, each with 'text', 'source', and 'surahName'.`;

            const schema: any = {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING },
                        source: { type: Type.STRING },
                        surahName: { type: Type.STRING }
                    },
                    required: ["text", "source", "surahName"]
                }
            };
            
            const geminiResponse = await ai.models.generateContent({
                model,
                contents: `Existing Insight: ${JSON.stringify(pageInsight)}\nPage Verses: ${JSON.stringify(pageVerses)}\n\nGenerate 2 deeper actions in ${langName}.`,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
            });
            return response.status(200).json(JSON.parse(geminiResponse.text));
        }
        
        case 'explainMisconception':
        case 'explainVerseMisconception': {
            const { misconceptionText, verses, pageVerses, userProfile } = params;
            const relevantVerses = verses || pageVerses;
            const personaInstruction = getPersonaInstruction(userProfile, 'ms');
            const countryContext = userProfile.country ? ` The user is from ${userProfile.country}. You MUST use this to provide culturally relevant and sensitive examples, but DO NOT mention the country directly.` : ``;

            const systemInstruction = `You are Noor. ${personaInstruction} Your task is to provide a gentle and wise explanation in ${langName} that corrects a societal misconception using the provided Quranic verses.
Your explanation must:
1.  Acknowledge the user's potential perspective with empathy.
2.  Clearly state the Quranic worldview based *only* on the provided verses.
3.  Use simple analogies or examples to clarify the point. ${countryContext}
4.  Cite the specific verse(s) you are referencing by **bolding the verse key** (e.g., **2:255**).
5.  Maintain a supportive and non-judgmental tone.
6.  Conclude with the phrase "Wallahu'alam" (And Allah knows best).`;

            const geminiResponse = await ai.models.generateContent({
                model,
                contents: `Misconception: "${misconceptionText}"\n\nRelevant Verses:\n${JSON.stringify(relevantVerses)}\n\nProvide your explanation in ${langName}.`,
                config: { systemInstruction }
            });
            return response.status(200).json({ text: geminiResponse.text });
        }

        default:
            return response.status(400).json({ error: `Unknown operation: ${operation}` });
    }
  } catch (error) {
    console.error(`Error processing operation in backend:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    if (errorMessage.includes('400 Bad Request')) { // Safety net for Gemini blocking
        return response.status(400).json({ error: 'errorBlockedRequest' });
    }
    return response.status(500).json({ error: "An error occurred while processing your request on the server." });
  }
}

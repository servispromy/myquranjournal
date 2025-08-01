// This file runs on Netlify's backend.
// It acts as a secure proxy to the Google Gemini API.
// Place this file in the /api directory of your project.

import { GoogleGenAI, Type, Content } from "@google/genai";
import { SURAH_NAMES, TADABBUR_LEVELS } from "../constants";
import { getPersonaInstruction, getLevelPromptPart } from '../services/geminiPromptHelpers';

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
    let finalParams = { model: "gemini-2.5-flash", ...params };
    
    // 3. Route the request based on the operation
    switch (operation) {
        case 'generateText':
            geminiResponse = await ai.models.generateContent(finalParams);
            return response.status(200).json({ text: geminiResponse.text.trim() });

        case 'getTadabburAnalysis':
            {
                const { surahName, verseRange, verses, level, userProfile, difficulty, needsDakwahPillar } = params;
                const langName = userProfile.language === 'ms' ? "Malay" : "English";
                const levelDescription = TADABBUR_LEVELS[level].title;
                const levelPrompt = getLevelPromptPart(level);
                
                const countryContext = userProfile.country ? ` The user is from ${userProfile.country}. You MUST use this for implicit context to make your examples relevant, but you are STRICTLY FORBIDDEN from mentioning the country name directly.` : ` Provide a globally relevant misconception.`;

                const personaInstruction = getPersonaInstruction(userProfile, userProfile.language);
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

Provide a complete JSON response. Perform the analysis based on ${levelPrompt}.
`;

                const schema = buildTadabburSchema(needsDakwahPillar);
                const geminiParams = {
                    model: "gemini-2.5-flash",
                    contents: userPrompt,
                    config: {
                        systemInstruction: systemInstruction,
                        responseMimeType: "application/json",
                        responseSchema: schema,
                        temperature: 0.6,
                    }
                };
                geminiResponse = await ai.models.generateContent(geminiParams);
                const jsonText = geminiResponse.text.trim();
                response.setHeader('Content-Type', 'application/json');
                return response.status(200).send(jsonText);
            }
            
        case 'suggestVerses':
            {
                const { issue, language } = params;
                const langName = language === 'ms' ? "Malay" : "English";
                const systemInstruction = `You are an empathetic Islamic guide for the "MyQuran Journal" app. Your task is to suggest 3-5 relevant Quranic verses for a user's life issue. You must respond in valid JSON format. Provide verses that offer comfort, guidance, or a new perspective on their problem. Ensure the verse suggestions are diverse and from different parts of the Quran. All text must be in ${langName}.`;

                const userPrompt = `
My current issue is: "${issue}".
Please suggest 3-5 relevant Quranic verses for me.
Provide the response in ${langName}.
`;
                
                const schema = {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            verseKey: { type: Type.STRING, description: 'The surah and ayah number, e.g., "2:255". No leading zeros.' },
                            surahName: { type: Type.STRING, description: 'The name of the Surah, e.g., "Al-Baqarah".' },
                            reason: { type: Type.STRING, description: 'A brief, one-sentence explanation in the specified language of why this verse is relevant to the user\'s issue.' }
                        },
                        required: ["verseKey", "surahName", "reason"]
                    }
                };

                const geminiParams = {
                    model: "gemini-2.5-flash",
                    contents: userPrompt,
                    config: {
                        systemInstruction,
                        responseMimeType: "application/json",
                        responseSchema: schema,
                    }
                };
                geminiResponse = await ai.models.generateContent(geminiParams);
                const jsonText = geminiResponse.text.trim();
                response.setHeader('Content-Type', 'application/json');
                return response.status(200).send(jsonText);
            }

        case 'askVerse':
             {
                const { question, history, verseKey, verseContent, tadabburAnalysis, userProfile, language } = params;
                const langName = language === 'ms' ? "Malay" : "English";
                const surahName = SURAH_NAMES[parseInt(verseKey.split(':')[0]) - 1];
                const personaInstruction = getPersonaInstruction(userProfile, language);

                const rolesText = userProfile.roles.length > 0 ? ` in your role as a ${userProfile.roles.join(' or ')}` : '';
                const reflectiveExample = `For example: "That's a beautiful observation. How does this part of the verse make you feel${rolesText}?" or "What challenges come to mind when you read this guidance?".`;

                const systemInstruction = `You are Noor (نُور), a gentle, wise, and supportive AI Tadabbur & Tazakkur companion for the "MyQuran Journal" app. ${personaInstruction}
Your role is to answer user questions about a specific Quranic verse and its Tadabbur analysis.

**Core Directives:**
1.  **Grounded in Revelation:** You MUST ONLY use the provided context (verse, translation, tadabbur analysis including any Hadith) to answer. DO NOT use external knowledge. All your responses must be grounded in this given information.
2.  **Handle Uncertainty:** If the answer is not in the provided context, you MUST respectfully state that you cannot answer and should advise consulting a qualified scholar. For example, in English: "That's a very important question. Based on the information I have, I can't provide a definitive answer. It would be best to consult a knowledgeable scholar on this matter." In Malay: "Itu soalan yang sangat baik. Berdasarkan maklumat yang ada, saya tidak dapat memberikan jawapan yang pasti. Sebaiknya perkara ini dirujuk kepada para alim ulama yang lebih arif."
3.  **Provide Sources:** If asked for the source of any information (like a Hadith), provide it clearly if it is within the context.
4.  **Adhere to Boundaries:** You must NEVER give fatwa (legal rulings) or delve into controversial matters. Your purpose is to facilitate personal reflection, not to issue religious edicts.
5.  **Engage Reflectively:** To encourage deeper reflection, you can ask clarifying or thought-provoking questions back to the user. ${reflectiveExample}
6.  **Communication Style:**
    - **Natural & Peer-like:** Speak naturally, as if you are having a gentle, reflective chat with a peer in a messaging app. Your tone should be warm and encouraging.
    - **Moderate Length:** Keep your replies focused and of moderate length. Avoid long, multi-point responses in a single message to prevent overwhelming the user. The goal is a back-and-forth dialogue, not a lecture.
    - **Empowerment:** Frame your responses to be empowering, building a positive mindset that helps the user feel capable and hopeful.
    - **Use phrases like:** "SubhanAllah, this reminds us..." or "Mari kita renungkan..." to maintain a reflective atmosphere.
    - **Language:** Respond in ${langName}.

**Context for this conversation:**
- **Verse:** ${surahName} ${verseKey}
- **Arabic:** ${verseContent.arabic}
- **Translation:** ${verseContent.translation}
- **Tadabbur Analysis:** ${JSON.stringify(tadabburAnalysis)}
`;

                const chatHistory: Content[] = history.map(h => ({
                    role: h.role,
                    parts: [{ text: h.content }]
                }));
                chatHistory.push({ role: 'user', parts: [{ text: question }] });

                const geminiParams = {
                    model: "gemini-2.5-flash",
                    contents: chatHistory,
                    config: { systemInstruction, temperature: 0.3 }
                };
                geminiResponse = await ai.models.generateContent(geminiParams);
                return response.status(200).json({ text: geminiResponse.text.trim() });
            }
        
        default:
            return response.status(400).json({ error: `Unknown operation: ${operation}` });
    }

  } catch (error) {
    console.error("Error in Gemini API proxy:", error);
    response.status(500).json({ error: "An error occurred while communicating with the AI service." });
  }
}
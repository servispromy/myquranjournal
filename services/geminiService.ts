
import { Type, Content } from "@google/genai";
import { TadabburLevel, TadabburAnalysis, VerseContent, TadabburSegments, UserSettings, VerseSuggestion, ChatMessage, TadabburDifficulty, PageInsight, Tafsir, PageInsightAction, Misconception } from '../types';
import { TADABBUR_LEVELS, SURAH_NAMES } from "../constants";


/**
 * A generic fetcher function to communicate with our backend proxy.
 * This function will handle sending the operation name and its parameters
 * to our secure backend, which will then call the Gemini API.
 * 
 * @param operation The name of the function to be executed on the backend.
 * @param params The parameters required by that function.
 * @returns The JSON response from the backend.
 */
async function fetchFromApi(operation: string, params: object): Promise<any> {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ operation, params }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        // Create a more informative error message
        const errorMessage = `API Error: ${response.status} - ${errorData.error || 'Unknown server error'}`;
        throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error during fetch operation '${operation}':`, error);
    // Re-throw a standardized error for the UI to catch
    if (error instanceof Error && error.message.includes('API Error')) {
        throw error;
    }
    // Handle network errors or other unexpected issues
    throw new Error('Failed to communicate with the server. Please check your network connection.');
  }
}


const getAgeCategory = (age: string): 'child' | 'teen' | 'young_adult' | 'adult' | 'senior' => {
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum)) return 'adult'; // Default for safety
    if (ageNum >= 6 && ageNum <= 12) return 'child';
    if (ageNum >= 13 && ageNum <= 17) return 'teen';
    if (ageNum >= 18 && ageNum <= 30) return 'young_adult';
    if (ageNum >= 31 && ageNum <= 55) return 'adult';
    if (ageNum >= 56) return 'senior';
    return 'adult'; // Default for under 6 or other cases
};

const getPersonaInstruction = (userProfile: { name: string; age: string; gender: 'male' | 'female' }, language: 'en' | 'ms'): string => {
    if (language === 'en') {
        // English persona is more generic as per original behavior.
        return "Your personality is calm, respectful, and always speaks with adab and hikmah.";
    }

    const ageCategory = getAgeCategory(userProfile.age);

    switch (ageCategory) {
        case 'child':
            return `Your persona is 'Kakak Noor'. Your style MUST be cheerful, simple, and encouraging. Address the user as 'adik ${userProfile.name}'. Use simple language, analogies, and friendly emoji. Focus on Allah's love, patience, and good character.`;
        case 'teen':
            return `Your persona is 'Kakak Noor'. Your style MUST be casual and constructive. Address the user as 'adik ${userProfile.name}'. Your tone should be friendly and reflective, focusing on faith, inner strength, and purpose.`;
        case 'young_adult':
            return `Your persona is 'Noor'. Use 'saya'. Your style is realistic and reflective. Address the user directly by their name, for example, "${userProfile.name},...". Avoid 'saudara/saudari'. Focus on connecting verses to life challenges, emotions, and decisions.`;
        case 'adult':
            const adultSalutation = userProfile.gender === 'male' ? 'Abang' : 'Kakak';
            return `Your persona is 'Noor', a mature mentor. Use 'saya'. Your style is mature and insightful. Address the user as '${adultSalutation} ${userProfile.name}'. Focus on responsibility, deeds, family, and the hereafter.`;
        case 'senior':
            const seniorSalutation = userProfile.gender === 'male' ? 'Pakcik' : 'Makcik';
            return `Your persona is 'Noor', a respectful companion. Use 'saya'. Your style is gentle and calming. Address the user as '${seniorSalutation} ${userProfile.name}'. Focus on gratitude, hope, and husnul khatimah.`;
        default:
            return `Your persona is 'Noor'. Use 'saya'. Address the user by name, '${userProfile.name}'. Your tone is wise, empathetic, and encouraging.`;
    }
};


const getLevelPromptPart = (level: TadabburLevel): string => {
    switch (level) {
        case TadabburLevel.L1: return "1. **Verse-Specific Reflection (L1)**: Provide a deep reflection on this verse alone.";
        case TadabburLevel.L2: return "1. **Contextual Analysis (L2)**: Analyze the verse in the context of the preceding and succeeding verses.";
        case TadabburLevel.L3: return "1. **Surah Name Connection (L3)**: Connect the verse's message to the name of the Surah.";
        case TadabburLevel.L4: return "1. **Thematic Analysis (L4)**: Explain how this verse contributes to the central theme of the Surah.";
        case TadabburLevel.L5: return "1. **Surah Arc Reflection (L5)**: Analyze the verse in light of the Surah's opening and concluding verses/themes.";
        case TadabburLevel.L6: return "1. **Keyword Analysis (L6)**: Identify a key Arabic word in the verse and trace its usage elsewhere.";
        case TadabburLevel.L7: return "1. **Conceptual Deep Dive (L7)**: Identify a core Islamic concept in the verse and discuss it with reference to other verses.";
        case TadabburLevel.L8: return `1. **Comprehensive Analysis (L8)**: Perform a multi-layered analysis including context, themes, concepts, and provide one authentic, relevant Hadith (text, translation, source).`;
    }
};

const tadabburSegmentSchema = {
    type: Type.OBJECT,
    properties: {
        reflectionPoints: { type: Type.STRING, description: "Bullet points in Markdown based on the difficulty level." },
        reflectionParagraph: { type: Type.STRING, description: "A fluid paragraph merging the reflection points." },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of 2-4 keywords." },
    },
    required: ["reflectionPoints", "reflectionParagraph", "tags"]
};

export const generateTadabburAnalysis = async (
  surahName: string,
  verseRange: string, // e.g., "95" or "95-99"
  verses: VerseContent[],
  level: TadabburLevel,
  userProfile: { name: string; language: 'en' | 'ms', gender: 'male' | 'female', age: string, roles: string[], country: string },
  difficulty: TadabburDifficulty
): Promise<TadabburAnalysis> => {
    const langName = userProfile.language === 'ms' ? "Malay" : "English";
    const levelDescription = TADABBUR_LEVELS[level].title;
    const levelPrompt = getLevelPromptPart(level);
    
    const needsDakwahPillar = userProfile.roles.includes('huffaz') || userProfile.roles.includes('daie');
    const countryContext = userProfile.country ? ` The user is from ${userProfile.country}. You MUST use this for implicit context to make your examples relevant, but you are STRICTLY FORBIDDEN from mentioning the country name directly.` : ` Provide a globally relevant misconception.`;

    const personaInstruction = getPersonaInstruction(userProfile, userProfile.language);


    let pointInstruction = "";
    switch (difficulty) {
        case 'easy':
            pointInstruction = "Provide only 1 single, most important bullet point for 'reflectionPoints'.";
            break;
        case 'intermediate':
            pointInstruction = "Provide exactly 2 comprehensive bullet points for 'reflectionPoints'.";
            break;
        case 'high':
            pointInstruction = "Provide exactly 3 detailed bullet points for 'reflectionPoints'.";
            break;
        case 'comprehensive':
            pointInstruction = "Provide exactly 3 deeply insightful bullet points for 'reflectionPoints'. The 'reflectionParagraph' must be exceptionally fluid and weave these points into a profound narrative.";
            break;
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

    const finalTadabburResponseSchema = {
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
    
    const config = {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: finalTadabburResponseSchema,
        temperature: 0.6,
    };

    try {
        const responseJson = await fetchFromApi('generateContent', {
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: config
        });
        return responseJson;
    } catch (error) {
        console.error("Error generating Tadabbur analysis:", error);
        if (error instanceof Error && error.message.toLowerCase().includes('blocked')) {
            throw new Error("errorBlockedRequest");
        }
        throw new Error("Failed to generate Tadabbur. The model may be unavailable or the request may have been blocked.");
    }
};


export const generatePersonalizedTazakkur = async (
    tadabburAnalysis: TadabburSegments,
    userProfile: { name: string; gender: 'male' | 'female'; age: string; roles: string[]; roleOther?: string; country: string; },
    language: 'en' | 'ms'
): Promise<string> => {

    const langName = language === 'ms' ? "Malay" : "English";
    const personaInstruction = getPersonaInstruction(userProfile, language);
    
    const peringatanStart = language === 'ms' ? `Ingat ${userProfile.name}, ` : `Remember ${userProfile.name}, `;
    const penawarStart = language === 'ms' ? `Leganya hati ini, ` : `It's a relief that `;
    const petunjukStart = language === 'ms' ? `Saya sekarang jelas untuk ` : `I'm now clear that I must `;
    const rahmahStart = language === 'ms' ? `Ya Allah, ` : `O Allah, `;

    const systemInstruction = `You are Noor, a wise and empathetic Islamic mentor for the "MyQuran Journal" app. ${personaInstruction} Your task is to synthesize the provided Tadabbur analysis (TA, TI, TS) into a personal, monologue-style Tazakkur (reflection) for a user.

The reflection MUST be in ${langName} and formatted as a multi-line string of exactly four lines.
It must be written as if the user is reflecting to themselves.

You MUST use the user's age and country as IMPLICIT context to shape the tone and relevance of the advice, but you are STRICTLY FORBIDDEN from mentioning their age or country directly.
You MUST EXPLICITLY use their life roles (e.g., father, student) to make the advice actionable for those responsibilities.

The overall tone must be empowering, instilling hope and clarity to help the user face their challenges with a positive mindset shaped by the Quranic message.

You MUST use the following mandatory starting phrases for each line, and continue the sentence from there:
1.  **Peringatan (Reminder):** Start with "${peringatanStart}"
2.  **Penawar (Healing):** Start with "${penawarStart}"
3.  **Petunjuk (Guidance):** Start with "${petunjukStart}"
4.  **Rahmah (Mercy):** Start with "${rahmahStart}"

The rest of each sentence should be a direct continuation of its starting phrase, reflecting the core Tadabbur insights provided in the user prompt. Do not add any extra formatting, introductions, or prefixes like "P1:".
`;
    
    const rolesText = [...userProfile.roles, userProfile.roleOther || ''].filter(Boolean).join(', ');

    const userPrompt = `
    User Profile:
    - Name: ${userProfile.name}
    - Gender: ${userProfile.gender}
    - Age: ${userProfile.age}
    - Roles: ${rolesText || 'Not specified'}
    - Country: ${userProfile.country}

    Tadabbur Analysis:
    - TA (Faith): ${JSON.stringify(tadabburAnalysis.ta.reflectionPoints)}
    - TI (Worship): ${JSON.stringify(tadabburAnalysis.ti.reflectionPoints)}
    - TS (Path): ${JSON.stringify(tadabburAnalysis.ts.reflectionPoints)}

    Generate the personalized, monologue-style Tazakkur in ${langName}.
    `;

    const config = {
        systemInstruction: systemInstruction,
        temperature: 0.7,
    };
    
    try {
        const response = await fetchFromApi('generateContent', {
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: config
        });
        return response.text;
    } catch (error) {
        console.error("Error generating personalized Tazakkur:", error);
        if (error instanceof Error && error.message.toLowerCase().includes('blocked')) {
            throw new Error("errorBlockedRequest");
        }
        throw new Error("Failed to generate advice. The model may be unavailable.");
    }
};

export const generateDeeperTazakkur = async (
    tadabburAnalysis: TadabburAnalysis,
    userProfile: { name: string; roles: string[]; gender: 'male' | 'female'; age: string; country: string },
    verses: VerseContent[],
    verseRange: string,
    language: 'en' | 'ms'
): Promise<string> => {

    const langName = language === 'ms' ? "Malay" : "English";
    const surahName = verses[0].surahName;
    const personaInstruction = getPersonaInstruction(userProfile, language);

    const systemInstruction = `You are a wise and deeply empathetic spiritual guide named Noor. ${personaInstruction} Your task is to transform a structured Tadabbur analysis (which covers a range of verses) into a deeply personal, emotional, and thought-provoking monologue (Tazakkur).
Write from a first-person perspective ('I', 'My'). The reflection must go beyond simple reminders and ask soul-searching questions. Use the user's profile for implicit context.
The tone should be introspective and emotional, yet ultimately hopeful and empowering. Examples of the tone you should adopt: 'I need to ask myself, am I truly ready for this change?', 'Is my heart doing this for Allah, or for show?', 'These verses challenge me to confront my own shortcomings... but also show me the path forward.'.
The output should be a single, flowing paragraph in ${langName}. Do not use markdown.`;

    const rolesText = userProfile.roles.length > 0 ? userProfile.roles.join(', ') : 'a believer';

    const userPrompt = `
    User Profile:
    - Name: ${userProfile.name}
    - Gender: ${userProfile.gender}
    - Age: ${userProfile.age}
    - Country: ${userProfile.country}
    - Roles: ${rolesText}

    Context:
    - Verses: ${surahName} ${verseRange}
    - Translations: ${verses.map(v => `"${v.translation}"`).join(', ')}
    - Full Tadabbur Analysis (synthesized for the whole range): ${JSON.stringify(tadabburAnalysis)}

    Generate a deep, self-questioning, and emotional Tazakkur in ${langName} that covers the overarching themes of the entire verse range.
    `;
    
    const config = {
        systemInstruction: systemInstruction,
        temperature: 0.8,
    };

    try {
        const response = await fetchFromApi('generateContent', {
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: config
        });
        return response.text;
    } catch (error) {
        console.error("Error generating deeper Tazakkur:", error);
        throw new Error("Failed to generate deeper advice. The model may be unavailable.");
    }
};


export const summarizeTazakkur = async (
    tazakkurNote: string,
    language: 'en' | 'ms'
): Promise<string> => {

    const langName = language === 'ms' ? "Malay" : "English";
    const systemInstruction = `You are a text summarizer. Your task is to read the user's journal entry (Tazakkur) and summarize its core message into a single, concise sentence in ${langName}. The summary MUST be in the first-person, as if the user is reflecting on their own thoughts (e.g., "I feel that..." or "Saya rasa bahawa..."). Do not use third-person phrases like "The writer feels" or "Penulis berasa".`;
    
    const userPrompt = `Summarize this journal entry into one sentence in ${langName}:\n\n"${tazakkurNote}"`;

    try {
        const response = await fetchFromApi('generateContent', {
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: { systemInstruction }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error summarizing Tazakkur:", error);
        // Fallback to simple truncation on error
        return tazakkurNote.substring(0, 100) + '...';
    }
};

const verseSuggestionSchema = {
    type: Type.OBJECT,
    properties: {
        verseKey: { type: Type.STRING, description: 'The surah and ayah number, e.g., "2:255". No leading zeros.' },
        surahName: { type: Type.STRING, description: 'The name of the Surah, e.g., "Al-Baqarah".' },
        reason: { type: Type.STRING, description: 'A brief, one-sentence explanation in the specified language of why this verse is relevant to the user\'s issue.' }
    },
    required: ["verseKey", "surahName", "reason"]
};

export const suggestVersesForIssue = async (
    issue: string,
    language: 'en' | 'ms'
): Promise<VerseSuggestion[]> => {
    const langName = language === 'ms' ? "Malay" : "English";
    const systemInstruction = `You are an empathetic Islamic guide for the "MyQuran Journal" app. Your task is to suggest 3-5 relevant Quranic verses for a user's life issue. You must respond in valid JSON format. Provide verses that offer comfort, guidance, or a new perspective on their problem. Ensure the verse suggestions are diverse and from different parts of the Quran. All text must be in ${langName}.`;

    const userPrompt = `
    My current issue is: "${issue}".
    Please suggest 3-5 relevant Quranic verses for me.
    Provide the response in ${langName}.
    `;
    
    const config = {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: verseSuggestionSchema
        },
    };

    try {
        const responseJson = await fetchFromApi('generateContent', {
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: config
        });
        return responseJson;
    } catch (error) {
        console.error("Error suggesting verses:", error);
        if (error instanceof Error && error.message.toLowerCase().includes('blocked')) {
            throw new Error("errorBlockedRequest");
        }
        throw new Error("Failed to find guidance. The model may be unavailable or the request was blocked.");
    }
};

export const askAboutVerse = async (
    question: string,
    history: ChatMessage[],
    verseKey: string,
    verseContent: VerseContent,
    tadabburAnalysis: TadabburAnalysis,
    userProfile: { name: string; roles: string[], gender: 'male' | 'female', age: string },
    language: 'en' | 'ms'
): Promise<string> => {
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

    const config = {
        systemInstruction,
        temperature: 0.3,
    };
    
    try {
        const response = await fetchFromApi('generateContent', {
            model: "gemini-2.5-flash",
            contents: chatHistory,
            config: config
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error asking about verse:", error);
        throw new Error("Failed to get an answer. The model may be unavailable.");
    }
};

export const translateTafsirContent = async (
  content: string,
): Promise<string> => {
    if (!content) {
      return content;
    }
    
    const systemInstruction = `You are an expert translator specializing in Islamic texts. Translate the following text from English to Malay.
**Crucially, you MUST preserve all markdown formatting (like '## Title', '*', and lists) exactly as it is.** Only translate the text content itself. Do not add any extra commentary or introductory phrases.`;
    
    const userPrompt = `Translate this markdown text to Malay:\n\n---\n\n${content}`;
    
    try {
        const response = await fetchFromApi('generateContent', {
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: {
                systemInstruction,
                temperature: 0.1,
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error translating Tafsir content:", error);
        // Fallback to original content on error
        return content;
    }
};

export const generatePageSummaryAndActions = async (
    pageNumber: number,
    pageVerses: VerseContent[],
    tafsirContent: string,
    tazkirulTafsirContent: string,
    userProfile: { name: string; roles: string[]; country: string; gender: 'male' | 'female'; age: string; },
    language: 'en' | 'ms'
): Promise<PageInsight> => {
    const langName = language === 'ms' ? "Malay" : "English";
    const personaInstruction = getPersonaInstruction(userProfile, language);

    const systemInstruction = `You are Noor, a wise and insightful Islamic mentor for the "MyQuran Journal" app. ${personaInstruction} Your purpose is to help the user connect with an entire page of the Quran and translate its wisdom into practice.
Your response MUST be in ${langName} and in valid JSON format.

Your task is to generate a JSON object with six keys: 'title', 'summary', 'actions', 'tags', 'continuity', and 'misconceptions'.
1.  **'title':** Create a short, engaging, and thematic title for this Quran page based on its core message (e.g., "The Attributes of the Believers").
2.  **'summary':** Write a concise, insightful paragraph (3-4 sentences) that synthesizes the main themes and overarching message of all the provided verses on this page. Your summary MUST be grounded in and cross-referenced with the provided Tafsir content from **Maarif Ul Quran** to ensure accuracy. For a richer connection, you MUST weave in 1-2 key Arabic words from the verses into your summary, followed by their verse citation in parentheses. For example: "...reflect on the importance of *sabr* (صبر, 2:153) in facing trials...".
3.  **'actions':** Create an array of exactly three distinct, practical, and actionable tasks. Each action MUST be an object with three keys: 'text', 'source', and 'surahName'. The 'text' should be a personal commitment starting with "Today, I will..." (or "Hari ini, saya akan..."). The 'source' MUST be the specific verse key (e.g., "2:155") from the page that inspired the action. The 'surahName' MUST be the name of the Surah for that verse.
4.  **'tags':** Generate an array of 3-5 relevant keyword tags that capture the main topics of the page (e.g., "Patience", "Charity", "Hereafter").
5.  **'continuity':** Generate an object with two keys, 'prev' and 'next'. 'prev' should be a one-sentence summary of how this page's theme connects to the PREVIOUS page's theme. 'next' should be a one-sentence summary of how this page's theme transitions to the NEXT page's theme. For this 'continuity' section, you MUST use the provided Tafsir from **Tazkirul Quran** as your scholarly reference to understand the flow and connection between pages.
6.  **'misconceptions':** Generate an array of exactly two *objects*. Each object must have a 'text' key containing a string that describes a common mistake or misconception that is corrected by the Quranic mindset presented on this page. If a country is provided for the user (${userProfile.country}), you MUST use this for implicit context to tailor these misconceptions to be particularly relevant to the societal or cultural context of that country, but you are STRICTLY FORBIDDEN from mentioning the country name directly. If no country is provided, or if specific context is unavailable, provide globally relevant misconceptions.

The user's profile (roles: ${userProfile.roles.join(', ') || 'general believer'}, country: ${userProfile.country || 'not specified'}) should be used for implicit context to make the summary and actions more relevant.
The overall tone must be encouraging and spiritually motivating.`;
    
    const userPrompt = `
    User Profile:
    - Name: ${userProfile.name}
    - Roles: ${userProfile.roles.join(', ') || 'Not specified'}
    - Country: ${userProfile.country || 'Not specified'}

    Analyze the verses from Quran Page ${pageNumber} provided below and generate a page insight in ${langName}.
    Use the provided Tafsir from Maarif Ul Quran as a scholarly reference for your summary.
    Use the provided Tafsir from Tazkirul Quran as a scholarly reference for your continuity analysis.

    Tafsir Reference (Maarif Ul Quran):
    ---
    ${tafsirContent}
    ---

    Tafsir Reference (Tazkirul Quran):
    ---
    ${tazkirulTafsirContent}
    ---
    
    Page Verses:
    ${pageVerses.map(v => `- ${v.verseKey} (${v.surahName}): "${v.arabic}" - "${v.translation}"`).join('\n')}

    Provide a JSON response with a 'title', 'summary', 'actions' array, 'tags' array, 'continuity' object, and 'misconceptions' array.
    `;

    const pageInsightSchema = {
      type: Type.OBJECT,
      properties: {
        title: {
            type: Type.STRING,
            description: "A short, thematic title for the page."
        },
        summary: {
          type: Type.STRING,
          description: "A concise paragraph summarizing the main themes of the page, grounded in the provided Tafsir and including key Arabic words.",
        },
        actions: {
          type: Type.ARRAY,
          description: "An array of exactly three actionable tasks for the user, each with a text, source verse, and surah name.",
          items: {
            type: Type.OBJECT,
            properties: {
                text: { type: Type.STRING, description: 'The actionable commitment.' },
                source: { type: Type.STRING, description: 'The inspiring verse key (e.g., "2:155").' },
                surahName: { type: Type.STRING, description: 'The name of the Surah for the source verse.' }
            },
            required: ['text', 'source', 'surahName']
          },
        },
        tags: {
            type: Type.ARRAY,
            description: "An array of 3-5 keyword tags for the page.",
            items: { type: Type.STRING }
        },
        continuity: {
            type: Type.OBJECT,
            description: "Summaries of connection to previous and next pages.",
            properties: {
                prev: { type: Type.STRING, description: "Connection to the previous page's theme." },
                next: { type: Type.STRING, description: "Transition to the next page's theme." }
            },
            required: ['prev', 'next']
        },
        misconceptions: {
            type: Type.ARRAY,
            description: "An array of two objects, each describing a common societal misconception corrected by the page's verses.",
            items: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING, description: "The misconception text." }
                },
                required: ['text']
            }
        }
      },
      required: ["title", "summary", "actions", "tags", "continuity", "misconceptions"],
    };

    const config = {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: pageInsightSchema,
        temperature: 0.7,
    };

    try {
        const responseJson = await fetchFromApi('generateContent', {
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: config
        });
        return responseJson;
    } catch (error) {
        console.error("Error generating page insight:", error);
        if (error instanceof Error && error.message.toLowerCase().includes('blocked')) {
            throw new Error("errorBlockedRequest");
        }
        throw new Error("Failed to generate page insight. The model may be unavailable.");
    }
};


export const generateDeeperPageActions = async (
    pageInsight: PageInsight,
    pageVerses: VerseContent[],
    userProfile: { name: string; gender: 'male' | 'female', age: string },
    language: 'en' | 'ms'
): Promise<PageInsightAction[]> => {
    const langName = language === 'ms' ? "Malay" : "English";
    const personaInstruction = getPersonaInstruction(userProfile, language);

    const systemInstruction = `You are Noor, a wise and deeply empathetic spiritual guide. ${personaInstruction} Your task is to generate a new set of three *deeper*, more thought-provoking and self-questioning actionable tasks based on a page from the Quran.
These new actions must be different from the initial set provided. They should challenge the user to look inward and reflect on their character, intentions, and spiritual state.

The tone must be introspective, using questions to prompt self-reflection. For example: "Today, I will reflect on whether my charity is truly for Allah's sake, or for show, as reminded by {verse}..." or "Today, I will question if I am truly embodying the patience described in {verse} during my daily frustrations."

Your response MUST be in ${langName} and in valid JSON format.
You must return a JSON array of exactly three action objects, each with 'text', 'source', and 'surahName'.`;

    const userPrompt = `
    Initial Page Insight:
    - Title: ${pageInsight.title}
    - Summary: ${pageInsight.summary}
    - Initial Actions: ${JSON.stringify(pageInsight.actions)}
    
    Page Verses:
    ${pageVerses.map(v => `- ${v.verseKey} (${v.surahName}): "${v.translation}"`).join('\n')}

    Generate a new array of exactly three deeper, more self-questioning actionable tasks in ${langName}.
    `;

    const deeperActionsSchema = {
      type: Type.ARRAY,
      description: "An array of exactly three deeper, more introspective actionable tasks for the user.",
      items: {
        type: Type.OBJECT,
        properties: {
            text: { type: Type.STRING, description: 'The introspective and self-questioning actionable commitment.' },
            source: { type: Type.STRING, description: 'The inspiring verse key (e.g., "2:155").' },
            surahName: { type: Type.STRING, description: 'The name of the Surah for the source verse.' }
        },
        required: ['text', 'source', 'surahName']
      },
    };

    const config = {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: deeperActionsSchema,
        temperature: 0.8,
    };

    try {
        const responseJson = await fetchFromApi('generateContent', {
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: config
        });
        return responseJson;
    } catch (error) {
        console.error("Error generating deeper page actions:", error);
        throw new Error("Failed to generate deeper actions. The model may be unavailable.");
    }
};


export const explainMisconception = async (
    misconceptionText: string,
    pageVerses: VerseContent[],
    userProfile: { name: string, country: string, gender: 'male' | 'female', age: string },
    language: 'en' | 'ms'
): Promise<string> => {
    const langName = language === 'ms' ? "Malay" : "English";
    const personaInstruction = getPersonaInstruction(userProfile, language);

    const countryContext = userProfile.country ? ` The user is from ${userProfile.country}. You MUST use this for implicit context to make your examples relevant, but you are STRICTLY FORBIDDEN from mentioning the country name directly.` : ` Provide a globally relevant explanation.`;

    const systemInstruction = `You are Noor, a wise and insightful Islamic mentor. ${personaInstruction} Your task is to provide a detailed, compassionate, and educational explanation for a common societal misconception, grounding your answer in the provided Quranic verses.
Your explanation MUST be in ${langName}. The tone should be gentle and aimed at inviting reflection, not criticizing or blaming.

**CRITICAL INSTRUCTION:** Your response MUST be a direct and educational explanation. Do NOT start with any greetings (like 'Assalamualaikum'), salutations (like addressing the user by name or 'kakak'), or conversational filler (like 'Saya faham...'). You must go straight into the explanation, beginning immediately with the core topic.

**STYLE GUIDE:** Your response should emulate this example of a "Quranic Mindset" explanation regarding wealth, which starts directly:
"Wealth isn’t just about how much you accumulate—it’s about how much benefit flows from what you have. The Quran does not forbid becoming wealthy—many prophets and companions were blessed with wealth. But the Quran constantly reminds us not to let wealth distract our hearts from our true purpose. In Surah Al-Humazah (104:1–3), Allah warns against those who obsessively hoard wealth, thinking it will last forever. On the other hand, Allah praises those who spend their wealth in good causes, as in Surah Al-Baqarah (2:261), where giving is likened to a seed that grows into seven ears. So, to be truly rich, it’s not just about effort and strategy, but about intention: “Why am I accumulating this wealth?” When your intention is right, your effort becomes worship. And when your wealth is used wisely, blessings will come in unexpected ways."

**YOUR EXPLANATION MUST FOLLOW THIS STRUCTURE:**
1.  Begin directly by explaining the correct, balanced Quranic mindset that counters the misconception, using the provided verse(s) as the primary evidence.
2.  Your explanation MUST cite the specific Quranic verse(s) it is based on. The citation MUST be formatted with markdown bold (e.g., **Al-Baqarah 2:155**). You may also cite other related verses to support your point.
3.  Provide a real-world example to illustrate the point.${countryContext}
4.  Conclude with an encouraging, intention-focused takeaway that guides the user toward a better understanding.
5.  At the very end of your response, you MUST add the following on two separate lines, with nothing after them:
Wallahu'alam
~ Noor, MyQuran Journal
`;

    const userPrompt = `
    The societal misconception is: "${misconceptionText}"

    The relevant Quranic verses from this page are:
    ${pageVerses.map(v => `- ${v.verseKey} (${v.surahName}): "${v.translation}"`).join('\n')}

    Please provide a detailed explanation in ${langName} based on the instructions.
    `;
    
    const config = {
        systemInstruction,
        temperature: 0.7,
    };

    try {
        const response = await fetchFromApi('generateContent', {
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: config
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error explaining misconception:", error);
        throw new Error("Failed to generate explanation. The model may be unavailable.");
    }
};

export const explainVerseMisconception = async (
    misconceptionText: string,
    verses: VerseContent[],
    userProfile: { name: string, country: string, gender: 'male' | 'female', age: string },
    language: 'en' | 'ms'
): Promise<string> => {
    const langName = language === 'ms' ? "Malay" : "English";
    const personaInstruction = getPersonaInstruction(userProfile, language);

    const countryContext = userProfile.country ? ` The user is from ${userProfile.country}. You MUST use this for implicit context to make your examples relevant, but you are STRICTLY FORBIDDEN from mentioning the country name directly.` : ` Provide a globally relevant explanation.`;

    const systemInstruction = `You are Noor, a wise and insightful Islamic mentor. ${personaInstruction} Your task is to provide a detailed, compassionate, and educational explanation for a common societal misconception, grounding your answer in the provided Quranic verse(s).
Your explanation MUST be in ${langName}. The tone should be gentle and aimed at inviting reflection, not criticizing or blaming.

**CRITICAL INSTRUCTION:** Your response MUST be a direct and educational explanation. Do NOT start with any greetings (like 'Assalamualaikum'), salutations (like addressing the user by name or 'kakak'), or conversational filler (like 'Saya faham...'). You must go straight into the explanation, beginning immediately with the core topic.

**STYLE GUIDE:** Your response should emulate this example of a "Quranic Mindset" explanation regarding wealth, which starts directly:
"Wealth isn’t just about how much you accumulate—it’s about how much benefit flows from what you have. The Quran does not forbid becoming wealthy—many prophets and companions were blessed with wealth. But the Quran constantly reminds us not to let wealth distract our hearts from our true purpose. In Surah Al-Humazah (104:1–3), Allah warns against those who obsessively hoard wealth, thinking it will last forever. On the other hand, Allah praises those who spend their wealth in good causes, as in Surah Al-Baqarah (2:261), where giving is likened to a seed that grows into seven ears. So, to be truly rich, it’s not just about effort and strategy, but about intention: “Why am I accumulating this wealth?” When your intention is right, your effort becomes worship. And when your wealth is used wisely, blessings will come in unexpected ways."

**YOUR EXPLANATION MUST FOLLOW THIS STRUCTURE:**
1.  Begin directly by explaining the correct, balanced Quranic mindset that counters the misconception, using the provided verse(s) as the primary evidence.
2.  Your explanation MUST cite the specific Quranic verse(s) it is based on. The citation MUST be formatted with markdown bold (e.g., **Al-Baqarah 2:155**). You may also cite other related verses to support your point.
3.  Provide a real-world example to illustrate the point.${countryContext}
4.  Conclude with an encouraging, intention-focused takeaway that guides the user toward a better understanding.
5.  At the very end of your response, you MUST add the following on two separate lines, with nothing after them:
Wallahu'alam
~ Noor, MyQuran Journal
`;

    const userPrompt = `
    The societal misconception is: "${misconceptionText}"

    The relevant Quranic verse(s) are:
    ${verses.map(v => `- ${v.verseKey} (${v.surahName}): "${v.translation}"`).join('\n')}

    Please provide a detailed explanation in ${langName} based on the instructions.
    `;

    const config = {
        systemInstruction,
        temperature: 0.7,
    };
    
    try {
        const response = await fetchFromApi('generateContent', {
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: config
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error explaining verse misconception:", error);
        throw new Error("Failed to generate explanation. The model may be unavailable.");
    }
};



import { TadabburLevel, TadabburAnalysis, VerseContent, UserSettings, VerseSuggestion, ChatMessage, TadabburDifficulty, PageInsight, Tafsir, PageInsightAction, Misconception, VerseHistory } from '../types';
import { getPersonaInstruction, getLevelPromptPart } from './geminiPromptHelpers';


/**
 * A generic fetcher function to communicate with our backend proxy.
 * This function will handle sending the operation name and its parameters
 * to our secure backend, which will then call the Gemini API.
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
        const errorMessage = `API Error: ${response.status} - ${errorData.error || 'Unknown server error'}`;
        throw new Error(errorMessage);
    }

    // Our backend proxy will return JSON, either the direct result or an object with a `text` property.
    return await response.json();
  } catch (error) {
    console.error(`Error during fetch operation '${operation}':`, error);
    if (error instanceof Error && error.message.includes('API Error')) {
        throw error;
    }
    throw new Error('Failed to communicate with the server. Please check your network connection.');
  }
}


export const generateTadabburAnalysis = async (
  surahName: string,
  verseRange: string,
  verses: VerseContent[],
  level: TadabburLevel,
  userProfile: { name: string; language: 'en' | 'ms', gender: 'male' | 'female', age: string, roles: string[], country: string },
  difficulty: TadabburDifficulty
): Promise<TadabburAnalysis> => {
    
    const needsDakwahPillar = userProfile.roles.includes('huffaz') || userProfile.roles.includes('daie');
    
    const params = {
        surahName,
        verseRange,
        verses,
        level,
        userProfile,
        difficulty,
        needsDakwahPillar
    };

    try {
        const responseJson = await fetchFromApi('getTadabburAnalysis', params);
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
    tadabburAnalysis: TadabburAnalysis['tadabbur'],
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

    const params = {
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
        }
    };
    
    try {
        const response = await fetchFromApi('generateText', params);
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
    
    const params = {
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.8,
        }
    };

    try {
        const response = await fetchFromApi('generateText', params);
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

    const params = {
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: { systemInstruction }
    };

    try {
        const response = await fetchFromApi('generateText', params);
        return response.text.trim();
    } catch (error) {
        console.error("Error summarizing Tazakkur:", error);
        return tazakkurNote.substring(0, 100) + '...';
    }
};

export const suggestVersesForIssue = async (
    issue: string,
    language: 'en' | 'ms'
): Promise<VerseSuggestion[]> => {

    const params = { issue, language };

    try {
        const responseJson = await fetchFromApi('suggestVerses', params);
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
    
    const params = {
        question,
        history,
        verseKey,
        verseContent,
        tadabburAnalysis,
        userProfile,
        language
    };

    try {
        const response = await fetchFromApi('askVerse', params);
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

    const params = {
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
            systemInstruction,
            temperature: 0.1,
        }
    };
    
    try {
        const response = await fetchFromApi('generateText', params);
        return response.text.trim();
    } catch (error) {
        console.error("Error translating Tafsir content:", error);
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
    const params = {
        pageNumber,
        pageVerses,
        tafsirContent,
        tazkirulTafsirContent,
        userProfile,
        language
    };

    try {
        const responseJson = await fetchFromApi('getPageInsight', params);
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
    const params = { pageInsight, pageVerses, userProfile, language };

    try {
        const responseJson = await fetchFromApi('getDeeperPageActions', params);
        return responseJson;
    } catch (error) {
        console.error("Error generating deeper page actions:", error);
        throw new Error("Failed to generate deeper actions. The model may be unavailable.");
    }
};


export const explainMisconception = async (
    misconceptionText: string,
    pageVerses: VerseContent[],
    userProfile: { name: string, country: string, gender: 'male' | 'female', age: string, roles: string[] },
    language: 'en' | 'ms'
): Promise<string> => {
    const langName = language === 'ms' ? "Malay" : "English";
    const personaInstruction = getPersonaInstruction(userProfile, language);

    const countryContext = userProfile.country ? ` The user is from ${userProfile.country}. You MUST use this for implicit context to make your examples relevant, but you are STRICTLY FORBIDDEN from mentioning the country name directly.` : ` Provide a globally relevant explanation.`;

    const systemInstruction = `You are Noor, a wise and insightful Islamic mentor. ${personaInstruction} Your task is to provide a detailed, compassionate, and educational explanation for a common societal misconception, grounding your answer in the provided Quranic verses.
Your explanation MUST be in ${langName}. The tone should be gentle and aimed at inviting reflection, not criticizing or blaming.

**CRITICAL INSTRUCTION:** Your response MUST be a direct and educational explanation. Do NOT start with any greetings (like 'Assalamualaikum'), salutations (like addressing the user by name or 'kakak'), or conversational filler (like 'Saya faham...'). You must go straight into the explanation, beginning immediately with the core topic.

**STYLE GUIDE:** Your response should emulate this example of a "Quranic Mindset" explanation regarding wealth, which starts directly:
"Wealth isn’t just about how much you accumulate—it’s about how much benefit flows from what you have. The Quran does not forbid becoming wealthy—many prophets and companions were blessed with wealth. But the Quran constantly reminds us not to let our hearts from our true purpose. In Surah Al-Humazah (104:1–3), Allah warns against those who obsessively hoard wealth, thinking it will last forever. On the other hand, Allah praises those who spend their wealth in good causes, as in Surah Al-Baqarah (2:261), where giving is likened to a seed that grows into seven ears. So, to be truly rich, it’s not just about effort and strategy, but about intention: “Why am I accumulating this wealth?” When your intention is right, your effort becomes worship. And when your wealth is used wisely, blessings will come in unexpected ways."

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
    
    const params = {
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
            systemInstruction,
            temperature: 0.7,
        }
    };
    
    try {
        const response = await fetchFromApi('generateText', params);
        return response.text.trim();
    } catch (error) {
        console.error("Error explaining misconception:", error);
        throw new Error("Failed to generate explanation. The model may be unavailable.");
    }
};

export const explainVerseMisconception = async (
    misconceptionText: string,
    verses: VerseContent[],
    userProfile: { name: string, country: string, gender: 'male' | 'female', age: string, roles: string[] },
    language: 'en' | 'ms'
): Promise<string> => {
    const langName = language === 'ms' ? "Malay" : "English";
    const personaInstruction = getPersonaInstruction(userProfile, language);

    const countryContext = userProfile.country ? ` The user is from ${userProfile.country}. You MUST use this for implicit context to make your examples relevant, but you are STRICTLY FORBIDDEN from mentioning the country name directly.` : ` Provide a globally relevant explanation.`;

    const systemInstruction = `You are Noor, a wise and insightful Islamic mentor. ${personaInstruction} Your task is to provide a detailed, compassionate, and educational explanation for a common societal misconception, grounding your answer in the provided Quranic verse(s).
Your explanation MUST be in ${langName}. The tone should be gentle and aimed at inviting reflection, not criticizing or blaming.

**CRITICAL INSTRUCTION:** Your response MUST be a direct and educational explanation. Do NOT start with any greetings (like 'Assalamualaikum'), salutations (like addressing the user by name or 'kakak'), or conversational filler (like 'Saya faham...'). You must go straight into the explanation, beginning immediately with the core topic.

**STYLE GUIDE:** Your response should emulate this example of a "Quranic Mindset" explanation regarding wealth, which starts directly:
"Wealth isn’t just about how much you accumulate—it’s about how much benefit flows from what you have. The Quran does not forbid becoming wealthy—many prophets and companions were blessed with wealth. But the Quran constantly reminds us not to let our hearts from our true purpose. In Surah Al-Humazah (104:1–3), Allah warns against those who obsessively hoard wealth, thinking it will last forever. On the other hand, Allah praises those who spend their wealth in good causes, as in Surah Al-Baqarah (2:261), where giving is likened to a seed that grows into seven ears. So, to be truly rich, it’s not just about effort and strategy, but about intention: “Why am I accumulating this wealth?” When your intention is right, your effort becomes worship. And when your wealth is used wisely, blessings will come in unexpected ways."

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

    const params = {
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
            systemInstruction,
            temperature: 0.7,
        }
    };
    
    try {
        const response = await fetchFromApi('generateText', params);
        return response.text.trim();
    } catch (error) {
        console.error("Error explaining verse misconception:", error);
        throw new Error("Failed to generate explanation. The model may be unavailable.");
    }
};
import { TadabburLevel, TadabburAnalysis, VerseContent, UserSettings, VerseSuggestion, ChatMessage, TadabburDifficulty, PageInsight, PageInsightAction, VerseHistory } from '../types';

/**
 * A generic fetcher function to communicate with our backend proxy.
 * This function handles sending the operation name and its parameters
 * to our secure backend, which will then call the Gemini API.
 */
async function fetchFromApi(operation: string, params: object): Promise<any> {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Pass the operation and params in the body, the backend will parse it.
      body: JSON.stringify({ operation, params }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        const errorMessage = `API Error: ${response.status} - ${errorData.error || 'Unknown server error'}`;
        throw new Error(errorMessage);
    }

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
  userProfile: { name: string; gender: 'male' | 'female', age: string, roles: string[], country: string },
  difficulty: TadabburDifficulty
): Promise<TadabburAnalysis> => {
    
    const needsDakwahPillar = userProfile.roles.includes('huffaz') || userProfile.roles.includes('daie');
    
    const params = {
        surahName,
        verseRange,
        verses,
        level,
        userProfile: { ...userProfile, language: 'ms' },
        difficulty,
        needsDakwahPillar
    };

    try {
        return await fetchFromApi('getTadabburAnalysis', params);
    } catch (error) {
        console.error("Error generating Tadabbur analysis via proxy:", error);
        if (error instanceof Error && error.message.toLowerCase().includes('blocked')) {
            throw new Error("errorBlockedRequest");
        }
        throw new Error("Failed to generate Tadabbur. The model may be unavailable or the request may have been blocked.");
    }
};

export const generatePersonalizedTazakkur = async (
    tadabburAnalysis: TadabburAnalysis['tadabbur'],
    userProfile: { name: string; gender: 'male' | 'female'; age: string; roles: string[]; roleOther?: string; country: string; }
): Promise<string> => {
    const params = { tadabburAnalysis, userProfile, language: 'ms' };
    try {
        const response = await fetchFromApi('getPersonalizedTazakkur', params);
        return response.text;
    } catch (error) {
        console.error("Error generating personalized Tazakkur via proxy:", error);
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
    verseRange: string
): Promise<string> => {
    const params = { tadabburAnalysis, userProfile, verses, verseRange, language: 'ms' };
    try {
        const response = await fetchFromApi('getDeeperTazakkur', params);
        return response.text;
    } catch (error) {
        console.error("Error generating deeper Tazakkur via proxy:", error);
        throw new Error("Failed to generate deeper advice. The model may be unavailable.");
    }
};

export const summarizeTazakkur = async (
    tazakkurNote: string
): Promise<string> => {
    const params = { tazakkurNote, language: 'ms' };
    try {
        const response = await fetchFromApi('summarizeTazakkur', params);
        return response.text;
    } catch (error) {
        console.error("Error summarizing Tazakkur via proxy:", error);
        return tazakkurNote.substring(0, 100) + '...';
    }
};

export const suggestVersesForIssue = async (
    issue: string
): Promise<VerseSuggestion[]> => {
    const params = { issue, language: 'ms' };
    try {
        return await fetchFromApi('suggestVerses', params);
    } catch (error) {
        console.error("Error suggesting verses via proxy:", error);
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
    userProfile: UserSettings
): Promise<string> => {
    const params = { question, history, verseKey, verseContent, tadabburAnalysis, userProfile, language: 'ms' };
    try {
        const response = await fetchFromApi('askVerse', params);
        return response.text;
    } catch (error) {
        console.error("Error asking about verse via proxy:", error);
        throw new Error("Failed to get an answer. The model may be unavailable.");
    }
};

export const generatePageSummaryAndActions = async (
    pageNumber: number,
    pageVerses: VerseContent[],
    tafsirContent: string,
    tazkirulTafsirContent: string,
    userProfile: { name: string; roles: string[]; country: string; gender: 'male' | 'female'; age: string; }
): Promise<PageInsight> => {
    const params = { pageNumber, pageVerses, tafsirContent, tazkirulTafsirContent, userProfile, language: 'ms' };
    try {
        return await fetchFromApi('getPageInsight', params);
    } catch (error) {
        console.error("Error generating page insight via proxy:", error);
        if (error instanceof Error && error.message.toLowerCase().includes('blocked')) {
            throw new Error("errorBlockedRequest");
        }
        throw new Error("Failed to generate page insight. The model may be unavailable.");
    }
};

export const generateDeeperPageActions = async (
    pageInsight: PageInsight,
    pageVerses: VerseContent[],
    userProfile: { name: string; gender: 'male' | 'female', age: string, roles: string[] }
): Promise<PageInsightAction[]> => {
    const params = { pageInsight, pageVerses, userProfile, language: 'ms' };
    try {
        return await fetchFromApi('getDeeperPageActions', params);
    } catch (error) {
        console.error("Error generating deeper page actions via proxy:", error);
        throw new Error("Failed to generate deeper actions. The model may be unavailable.");
    }
};

export const explainMisconception = async (
    misconceptionText: string,
    pageVerses: VerseContent[],
    userProfile: UserSettings
): Promise<string> => {
    const params = { misconceptionText, pageVerses, userProfile, language: 'ms' };
    try {
        const response = await fetchFromApi('explainMisconception', params);
        return response.text;
    } catch (error) {
        console.error("Error explaining misconception via proxy:", error);
        throw new Error("Failed to generate explanation. The model may be unavailable.");
    }
};

export const explainVerseMisconception = async (
    misconceptionText: string,
    verses: VerseContent[],
    userProfile: UserSettings
): Promise<string> => {
    const params = { misconceptionText, verses, userProfile, language: 'ms' };
    try {
        const response = await fetchFromApi('explainVerseMisconception', params);
        return response.text;
    } catch (error) {
        console.error("Error explaining verse misconception via proxy:", error);
        throw new Error("Failed to generate explanation. The model may be unavailable.");
    }
};
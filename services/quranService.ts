
import { VerseContent, TafsirApiResponse, Tafsir } from '../types';
import { SURAH_VERSE_COUNTS, SURAH_NAMES } from '../constants';
import { translateTafsirContent } from './geminiService';

const QURAN_COM_API_BASE = 'https://api.quran.com/api/v4';


const LANGUAGE_MAP = {
  en: '20', // Dr. Mustafa Khattab, the Clear Quran
  ms: '33',  // Basmeih
};

interface ApiVerseTranslation {
  resource_id: number;
  text: string;
}

interface ApiVerse {
  id: number;
  verse_key: string;
  text_uthmani: string;
  juz_number: number;
  page_number: number;
  translations: ApiVerseTranslation[];
}

interface VerseByKeyResponse {
  verse: ApiVerse;
}

interface VersesByPageResponse {
  verses: ApiVerse[];
}

const mapApiVerseToVerseContent = (apiVerse: ApiVerse): VerseContent | null => {
    const [surahNumStr] = apiVerse.verse_key.split(':');
    const surahNum = parseInt(surahNumStr);
    
    const arabic = apiVerse.text_uthmani;
    const translationText = apiVerse.translations?.[0]?.text;
    const juzNumber = apiVerse.juz_number;
    const pageNumber = apiVerse.page_number;
    const surahName = SURAH_NAMES[surahNum - 1];

    if (!arabic || !translationText || juzNumber === undefined || pageNumber === undefined || !surahName) {
        return null;
    }
    
    const translation = translationText.replace(/<[^>]*>?/gm, '');

    return { 
      arabic, 
      translation, 
      juzNumber, 
      pageNumber, 
      surahName, 
      verseKey: apiVerse.verse_key 
    };
};

export const getVerseContent = async (
  surahNumber: number,
  ayahNumber: number,
  language: 'en' | 'ms'
): Promise<VerseContent> => {
  const verseKey = `${surahNumber}:${ayahNumber}`;
  const translationId = LANGUAGE_MAP[language];

  const url = `${QURAN_COM_API_BASE}/verses/by_key/${verseKey}?translations=${translationId}&fields=text_uthmani,juz_number,page_number`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch verse. The Surah/Ayah may not exist. (Status: ${response.status})`);
    }
    const data: VerseByKeyResponse = await response.json();
    const verseContent = mapApiVerseToVerseContent(data.verse);
    
    if (!verseContent) {
      throw new Error('Invalid response structure from Quran.com API: Essential verse data is missing.');
    }
    
    return verseContent;

  } catch (error) {
    console.error("Error fetching verse content from Quran.com:", error);
    if (error instanceof Error) {
        throw new Error(error.message);
    }
    throw new Error("An unknown error occurred while fetching the verse.");
  }
};

export const getVersesInRange = async (
    surahNumber: number,
    startAyah: number,
    endAyah: number,
    language: 'en' | 'ms'
): Promise<VerseContent[]> => {
    const promises: Promise<VerseContent>[] = [];
    for (let i = startAyah; i <= endAyah; i++) {
        promises.push(getVerseContent(surahNumber, i, language));
    }
    try {
        const verses = await Promise.all(promises);
        return verses;
    } catch (error) {
        console.error("Error fetching verses in range:", error);
        throw new Error("Failed to fetch one or more verses in the selected range.");
    }
};

export const getVersesForPage = async (
    pageNumber: number,
    language: 'en' | 'ms'
): Promise<VerseContent[]> => {
    const translationId = LANGUAGE_MAP[language];
    const url = `${QURAN_COM_API_BASE}/verses/by_page/${pageNumber}?translations=${translationId}&fields=text_uthmani,juz_number,page_number`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch page data. Page may not exist. (Status: ${response.status})`);
        }
        const data: VersesByPageResponse = await response.json();
        
        const pageVerses = data.verses
            .map(mapApiVerseToVerseContent)
            .filter((v): v is VerseContent => v !== null);
            
        if (pageVerses.length === 0) {
            throw new Error('No valid verses found for this page.');
        }

        return pageVerses;
    } catch (error) {
        console.error("Error fetching verses for page from Quran.com:", error);
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error("An unknown error occurred while fetching page data.");
    }
};

export const getVerseTafsir = async (verseKey: string, language: 'en' | 'ms', favoriteTafsir: string): Promise<TafsirApiResponse> => {
    const [surah, ayah] = verseKey.split(':');
    const url = `https://quranapi.pages.dev/api/tafsir/${surah}_${ayah}.json`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch Tafsir. Status: ${response.status}`);
        }
        const data: TafsirApiResponse = await response.json();
        
        if (data && data.tafsirs && data.tafsirs.length > 0) {
            // Find the favorite tafsir, or fallback to the first one
            const selectedTafsir = data.tafsirs.find(t => t.author === favoriteTafsir) || data.tafsirs[0];
            
            // If language is Malay and an API key is available in env, translate the content.
            if (language === 'ms' && process.env.API_KEY) {
                const [translatedContent, translatedGroupVerse] = await Promise.all([
                    translateTafsirContent(selectedTafsir.content),
                    selectedTafsir.groupVerse ? translateTafsirContent(selectedTafsir.groupVerse) : Promise.resolve(null)
                ]);
                const translatedTafsir: Tafsir = { ...selectedTafsir, content: translatedContent, groupVerse: translatedGroupVerse };
                return { ...data, tafsirs: [translatedTafsir] };
            }
            
            return { ...data, tafsirs: [selectedTafsir] };
        } else {
            throw new Error("Tafsir not found for this verse.");
        }
    } catch (error) {
        console.error("Error fetching verse tafsir:", error);
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error("An unknown error occurred while fetching the tafsir.");
    }
};

export const getVerseAudioUrl = (verseKey: string, reciterId: string): string => {
    const [surah, ayah] = verseKey.split(':');
   
    if (!surah || !ayah || !reciterId) {
        console.error("Invalid input for getVerseAudioUrl", { verseKey, reciterId });
        return "";
    }
    
    return `https://the-quran-project.github.io/Quran-Audio/Data/${reciterId}/${surah}_${ayah}.mp3`;
};
export enum TadabburLevel {
  L1 = "L1",
  L2 = "L2",
  L3 = "L3",
  L4 = "L4",
  L5 = "L5",
  L6 = "L6",
  L7 = "L7",
  L8 = "L8",
}

export type TadabburDifficulty = 'easy' | 'intermediate' | 'high' | 'comprehensive';
export type FontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';

export interface Bookmark {
  note: string;
  pinned: boolean;
  createdAt: string; // ISO Date String
}

export interface BookmarkCategory {
  id: string; // unique id, e.g., timestamp
  name: string;
  color: string;
  verseKeys: string[]; // array of verseKeys
}

export interface Misconception {
    text: string;
    explanation?: string;
}

export interface VerseHistory {
  type: 'verse';
  verseKey: string; 
  date: string; 
  tazakkurNote?: string; 
  tazakkurSummary?: string;
  rating?: number;
  understood?: boolean;
  misconception?: Misconception;
}

export interface PageInsightAction {
  text: string;
  source: string;
  surahName: string;
}

export interface PageHistory {
    type: 'page';
    pageNumber: number;
    title?: string;
    date: string;
    summary: string;
    actions: PageInsightAction[];
    deeperActions?: PageInsightAction[];
    tags?: string[];
    continuity?: {
      prev: string;
      next: string;
    };
    misconceptions?: Misconception[];
}

export type HistoryItem = VerseHistory | PageHistory;

export interface UserSettings {
  name: string;
  profilePic: string | null; // base64 string
  theme: 'light' | 'dark';
  language: 'en' | 'ms';
  gender: 'male' | 'female';
  roles: string[]; // e.g., ['father', 'student']
  roleOther?: string; // for custom 'other' role input
  age: string;
  country: string;
  tadabburDifficulty: TadabburDifficulty;
  history: HistoryItem[];
  points: number;
  bookmarks: { [verseKey: string]: Bookmark };
  bookmarkCategories: BookmarkCategory[];
  hasCompletedOnboarding: boolean;
  lastSeenVersion: string;
  favoriteTafsir: string;
  reciter: string;
  arabicFontSize: FontSize;
  translationFontSize: FontSize;
}

export interface TadabburLevelDetail {
  title: string;
  description: string;
}

export interface VerseContent {
  arabic: string;
  translation: string;
  juzNumber: number;
  pageNumber: number;
  surahName: string;
  verseKey: string;
}

export interface TadabburSegment {
  reflectionPoints: string;
  reflectionParagraph: string;
  tags: string[];
}

export interface TadabburSegments {
  ta: TadabburSegment;
  ti: TadabburSegment;
  ts: TadabburSegment;
  td?: TadabburSegment;
}

export interface TadabburAnalysis {
  tadabbur: TadabburSegments;
  relatedHadith: {
    text: string;
    translation: string;
    source: string;
  } | null;
  misconception?: Misconception;
}

export interface VerseSuggestion {
  verseKey: string; // "2:255"
  surahName: string; // "Al-Baqarah"
  reason: string; // "This verse reminds you of Allah's ultimate power..."
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface Tafsir {
  author: string;
  groupVerse: string | null;
  content: string;
}

export interface TafsirApiResponse {
  surahName: string;
  surahNo: number;
  ayahNo: number;
  tafsirs: Tafsir[];
}

export interface PageInsight {
  title: string;
  summary: string;
  actions: PageInsightAction[];
  deeperActions?: PageInsightAction[];
  tags: string[];
  continuity: {
    prev: string;
    next: string;
  };
  misconceptions: Misconception[];
}

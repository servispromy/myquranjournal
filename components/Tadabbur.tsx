import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { TadabburLevel, TadabburAnalysis, UserSettings, VerseContent, TadabburSegment, BookmarkCategory, Bookmark, Misconception, VerseHistory } from '../types';
import { SURAH_NAMES, TADABBUR_LEVELS, APP_VERSION, SURAH_VERSE_COUNTS, TADABBUR_DIFFICULTY_LEVELS } from '../constants';
import { getVerseContent, getVerseAudioUrl, getVersesInRange } from '../services/quranService';
import { generateTadabburAnalysis, generatePersonalizedTazakkur, generateDeeperTazakkur, explainVerseMisconception } from '../services/geminiService';
import { useI18n } from '../lib/i18n';
import { FiBook, FiBookOpen, FiChevronsRight, FiLoader, FiAlertTriangle, FiShield, FiUser, FiCompass, FiTag, FiUser as FiUserIcon, FiSettings, FiAlignLeft, FiList, FiEdit, FiInfo, FiShare2, FiSave, FiStar, FiBookmark, FiVolume2, FiPause, FiChevronLeft, FiChevronRight, FiMessageCircle, FiZap, FiChevronDown, FiSend, FiCheckCircle, FiCheck, FiThumbsUp, FiAlertCircle, FiPlay, FiHelpCircle, FiPlus, FiMinus } from 'react-icons/fi';
import { VscSparkle } from "react-icons/vsc";
import ReactMarkdown from 'react-markdown';
import InfoModal from './InfoModal';
import { Dashboard } from './Dashboard';
import SearchableSelect from './SearchableSelect';
import CongratsModal from './CongratsModal';
import PersonalHelperModal from './PersonalHelperModal';
import BookmarkVerseModal from './BookmarkVerseModal';
import TafsirModal from './TafsirModal';
import VerseTooltip from './VerseTooltip';


interface TadabburProps {
  settings: UserSettings;
  onSettingsClick: () => void;
  onHistoryUpdate: (historyData: Omit<VerseHistory, 'type' | 'date'>) => void;
  onNavigateToHistory: () => void;
  onNavigateToFindGuidance: () => void;
  onNavigateToPageInsight: () => void;
  onCacheSummary: (verseKey: string, summary: string) => void;
  onBookmarkUpdate: (updates: { bookmarks: UserSettings['bookmarks'], bookmarkCategories: UserSettings['bookmarkCategories'] }) => void;
  initialVerseKey: string | null;
  onPreloadConsumed: () => void;
  onOpenUpdateLog: () => void;
  onOpenDisclaimerInfo: () => void;
}

const Spinner: React.FC<{text: string}> = ({text}) => {
    const { t } = useI18n();
    return (
        <div className="flex flex-col items-center justify-center space-y-2 text-sky-500 dark:text-sky-400">
            <FiLoader className="animate-spin text-4xl" />
            <p className="text-lg">{text}</p>
            <p className="text-xs text-sky-600/70 dark:text-sky-500/70">{t('spinnerTakeMoment')}</p>
        </div>
    );
}

type ReflectionFormat = 'points' | 'paragraph';
type ReflectionStep = 'initial' | 'verse_ready' | 'tadabbur_ready' | 'saved';
type ReflectionMode = 'single' | 'range';

const colorClasses = {
  sky: {
    title: 'text-sky-700 dark:text-sky-300',
    tagBg: 'bg-sky-100 dark:bg-sky-900/50',
    tagText: 'text-sky-700 dark:text-sky-300',
  },
  green: {
    title: 'text-green-700 dark:text-green-300',
    tagBg: 'bg-green-100 dark:bg-green-900/50',
    tagText: 'text-green-700 dark:text-green-300',
  },
  amber: {
    title: 'text-amber-700 dark:text-amber-300',
    tagBg: 'bg-amber-100 dark:bg-amber-900/50',
    tagText: 'text-amber-700 dark:text-amber-300',
  },
  purple: {
    title: 'text-purple-700 dark:text-purple-300',
    tagBg: 'bg-purple-100 dark:bg-purple-900/50',
    tagText: 'text-purple-700 dark:text-purple-300',
  }
};

const TadabburCard: React.FC<{ icon: React.ElementType, title: string, description: string, segment: TadabburSegment, format: ReflectionFormat, color: 'sky' | 'green' | 'amber' | 'purple', onShare: () => void, isOpen: boolean, onToggle: () => void }> = ({ icon: Icon, title, description, segment, format, color, onShare, isOpen, onToggle }) => {
    const classes = colorClasses[color];
    const { t } = useI18n();
    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
            <button onClick={onToggle} className="w-full flex justify-between items-start text-left gap-2">
                <div className="flex items-center gap-3">
                    <Icon className="text-gray-800 dark:text-slate-200" />
                    <h3 className={`font-bold text-md ${classes.title}`}>{title}</h3>
                    <div className="relative group flex items-center" onClick={e => e.stopPropagation()}>
                        <FiInfo tabIndex={0} role="button" aria-describedby={`tooltip-${title}`} className="cursor-help text-gray-400 dark:text-gray-500 w-4 h-4 focus:outline-none" />
                        <div id={`tooltip-${title}`} role="tooltip" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-800 dark:bg-slate-950 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                            {description}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800 dark:border-t-slate-950"></div>
                        </div>
                    </div>
                </div>
                 <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); onShare(); }} title={t('shareSegment')} className="text-gray-500 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors p-1 -mt-1 -mr-1">
                        <FiShare2 size={16} />
                    </button>
                    <FiChevronDown className={`text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1000px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                <div className="prose prose-sm max-w-none text-gray-700 dark:text-slate-300 prose-ul:list-disc">
                    <ReactMarkdown>{format === 'points' ? segment.reflectionPoints : segment.reflectionParagraph}</ReactMarkdown>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    {segment.tags.map(tag => (
                        <span key={tag} className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${classes.tagBg} ${classes.tagText}`}><FiTag size={12} /> {tag}</span>
                    ))}
                </div>
            </div>
        </div>
    );
};


const StarRating: React.FC<{ rating: number; setRating: (rating: number) => void }> = ({ rating, setRating }) => (
    <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
            <button key={i} onClick={() => setRating(i + 1)}>
                <FiStar className={`transition-colors w-5 h-5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-slate-600'}`} />
            </button>
        ))}
    </div>
);


const Tadabbur: React.FC<TadabburProps> = ({ settings, onSettingsClick, onHistoryUpdate, onNavigateToHistory, onNavigateToFindGuidance, onNavigateToPageInsight, onCacheSummary, onBookmarkUpdate, initialVerseKey, onPreloadConsumed, onOpenUpdateLog, onOpenDisclaimerInfo }) => {
    const [reflectionMode, setReflectionMode] = useState<ReflectionMode>('single');
    const [surahNumber, setSurahNumber] = useState('1');
    const [startAyah, setStartAyah] = useState('1');
    const [endAyah, setEndAyah] = useState('1');

    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingTazakkur, setIsGeneratingTazakkur] = useState(false);
    const [isGeneratingDeeperTazakkur, setIsGeneratingDeeperTazakkur] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [verseData, setVerseData] = useState<VerseContent[] | null>(null);
    const [analysisData, setAnalysisData] = useState<TadabburAnalysis | null>(null);
    const [reflectionFormat, setReflectionFormat] = useState<ReflectionFormat>('points');
    const [tazakkurNote, setTazakkurNote] = useState('');
    const [rating, setRating] = useState(0);
    const [understood, setUnderstood] = useState(false);
    const [includeMisconception, setIncludeMisconception] = useState(true);
    const [isInfoModalOpen, setInfoModalOpen] = useState(false);
    const [isCongratsModalOpen, setCongratsModalOpen] = useState(false);
    const [isHelperModalOpen, setIsHelperModalOpen] = useState(false);
    const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
    const [isTafsirModalOpen, setIsTafsirModalOpen] = useState(false);
    const [reflectionStep, setReflectionStep] = useState<ReflectionStep>('initial');
    const [openTadabburCard, setOpenTadabburCard] = useState<'ta' | 'ti' | 'ts' | 'td' | null>('ta');
    const [isExplainingMisconception, setIsExplainingMisconception] = useState(false);
    const [selectedBookmarkVerseKey, setSelectedBookmarkVerseKey] = useState<string | null>(null);
    const [explanationFontSizeIndex, setExplanationFontSizeIndex] = useState(0);
    const explanationFontClasses = ['text-xs', 'text-sm', 'text-base'];
    
    const verseToReadRef = useRef<{ s: string; a: string } | null>(null);
    const verseSelectionRef = useRef<HTMLDivElement>(null);
    const verseDisplayRef = useRef<HTMLDivElement>(null);
    const tazakkurTextareaRef = useRef<HTMLTextAreaElement>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'error'>('idle');
    const [playingVerseKey, setPlayingVerseKey] = useState<string | null>(null);
    const [isRangePlaying, setIsRangePlaying] = useState(false);
    const [rangePlayIndex, setRangePlayIndex] = useState(0);
    const verseRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const transitionTimeoutRef = useRef<number | null>(null);

    const { t, lang } = useI18n();

    const isCurrentVerseCompleted = useMemo(() => {
        if (!surahNumber || !startAyah) return false;
        const key = reflectionMode === 'single' 
            ? `${surahNumber}:${startAyah}` 
            : `${surahNumber}:${startAyah}-${endAyah}`;
        return settings.history.some(item => item.type === 'verse' && item.verseKey === key);
    }, [reflectionMode, surahNumber, startAyah, endAyah, settings.history]);

    const surahOptions = useMemo(() => SURAH_NAMES.map((name, index) => ({
        label: `${index + 1}. ${name}`,
        value: String(index + 1)
    })), []);
    
    const maxAyah = useMemo(() => SURAH_VERSE_COUNTS[parseInt(surahNumber) - 1] || 1, [surahNumber]);

    const { gregorianDate, hijriDate } = useMemo(() => {
        const today = new Date();
        const gregorian = new Intl.DateTimeFormat(lang === 'ms' ? 'ms-MY' : 'en-US', { dateStyle: 'long' }).format(today);
        const hijri = new Intl.DateTimeFormat(lang === 'ms' ? 'ar-u-ca-islamic-nu-latn' : 'en-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(today);
        return { gregorianDate: gregorian, hijriDate: hijri };
    }, [lang]);
    
    useEffect(() => {
        const textarea = tazakkurTextareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [tazakkurNote]);

    const resetAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.removeAttribute('src');
            if (audioRef.current.readyState > 0) {
              audioRef.current.load();
            }
        }
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
            transitionTimeoutRef.current = null;
        }
        setPlayingVerseKey(null);
        setIsRangePlaying(false);
        setRangePlayIndex(0);
        setAudioState('idle');
    }, []);
    
    const handleReflect = useCallback(async () => {
        const sNum = parseInt(surahNumber, 10);
        const startA = parseInt(startAyah, 10);
        const endA = reflectionMode === 'range' ? parseInt(endAyah, 10) : startA;
        const currentMaxAyah = SURAH_VERSE_COUNTS[sNum - 1] || 1;

        if (isNaN(sNum) || isNaN(startA) || isNaN(endA) || startA < 1 || startA > currentMaxAyah || endA < startA || endA > currentMaxAyah) {
            setError(t('errorInvalidAyah', { max: currentMaxAyah }));
            return;
        }

        setIsLoading(true);
        setError(null);
        setVerseData(null);
        setAnalysisData(null);
        setTazakkurNote('');
        setRating(0);
        setUnderstood(false);
        setIncludeMisconception(true);
        setOpenTadabburCard('ta');
        resetAudio();
        
        try {
            let verseResult;
            if (reflectionMode === 'single') {
                verseResult = [await getVerseContent(sNum, startA, lang)];
            } else {
                verseResult = await getVersesInRange(sNum, startA, endA, lang);
            }
            setVerseData(verseResult);
            setReflectionStep('verse_ready');
        } catch (err: any) {
            setError(err.message || t('errorUnknown'));
            setReflectionStep('initial');
        } finally {
            setIsLoading(false);
        }
    }, [surahNumber, startAyah, endAyah, reflectionMode, lang, t, resetAudio]);


    useEffect(() => {
        if (verseDisplayRef.current) {
            verseDisplayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [verseData]);

    const handleNavigate = useCallback((direction: 'next' | 'prev') => {
        let currentSurah = parseInt(surahNumber, 10);
        let currentAyah = parseInt(startAyah, 10);

        if (direction === 'next') {
            const currentMaxAyah = SURAH_VERSE_COUNTS[currentSurah - 1];
            if (currentAyah < currentMaxAyah) {
                currentAyah++;
            } else if (currentSurah < 114) {
                currentSurah++;
                currentAyah = 1;
            } else {
                return; // End of Quran
            }
        } else { // prev
            if (currentAyah > 1) {
                currentAyah--;
            } else if (currentSurah > 1) {
                currentSurah--;
                currentAyah = SURAH_VERSE_COUNTS[currentSurah - 1];
            } else {
                return; // Start of Quran
            }
        }

        setSurahNumber(String(currentSurah));
        setStartAyah(String(currentAyah));
        setEndAyah(String(currentAyah));
        
        // This state update will trigger the `handleReflect` call in the button's onClick
        verseToReadRef.current = {s: String(currentSurah), a: String(currentAyah)};
        
    }, [surahNumber, startAyah]);

    useEffect(() => {
        if (verseToReadRef.current) {
            handleReflect();
            verseToReadRef.current = null;
        }
    }, [startAyah, surahNumber, handleReflect]);

    const resetVerseSelection = useCallback(() => {
        setReflectionStep('initial');
        setVerseData(null);
        setAnalysisData(null);
        setError(null);
        setTazakkurNote('');
        setRating(0);
        setUnderstood(false);
        setIncludeMisconception(true);
        resetAudio();
    }, [resetAudio]);

    useEffect(() => {
        resetVerseSelection();
    }, [surahNumber, startAyah, endAyah, reflectionMode, resetVerseSelection]);
    
    useEffect(() => {
        const loadInitialVerse = () => {
            if (initialVerseKey) {
                onPreloadConsumed();
                if (initialVerseKey.includes('-')) {
                    const [sNum, ayahRange] = initialVerseKey.split(':');
                    const [startA, endA] = ayahRange.split('-');
                    setReflectionMode('range');
                    setSurahNumber(sNum);
                    setStartAyah(startA);
                    setEndAyah(endA);
                } else {
                    const [sNum, aNum] = initialVerseKey.split(':');
                    setReflectionMode('single');
                    setSurahNumber(sNum);
                    setStartAyah(aNum);
                    setEndAyah(aNum);
                }
                // Use a ref to trigger reflection after state updates
                verseToReadRef.current = {s: '', a: ''}; // dummy values to trigger effect
            }
        };
        loadInitialVerse();
    }, [initialVerseKey, onPreloadConsumed]);
    
    const handleSurahChange = (newSurahNumber: string) => {
        setSurahNumber(newSurahNumber);
        setStartAyah('1');
        setEndAyah('1');
    };
    
    const handleAyahChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
        const val = e.target.value;
        const setter = type === 'start' ? setStartAyah : setEndAyah;
        setter(val);
    };
    
    const handleAyahBlur = (e: React.FocusEvent<HTMLInputElement>, type: 'start' | 'end') => {
        const val = e.target.value;
        let num = parseInt(val, 10);
        if (isNaN(num) || num < 1) {
            num = 1;
        } else if (num > maxAyah) {
            num = maxAyah;
        }
        
        if (type === 'start') {
            setStartAyah(String(num));
            if (reflectionMode === 'range' && num > parseInt(endAyah)) {
                setEndAyah(String(num));
            }
        } else {
            setEndAyah(String(num));
            if (reflectionMode === 'range' && num < parseInt(startAyah)) {
                setStartAyah(String(num));
            }
        }
    };
    
    const playAudio = useCallback((verseKey: string) => {
        const audio = audioRef.current;
        if (!audio) return;

        setAudioState('loading');
        setPlayingVerseKey(verseKey);
        audio.src = getVerseAudioUrl(verseKey, settings.reciter);
        audio.play().catch(() => {
            setError(t('errorAudio'));
            resetAudio();
        });
    }, [settings.reciter, t, resetAudio]);


    const handlePlayPauseSingleAudio = useCallback(() => {
        const currentAudio = audioRef.current;
        if (!currentAudio || !verseData || verseData.length !== 1) return;
    
        if (audioState === 'playing') {
            currentAudio.pause();
        } else if (audioState === 'paused') {
            currentAudio.play().catch(() => setAudioState('error'));
        } else {
            playAudio(verseData[0].verseKey);
        }
    }, [audioState, verseData, playAudio]);

    const performTadabburGeneration = useCallback(async () => {
        const surahName = SURAH_NAMES[parseInt(surahNumber) - 1];
        if (!verseData || !surahName) {
            setError(t('errorUnknown'));
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const availableLevels = TADABBUR_DIFFICULTY_LEVELS[settings.tadabburDifficulty];
            const randomLevel = availableLevels[Math.floor(Math.random() * availableLevels.length)];
            const verseRangeStr = reflectionMode === 'single' ? startAyah : `${startAyah}-${endAyah}`;
            
            const analysisResult = await generateTadabburAnalysis(surahName, verseRangeStr, verseData, randomLevel, { name: settings.name, language: lang, gender: settings.gender, age: settings.age, roles: settings.roles, country: settings.country }, settings.tadabburDifficulty);
            setAnalysisData(analysisResult);
            setReflectionStep('tadabbur_ready');
        } catch (err: any) {
            setError(err.message || t('errorUnknown'));
        } finally {
            setIsLoading(false);
        }
    }, [surahNumber, startAyah, endAyah, reflectionMode, lang, t, verseData, settings]);

    const handleGenerateTadabbur = useCallback(() => {
        performTadabburGeneration();
    }, [performTadabburGeneration]);

    const handleGenerateTazakkur = useCallback(async (deep = false) => {
        if (!analysisData || !verseData || verseData.length === 0) return;
        
        if (deep) {
            setIsGeneratingDeeperTazakkur(true);
        } else {
            setIsGeneratingTazakkur(true);
        }
        setError(null);

        try {
            const userProfile = { name: settings.name, gender: settings.gender, age: settings.age, roles: settings.roles, roleOther: settings.roleOther, country: settings.country };
            let tazakkurResult;
            const verseRangeStr = reflectionMode === 'single' ? startAyah : `${startAyah}-${endAyah}`;
            
            if (deep) {
                tazakkurResult = await generateDeeperTazakkur(analysisData, { name: settings.name, roles: settings.roles, gender: settings.gender, age: settings.age, country: settings.country }, verseData, verseRangeStr, lang);
            } else {
                tazakkurResult = await generatePersonalizedTazakkur(analysisData.tadabbur, userProfile, lang);
            }
            setTazakkurNote(tazakkurResult);
        } catch (err: any) {
             setError(err.message || t('errorUnknown'));
        } finally {
            setIsGeneratingTazakkur(false);
            setIsGeneratingDeeperTazakkur(false);
        }
    }, [analysisData, verseData, settings, lang, t, reflectionMode, startAyah, endAyah]);
    
    const handleExplainMisconception = async () => {
        if (!analysisData?.misconception || !verseData || verseData.length === 0) return;
        setIsExplainingMisconception(true);
        try {
            const explanation = await explainVerseMisconception(
                analysisData.misconception.text,
                verseData,
                { name: settings.name, country: settings.country, gender: settings.gender, age: settings.age },
                lang
            );
            
            setAnalysisData(prev => {
                if (!prev || !prev.misconception) return prev;
                return {
                    ...prev,
                    misconception: { ...prev.misconception, explanation }
                };
            });

        } catch (err: any) {
            setError(err.message || t('errorUnknown'));
        } finally {
            setIsExplainingMisconception(false);
        }
    };
    
    const handleShareExplanation = async (explanation?: string) => {
        if (!explanation) return;
         if (navigator.share) {
            try {
                await navigator.share({
                    title: t('shareExplanationTitle'),
                    text: explanation,
                });
            } catch (error) { console.error('Error sharing:', error); }
        } else {
            navigator.clipboard.writeText(explanation);
            alert(t('explanationCopied'));
        }
    };

    const handleExplanationFontSizeChange = useCallback((direction: 'inc' | 'dec') => {
        setExplanationFontSizeIndex(prev => {
            if (direction === 'inc') {
                return Math.min(prev + 1, explanationFontClasses.length - 1);
            }
            return Math.max(prev - 1, 0);
        });
    }, [explanationFontClasses.length]);

    const handleSave = (withNote: boolean) => {
        const verseKey = reflectionMode === 'single' ? `${surahNumber}:${startAyah}` : `${surahNumber}:${startAyah}-${endAyah}`;
        const isCompleted = settings.history.some(item => item.type === 'verse' && item.verseKey === verseKey);

        const historyData: Omit<VerseHistory, 'type' | 'date'> = {
            verseKey,
            rating,
            understood,
            misconception: includeMisconception && analysisData?.misconception ? analysisData.misconception : undefined,
            tazakkurNote: withNote ? tazakkurNote.trim() : undefined,
        };
        onHistoryUpdate(historyData);
        setReflectionStep('saved');
        if (!isCompleted) {
            setCongratsModalOpen(true);
        }
    };
    
    const handleCloseCongratsModal = () => {
        setCongratsModalOpen(false);
        verseSelectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
    const handleNextAyahFromCongrats = () => {
        setCongratsModalOpen(false);
        handleNavigate('next');
    };

    const handleHistoryItemClick = (verseKey: string) => {
      onPreloadConsumed(); 
      const [sNum, ayahPart] = verseKey.split(':');
      if (ayahPart.includes('-')) {
        const [startA, endA] = ayahPart.split('-');
        setReflectionMode('range');
        setSurahNumber(sNum);
        setStartAyah(startA);
        setEndAyah(endA);
      } else {
        setReflectionMode('single');
        setSurahNumber(sNum);
        setStartAyah(ayahPart);
        setEndAyah(ayahPart);
      }
      verseToReadRef.current = {s: '', a: ''}; // dummy to trigger
    };
    
    const handleShareTazakkur = async () => {
        if (!tazakkurNote) return;
        const verseKey = reflectionMode === 'single' ? `${surahNumber}:${startAyah}` : `${surahNumber}:${startAyah}-${endAyah}`;
        const shareText = `My Reflection on Quran ${SURAH_NAMES[parseInt(surahNumber) - 1]} ${verseKey}\n\n${tazakkurNote}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: t('shareReflectionTitle'),
                    text: shareText,
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            navigator.clipboard.writeText(shareText);
            alert(t('reflectionCopied'));
        }
    };
    
    const handleShareSegment = async (pillar: 'ta' | 'ti' | 'ts' | 'td', segment: TadabburSegment) => {
        const surahName = SURAH_NAMES[parseInt(surahNumber) - 1];
        const verseKey = reflectionMode === 'single' ? `${surahNumber}:${startAyah}` : `${surahNumber}:${startAyah}-${endAyah}`;

        const pillarIntroKey = `shareIntro${pillar.charAt(0).toUpperCase() + pillar.slice(1)}`;
        const pillarIntro = t(pillarIntroKey);
        
        const titleKey = `${pillar}Title`;
        const title = t(titleKey);

        const mainTitle = t('sharedInsightTitle', { verseKey: `${surahName} ${verseKey}` });

        const shareText = `*${mainTitle}*\n\n_${pillarIntro}_\n${segment.reflectionParagraph}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: t('shareSegmentTitle', { surahName, verseKey }),
                    text: shareText,
                });
            } catch (error) {
                console.error('Error sharing segment:', error);
            }
        } else {
            navigator.clipboard.writeText(shareText);
            alert(t('insightCopied', { title }));
        }
    };
    
    const handleShareInsight = async () => {
        if (!analysisData) return;
        const surahName = SURAH_NAMES[parseInt(surahNumber) - 1];
        const verseKey = reflectionMode === 'single' ? `${surahNumber}:${startAyah}` : `${surahNumber}:${startAyah}-${endAyah}`;


        const formatSegment = (title: string, segment: TadabburSegment) => {
            return `*${title}*\n${segment.reflectionParagraph}`;
        };

        let shareText = `*${t('sharedInsightTitle', { verseKey: `${surahName} ${verseKey}` })}*\n\n` +
            `${formatSegment(t('taTitle'), analysisData.tadabbur.ta)}\n\n` +
            `${formatSegment(t('tiTitle'), analysisData.tadabbur.ti)}\n\n` +
            `${formatSegment(t('tsTitle'), analysisData.tadabbur.ts)}`;

        if (analysisData.tadabbur.td) {
            shareText += `\n\n${formatSegment(t('tdTitle'), analysisData.tadabbur.td)}`;
        }


        if (navigator.share) {
            try {
                await navigator.share({
                    title: t('shareInsightTitle', { surahName, verseKey }),
                    text: shareText,
                });
            } catch (error) {
                console.error('Error sharing insight:', error);
            }
        } else {
            navigator.clipboard.writeText(shareText);
            alert(t('insightCopiedToClipboard'));
        }
    };

    const playNextInRange = useCallback(() => {
        if (!isRangePlaying || !verseData) {
            resetAudio();
            return;
        }
        const nextIndex = rangePlayIndex + 1;
        if (nextIndex < verseData.length) {
            if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
            transitionTimeoutRef.current = window.setTimeout(() => {
                setRangePlayIndex(nextIndex);
                playAudio(verseData[nextIndex].verseKey);
            }, 750);
        } else {
            resetAudio();
        }
    }, [isRangePlaying, rangePlayIndex, verseData, playAudio, resetAudio]);

    const handlePlayPauseRange = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !verseData || verseData.length === 0) return;

        if (isRangePlaying) {
            audio.pause();
            setIsRangePlaying(false);
            if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
        } else {
            setIsRangePlaying(true);
            const verseToPlay = verseData[rangePlayIndex];
            if (playingVerseKey === verseToPlay.verseKey && audio.paused) {
                audio.play().catch(() => resetAudio());
            } else {
                playAudio(verseToPlay.verseKey);
            }
        }
    }, [isRangePlaying, rangePlayIndex, verseData, playingVerseKey, playAudio, resetAudio]);

    const handlePlayPauseVerse = useCallback((verseKey: string) => {
        const audio = audioRef.current;
        if (!audio) return;
    
        if (isRangePlaying) {
            setIsRangePlaying(false);
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
                transitionTimeoutRef.current = null;
            }
        }

        if (playingVerseKey === verseKey) {
            if (audio.paused) {
                audio.play().catch(() => setAudioState('error'));
            } else {
                audio.pause();
            }
        } else {
            playAudio(verseKey);
        }
    }, [isRangePlaying, playingVerseKey, playAudio]);

    useEffect(() => {
        if (playingVerseKey) {
            const verseElement = verseRefs.current[playingVerseKey];
            if (verseElement) {
                setTimeout(() => {
                    verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    }, [playingVerseKey]);


    const ReflectionToggle = () => (
      <div className="flex items-center space-x-1 bg-gray-200 dark:bg-slate-800 p-1 rounded-lg">
          <button 
              onClick={() => setReflectionFormat('points')} 
              title={t('points')}
              className={`p-1.5 rounded-md transition-colors ${reflectionFormat === 'points' ? 'bg-purple-500 text-white' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-slate-700'}`}
          >
              <FiList size={18}/>
          </button>
          <button 
              onClick={() => setReflectionFormat('paragraph')} 
              title={t('paragraph')}
              className={`p-1.5 rounded-md transition-colors ${reflectionFormat === 'paragraph' ? 'bg-purple-500 text-white' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-slate-700'}`}
          >
              <FiAlignLeft size={18}/>
          </button>
      </div>
    );
    
    const AudioButton = () => {
        const icons = {
            idle: <FiVolume2 />,
            loading: <FiLoader className="animate-spin" />,
            playing: <FiPause />,
            paused: <FiVolume2 />,
            error: <FiAlertTriangle className="text-red-500" />,
        };
        const titles = {
            idle: t('playAudio'),
            loading: t('loadingAudio'),
            playing: t('pauseAudio'),
            paused: t('playAudio'),
            error: t('errorAudio'),
        };
        return (
             <button
                onClick={handlePlayPauseSingleAudio}
                title={titles[audioState]}
                disabled={audioState === 'loading' || reflectionMode === 'range'}
                className="flex items-center justify-center w-12 h-12 text-2xl text-sky-600 dark:text-sky-300 bg-white dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 border border-gray-200 dark:border-slate-600"
            >
                {icons[audioState]}
            </button>
        );
    };
    
    const handleToggleTadabburCard = (card: 'ta' | 'ti' | 'ts' | 'td') => {
        setOpenTadabburCard(prev => (prev === card ? null : card));
    };
    
    const fontSizeClasses = {
        arabic: { sm: 'text-2xl', base: 'text-3xl', lg: 'text-4xl', xl: 'text-5xl', '2xl': 'text-6xl' },
        translation: { sm: 'text-sm', base: 'text-base', lg: 'text-lg', xl: 'text-xl', '2xl': 'text-2xl' }
    };
    const arabicClass = fontSizeClasses.arabic[settings.arabicFontSize];
    const translationClass = fontSizeClasses.translation[settings.translationFontSize];

    return (
        <div className="min-h-screen p-4 md:p-8 flex flex-col space-y-6">
            <audio 
                ref={audioRef} 
                onPlay={() => setAudioState('playing')} 
                onPause={() => setAudioState('paused')} 
                onEnded={isRangePlaying ? playNextInRange : () => setAudioState('idle')} 
                onError={() => setAudioState('error')} 
                onWaiting={() => setAudioState('loading')}
                onCanPlay={() => {
                    setAudioState(audioRef.current?.paused ? 'paused' : 'playing');
                }}
            />
            <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-900 dark:text-white">
                My<span className="bg-gradient-to-r from-purple-500 to-sky-500 text-transparent bg-clip-text"><span className="logo-q">Q</span>uran</span>Journal
            </h1>
            <CongratsModal isOpen={isCongratsModalOpen} onClose={handleCloseCongratsModal} onNextAyah={handleNextAyahFromCongrats} userName={settings.name} />
            <InfoModal isOpen={isInfoModalOpen} onClose={() => setInfoModalOpen(false)} onOpenUpdateLog={onOpenUpdateLog} />
             {verseData && analysisData && (
                <PersonalHelperModal 
                    isOpen={isHelperModalOpen}
                    onClose={() => setIsHelperModalOpen(false)}
                    verseKey={reflectionMode === 'single' ? `${surahNumber}:${startAyah}` : `${surahNumber}:${startAyah}-${endAyah}`}
                    verseContent={verseData[0]}
                    tadabburAnalysis={analysisData}
                    settings={settings}
                />
             )}
            {selectedBookmarkVerseKey && (
                <BookmarkVerseModal
                    isOpen={isBookmarkModalOpen}
                    onClose={() => setIsBookmarkModalOpen(false)}
                    verseKey={selectedBookmarkVerseKey}
                    settings={settings}
                    onSave={onBookmarkUpdate}
                />
            )}
             <TafsirModal
                isOpen={isTafsirModalOpen}
                onClose={() => setIsTafsirModalOpen(false)}
                verseKey={selectedBookmarkVerseKey}
                language={lang}
                favoriteTafsir={settings.favoriteTafsir}
             />


            <header className="flex justify-between items-start gap-4">
                 <div className="flex items-center gap-3">
                    {settings.profilePic ? (
                      <img src={settings.profilePic} alt="Profile" className="w-12 h-12 rounded-full object-cover border-2 border-purple-400" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white shrink-0">
                        <FiUserIcon size={24} />
                      </div>
                    )}
                    <div className="text-left">
                        <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white leading-tight">{t('greeting')} {settings.name}</h1>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-x-2">
                            <span>{gregorianDate}</span>
                            <span>•</span>
                            <span>{hijriDate}</span>
                        </div>
                    </div>
                 </div>
                <div className="flex items-center gap-2 md:gap-4 shrink-0">
                    <button onClick={onOpenDisclaimerInfo} title={t('disclaimerInfoTitle')} className="text-gray-600 dark:text-white hover:text-yellow-500 dark:hover:text-yellow-300 transition-colors">
                        <FiAlertCircle size={24} />
                    </button>
                    <button onClick={() => setInfoModalOpen(true)} className="text-gray-600 dark:text-white hover:text-purple-500 dark:hover:text-purple-300 transition-colors">
                        <FiHelpCircle size={24} />
                    </button>
                    <button onClick={onSettingsClick} className="text-gray-600 dark:text-white hover:text-purple-500 dark:hover:text-purple-300 transition-colors">
                        <FiSettings size={24} />
                    </button>
                </div>
            </header>

            <main className="flex-grow space-y-6">
                <Dashboard 
                    settings={settings} 
                    onHistoryItemClick={handleHistoryItemClick} 
                    onViewAllClick={onNavigateToHistory}
                    onNavigateToFindGuidance={onNavigateToFindGuidance} 
                    onNavigateToPageInsight={onNavigateToPageInsight}
                    onCacheSummary={onCacheSummary}
                />

                <div ref={verseSelectionRef} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6 space-y-6">
                    <div className="flex justify-center bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button onClick={() => setReflectionMode('single')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${reflectionMode === 'single' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white' : 'text-gray-500'}`}>{t('singleVerse')}</button>
                        <button onClick={() => setReflectionMode('range')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${reflectionMode === 'range' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white' : 'text-gray-500'}`}>{t('verseRange')}</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="surah-select" className="block text-sm font-medium text-purple-800/90 dark:text-purple-300/90 mb-2">{t('surah')}</label>
                            <SearchableSelect 
                                options={surahOptions}
                                value={surahNumber}
                                onChange={handleSurahChange}
                                placeholder={t('searchSurah')}
                            />
                        </div>
                        {reflectionMode === 'single' ? (
                            <div className="relative">
                                <label htmlFor="ayah-input" className="block text-sm font-medium text-purple-800/90 dark:text-purple-300/90 mb-2">{t('ayah')}</label>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => handleNavigate('prev')} title={t('prevAyah')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors h-11 w-11 flex items-center justify-center disabled:opacity-50" disabled={(surahNumber === '1' && startAyah === '1')}><FiChevronLeft size={20}/></button>
                                    <input type="number" id="ayah-input" value={startAyah} onChange={(e) => handleAyahChange(e, 'start')} onBlur={(e) => handleAyahBlur(e, 'start')} min="1" max={maxAyah} className="w-full h-11 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg py-2.5 px-4 focus:ring-2 focus:ring-purple-400 focus:outline-none text-center" />
                                    <button onClick={() => handleNavigate('next')} title={t('nextAyah')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors h-11 w-11 flex items-center justify-center disabled:opacity-50" disabled={(surahNumber === '114' && startAyah === '6')}><FiChevronRight size={20}/></button>
                                </div>
                            </div>
                        ) : (
                             <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label htmlFor="start-ayah-input" className="block text-sm font-medium text-purple-800/90 dark:text-purple-300/90 mb-2">{t('from')}</label>
                                    <input type="number" id="start-ayah-input" value={startAyah} onChange={(e) => handleAyahChange(e, 'start')} onBlur={(e) => handleAyahBlur(e, 'start')} min="1" max={maxAyah} className="w-full h-11 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg py-2.5 px-4 focus:ring-2 focus:ring-purple-400 focus:outline-none text-center" />
                                </div>
                                <div>
                                    <label htmlFor="end-ayah-input" className="block text-sm font-medium text-purple-800/90 dark:text-purple-300/90 mb-2">{t('to')}</label>
                                    <input type="number" id="end-ayah-input" value={endAyah} onChange={(e) => handleAyahChange(e, 'end')} onBlur={(e) => handleAyahBlur(e, 'end')} min="1" max={maxAyah} className="w-full h-11 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg py-2.5 px-4 focus:ring-2 focus:ring-purple-400 focus:outline-none text-center" />
                                </div>
                            </div>
                        )}
                    </div>

                    {reflectionStep === 'initial' && !isLoading && (
                        <div className="text-center mt-2">
                            <button
                                onClick={handleReflect}
                                className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800/50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/30 transform hover:-translate-y-0.5"
                            >
                                {t('readVerse')}
                            </button>
                        </div>
                    )}
                    
                    {isLoading && !verseData && <Spinner text={t('spinnerReadingVerse')} />}

                    {error && (
                         <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg flex items-start gap-3 animate-fade-in">
                            <FiAlertTriangle className="shrink-0 mt-1" />
                            <div>
                                <h3 className="font-bold">{t('errorTitle')}</h3>
                                {error === 'errorBlockedRequest' ? (
                                    <div className="text-sm mt-1">
                                        <p>{t('errorBlockedRequest')}</p>
                                        <h4 className="font-semibold mt-3 mb-1">{t('fixBlockedRequestTitle')}</h4>
                                        <ul className="space-y-1 text-xs list-disc list-inside">
                                            <li dangerouslySetInnerHTML={{ __html: t('fixBlockedRequestStep1') }} />
                                            <li dangerouslySetInnerHTML={{ __html: t('fixBlockedRequestStep2') }} />
                                            <li dangerouslySetInnerHTML={{ __html: t('fixBlockedRequestStep3') }} />
                                        </ul>
                                    </div>
                                ) : (
                                    <p className="text-sm">{t(error) || error}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {verseData && (
                        <div ref={verseDisplayRef} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 animate-fade-in">
                            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                                    {t('verseTitle', { surah: surahNumber, ayah: reflectionMode === 'single' ? startAyah : `${startAyah}-${endAyah}` })}
                                </h2>
                                 <div className="flex items-center gap-2 flex-wrap">
                                    {isCurrentVerseCompleted && <FiCheckCircle className="text-green-500 h-6 w-6" title={t('reflectionSaved')} />}
                                    <span className="text-sm font-semibold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full flex items-center gap-1.5"><FiBookOpen size={12}/>{verseData[0].surahName}</span>
                                    <span className="text-xs font-semibold bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full">{t('juz')} {verseData[0].juzNumber}</span>
                                </div>
                            </div>
                            
                            <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-4">
                                {verseData.map(verse => (
                                    <div 
                                        key={verse.verseKey} 
                                        ref={(el) => { if (el) verseRefs.current[verse.verseKey] = el; }}
                                        className={`border-b border-gray-200 dark:border-slate-700 last:border-b-0 pb-4 transition-all duration-500 ease-in-out ${
                                            (isRangePlaying || (reflectionMode === 'range' && playingVerseKey)) && playingVerseKey && playingVerseKey !== verse.verseKey ? 'opacity-40 blur-sm' : 'opacity-100 blur-0'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                 {reflectionMode === 'range' && (
                                                    <button onClick={() => handlePlayPauseVerse(verse.verseKey)} className={`flex items-center justify-center w-7 h-7 rounded-full text-purple-600 dark:text-purple-300 transition-colors ${playingVerseKey === verse.verseKey ? 'bg-purple-200 dark:bg-purple-500/30' : 'bg-gray-200 dark:bg-slate-700'}`}>
                                                        {audioState === 'loading' && playingVerseKey === verse.verseKey ? <FiLoader className="animate-spin" /> : playingVerseKey === verse.verseKey && audioState === 'playing' ? <FiPause size={14}/> : <FiPlay size={14}/>}
                                                    </button>
                                                )}
                                                <span className="font-mono text-xs text-gray-500">{verse.verseKey}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => { setSelectedBookmarkVerseKey(verse.verseKey); setIsTafsirModalOpen(true); }} title={t('viewTafsir')}><FiBookOpen className="text-gray-400 hover:text-purple-500" /></button>
                                                <button onClick={() => { setSelectedBookmarkVerseKey(verse.verseKey); setIsBookmarkModalOpen(true); }} title={t('manageBookmarks')}><FiBookmark className={`transition-all ${settings.bookmarks[verse.verseKey] ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`} /></button>
                                            </div>
                                        </div>
                                        <p className={`arabic-text text-right leading-relaxed mb-4 ${arabicClass}`} dir="rtl">{verse.arabic}</p>
                                        <p className={`text-gray-600 dark:text-slate-400 italic ${translationClass}`}>"{verse.translation}"</p>
                                    </div>
                                ))}
                            </div>


                            {reflectionStep === 'verse_ready' && !isLoading && !analysisData && (
                                <div className="mt-6 text-center border-t border-gray-200 dark:border-slate-700 pt-6 space-y-4">
                                    <div className="bg-gray-100 dark:bg-slate-800/50 rounded-xl p-4 max-w-md mx-auto">
                                        <div className="flex items-stretch justify-center gap-3">
                                            {reflectionMode === 'single' ? <AudioButton /> : (
                                                <button
                                                    onClick={handlePlayPauseRange}
                                                    title={isRangePlaying ? t('pauseRangeAudio') : t('playRangeAudio')}
                                                    className="flex items-center justify-center w-12 h-12 text-2xl text-sky-600 dark:text-sky-300 bg-white dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-gray-200 dark:border-slate-600"
                                                >
                                                    {isRangePlaying ? <FiPause /> : <FiPlay />}
                                                </button>
                                            )}
                                            <button
                                                onClick={handleGenerateTadabbur}
                                                className="flex-grow bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-5 rounded-lg transition-colors flex items-center justify-center gap-2"
                                            >
                                                <FiChevronsRight />
                                                {t('generateTadabbur')}
                                            </button>
                                        </div>
                                        {reflectionMode === 'single' && <p className="text-xs text-gray-500 dark:text-slate-400 mt-3">{t('listenFirstPrompt')}</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {isLoading && verseData && (
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 animate-fade-in mt-6">
                            <Spinner text={t('spinnerGenerating')} />
                        </div>
                    )}

                    {analysisData && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">{t('tadabburAnalysisTitle')}</h2>
                                {reflectionMode === 'single' && (
                                    <button onClick={() => setIsHelperModalOpen(true)} className="flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/20 px-3 py-1.5 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-colors">
                                        <FiMessageCircle/> {t('askNoorButton')}
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <button onClick={handleShareInsight} title={t('shareInsight')} className="text-gray-600 dark:text-gray-300 hover:text-purple-500 dark:hover:text-purple-400 transition-colors p-2 rounded-full bg-gray-200 dark:bg-slate-800">
                                    <FiShare2 size={18}/>
                                </button>
                                <ReflectionToggle />
                            </div>

                            <div className={`grid grid-cols-1 md:grid-cols-2 ${analysisData.tadabbur.td ? 'xl:grid-cols-4' : 'lg:grid-cols-3'} gap-6 pt-2`}>
                                <TadabburCard icon={FiShield} title={t('taTitle')} description={t('taDescription')} segment={analysisData.tadabbur.ta} format={reflectionFormat} color="sky" onShare={() => handleShareSegment('ta', analysisData.tadabbur.ta)} isOpen={openTadabburCard === 'ta'} onToggle={() => handleToggleTadabburCard('ta')} />
                                <TadabburCard icon={FiUser} title={t('tiTitle')} description={t('tiDescription')} segment={analysisData.tadabbur.ti} format={reflectionFormat} color="green" onShare={() => handleShareSegment('ti', analysisData.tadabbur.ti)} isOpen={openTadabburCard === 'ti'} onToggle={() => handleToggleTadabburCard('ti')} />
                                <TadabburCard icon={FiCompass} title={t('tsTitle')} description={t('tsDescription')} segment={analysisData.tadabbur.ts} format={reflectionFormat} color="amber" onShare={() => handleShareSegment('ts', analysisData.tadabbur.ts)} isOpen={openTadabburCard === 'ts'} onToggle={() => handleToggleTadabburCard('ts')} />
                                {analysisData.tadabbur.td && (
                                     <TadabburCard 
                                        icon={FiSend} 
                                        title={t('tdTitle')} 
                                        description={t('tdDescription')} 
                                        segment={analysisData.tadabbur.td} 
                                        format={reflectionFormat} 
                                        color="purple"
                                        onShare={() => handleShareSegment('td', analysisData.tadabbur.td!)}
                                        isOpen={openTadabburCard === 'td'} 
                                        onToggle={() => handleToggleTadabburCard('td')}
                                     />
                                )}
                            </div>

                            {analysisData.relatedHadith && (
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-700">
                                    <h3 className="text-lg font-bold flex items-center gap-2 mb-3 text-gray-800 dark:text-slate-100"><FiBookOpen /> {t('relatedHadith')}</h3>
                                    <p className="arabic-text text-lg text-right leading-relaxed mb-2" dir="rtl">{analysisData.relatedHadith.text}</p>
                                    <p className="text-sm italic text-gray-600 dark:text-slate-400">"{analysisData.relatedHadith.translation}"</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-2 text-right">({analysisData.relatedHadith.source})</p>
                                </div>
                            )}

                            {analysisData.misconception && (
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-700">
                                    <h3 className="font-bold text-lg text-amber-700 dark:text-amber-300 mb-2">{t('societalMisconceptionsTitle')}</h3>
                                    <div className="text-sm text-gray-700 dark:text-slate-300 bg-amber-100/50 dark:bg-amber-900/20 p-2.5 rounded-md">
                                        <div className="flex items-start gap-2">
                                            <FiAlertCircle className="text-amber-500 mt-1 shrink-0"/>
                                            <p className="flex-1">{analysisData.misconception.text}</p>
                                        </div>
                                        {analysisData.misconception.explanation ? (
                                            <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-900/50">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('explanationByNoor')}</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">{t('adjustFontSize')}</span>
                                                        <button onClick={() => handleExplanationFontSizeChange('dec')} disabled={explanationFontSizeIndex === 0} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"><FiMinus size={14} /></button>
                                                        <button onClick={() => handleExplanationFontSizeChange('inc')} disabled={explanationFontSizeIndex === explanationFontClasses.length - 1} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"><FiPlus size={14} /></button>
                                                    </div>
                                                </div>
                                                <p className={`${explanationFontClasses[explanationFontSizeIndex]} italic whitespace-pre-line`}>
                                                    <VerseTooltip>{analysisData.misconception.explanation}</VerseTooltip>
                                                </p>
                                                <div className="flex justify-end items-center mt-2">
                                                    <button onClick={() => handleShareExplanation(analysisData.misconception?.explanation)} title={t('shareTazakkur')} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors p-1 rounded-full"><FiShare2 size={14}/></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-2 text-right">
                                                <button onClick={handleExplainMisconception} disabled={isExplainingMisconception} className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-200/50 dark:bg-amber-500/20 px-2 py-1 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors disabled:opacity-50">
                                                    {isExplainingMisconception ? <FiLoader className="animate-spin" /> : null}
                                                    {t('explainMoreButton')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {reflectionStep === 'tadabbur_ready' && (
                                 <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-700">
                                    <h3 className="text-lg font-bold flex items-center gap-2 mb-3 text-gray-800 dark:text-slate-100"><FiEdit /> {t('tazakkurJournalTitle')}</h3>
                                    <textarea
                                        ref={tazakkurTextareaRef}
                                        value={tazakkurNote}
                                        onChange={(e) => setTazakkurNote(e.target.value)}
                                        placeholder={t('tazakkurPlaceholder')}
                                        className="w-full h-auto min-h-[120px] bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-purple-400 focus:outline-none text-sm resize-none overflow-hidden"
                                    />
                                    <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleGenerateTazakkur(false)} disabled={isGeneratingTazakkur || isGeneratingDeeperTazakkur} className="flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/20 px-3 py-1.5 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-colors disabled:opacity-50">
                                                {isGeneratingTazakkur ? <FiLoader className="animate-spin" /> : <VscSparkle />}
                                                {t('adviseTazakkur')}
                                            </button>
                                            <button onClick={() => handleGenerateTazakkur(true)} disabled={isGeneratingTazakkur || isGeneratingDeeperTazakkur} className="flex items-center gap-2 text-sm font-semibold text-sky-600 dark:text-sky-300 bg-sky-100 dark:bg-sky-500/20 px-3 py-1.5 rounded-lg hover:bg-sky-200 dark:hover:bg-sky-500/30 transition-colors disabled:opacity-50">
                                                {isGeneratingDeeperTazakkur ? <FiLoader className="animate-spin" /> : <FiZap />}
                                                {t('goDeeperButton')}
                                            </button>
                                        </div>
                                        <button onClick={handleShareTazakkur} title={t('shareTazakkur')} className="text-gray-600 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors">
                                            <FiShare2/>
                                        </button>
                                    </div>
                                    <div className="mt-6 border-t border-gray-200 dark:border-slate-700 pt-4 space-y-3">
                                        {analysisData?.misconception && (
                                            <div className="flex items-center p-2 rounded-md bg-gray-100 dark:bg-slate-800">
                                                <input id="include-misconception-checkbox" type="checkbox" checked={includeMisconception} onChange={(e) => setIncludeMisconception(e.target.checked)} className="h-4 w-4 rounded border-gray-300 dark:border-slate-500 text-purple-600 focus:ring-purple-500 bg-white dark:bg-slate-700"/>
                                                <label htmlFor="include-misconception-checkbox" className="ml-2 block text-xs text-gray-700 dark:text-slate-300">{t('includeMindsetSection')}</label>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('rateTazakkur')}</label>
                                            <StarRating rating={rating} setRating={setRating} />
                                        </div>
                                        <div className="flex items-center">
                                            <input id="understood-checkbox" type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"/>
                                            <label htmlFor="understood-checkbox" className="ml-2 block text-sm text-gray-900 dark:text-slate-200">{t('iUnderstandWell')}</label>
                                        </div>
                                    </div>
                                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button onClick={() => handleSave(false)} className="w-full flex items-center justify-center gap-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-bold py-3 px-4 rounded-lg transition-colors">
                                            <FiCheckCircle /> {t('markAsReflected')}
                                        </button>
                                        <button onClick={() => handleSave(true)} disabled={!tazakkurNote.trim()} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800/50 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                                            <FiSave /> {t('saveJournalEntry')}
                                        </button>
                                    </div>
                                </div>
                            )}

                             {reflectionStep === 'saved' && (
                                <div className="text-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 animate-fade-in">
                                    <FiThumbsUp className="text-4xl text-green-500 mx-auto mb-2" />
                                    <h3 className="font-bold text-green-700 dark:text-green-300">{t('reflectionSaved')}</h3>
                                    {reflectionMode === 'single' && (
                                        <button onClick={() => handleNavigate('next')} className="mt-4 flex items-center justify-center gap-2 mx-auto bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                                            {t('nextAyahButton')} <FiChevronsRight />
                                        </button>
                                    )}
                                </div>
                             )}

                        </div>
                    )}
                </div>
            </main>
            <footer className="text-center text-xs text-gray-500 dark:text-gray-400 pt-4">
                <p>{t('footerLine1', { version: APP_VERSION })}</p>
                <p dangerouslySetInnerHTML={{ __html: t('footerLine2') }} />
            </footer>
        </div>
    );
}

export default Tadabbur;
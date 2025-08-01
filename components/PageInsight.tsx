


import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { UserSettings, PageInsight as PageInsightType, VerseContent, PageInsightAction, Misconception } from '../types';
import { FiArrowLeft, FiBookOpen, FiPlay, FiPause, FiLoader, FiAlertTriangle, FiSave, FiCheck, FiBookmark, FiChevronLeft, FiChevronRight, FiShare2, FiTag, FiHome, FiHash, FiZap, FiVolume2, FiInfo, FiAlertCircle } from 'react-icons/fi';
import { useI18n } from '../lib/i18n';
import { APP_VERSION, TOTAL_QURAN_PAGES, SURAH_NAMES } from '../constants';
import { getVersesForPage, getVerseAudioUrl, getVerseTafsir } from '../services/quranService';
import { generatePageSummaryAndActions, generateDeeperPageActions, explainMisconception } from '../services/geminiService';
import BookmarkVerseModal from './BookmarkVerseModal';
import TafsirModal from './TafsirModal';
import VerseTooltip from './VerseTooltip';

interface PageInsightProps {
  settings: UserSettings;
  onBack: () => void;
  onSave: (pageNumber: number, insight: PageInsightType) => void;
  onBookmarkUpdate: (updates: { bookmarks: UserSettings['bookmarks'], bookmarkCategories: UserSettings['bookmarkCategories'] }) => void;
  onUpdateSettings: (newSettings: UserSettings) => void; // For font size changes
}

const Spinner: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center space-y-2 text-sky-500 dark:text-sky-400 p-8">
        <FiLoader className="animate-spin text-4xl" />
        <p className="text-lg">{text}</p>
    </div>
);

export const PageInsight: React.FC<PageInsightProps> = ({ settings, onBack, onSave, onBookmarkUpdate }) => {
    const { t, lang } = useI18n();
    const [pageNumberInput, setPageNumberInput] = useState('1');
    const [currentPage, setCurrentPage] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pageVerses, setPageVerses] = useState<VerseContent[]>([]);
    const [pageInsight, setPageInsight] = useState<PageInsightType | null>(null);
    const [isInsightSaved, setIsInsightSaved] = useState(false);

    const [isLoadingDeeper, setIsLoadingDeeper] = useState(false);
    const [isLoadingExplanations, setIsLoadingExplanations] = useState<Record<number, boolean>>({});

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const verseRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const transitionTimeoutRef = useRef<number | null>(null);
    const [playingVerseKey, setPlayingVerseKey] = useState<string | null>(null);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    
    const [isPagePlaying, setIsPagePlaying] = useState(false);
    const [pagePlayIndex, setPagePlayIndex] = useState(0);

    const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
    const [isTafsirModalOpen, setIsTafsirModalOpen] = useState(false);
    const [selectedVerseKey, setSelectedVerseKey] = useState<string | null>(null);
    
    const [isJumpToPageOpen, setIsJumpToPageOpen] = useState(false);

    useEffect(() => {
        if (playingVerseKey) {
            const verseElement = verseRefs.current[playingVerseKey];
            if (verseElement) {
                // Wait a tiny bit for the blur transition to start, makes it feel smoother
                setTimeout(() => {
                    verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    }, [playingVerseKey]);

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
        setIsAudioLoading(false);
        setIsPagePlaying(false);
        setPagePlayIndex(0);
    }, []);

    const fetchPageData = useCallback(async (pageNum: number) => {
        setIsLoading(true);
        setError(null);
        setPageVerses([]);
        setPageInsight(null);
        setIsInsightSaved(false);
        resetAudio();

        try {
            const verses = await getVersesForPage(pageNum, lang);
            setPageVerses(verses);
            
            const firstVerseKey = verses[0]?.verseKey;
            let maarifTafsirContext = '';
            let tazkirulTafsirContext = '';

            if (firstVerseKey) {
                try {
                    const maarifResponse = await getVerseTafsir(firstVerseKey, 'en', 'Maarif Ul Quran');
                    maarifTafsirContext = maarifResponse.tafsirs[0]?.content || '';
                } catch (tafsirError) {
                    console.warn("Could not fetch Maarif Ul Quran tafsir:", tafsirError);
                }
                
                try {
                    const tazkirulResponse = await getVerseTafsir(firstVerseKey, 'en', 'Tazkirul Quran');
                    tazkirulTafsirContext = tazkirulResponse.tafsirs[0]?.content || '';
                } catch (tafsirError) {
                    console.warn("Could not fetch Tazkirul Quran tafsir:", tafsirError);
                }
            }

            const insight = await generatePageSummaryAndActions(
                pageNum, 
                verses, 
                maarifTafsirContext,
                tazkirulTafsirContext,
                { name: settings.name, roles: settings.roles, country: settings.country, gender: settings.gender, age: settings.age }, 
                lang
            );
            setPageInsight(insight);
        } catch (err: any) {
            setError(err.message || t('errorUnknown'));
        } finally {
            setIsLoading(false);
        }
    }, [lang, settings, t, resetAudio]);
    
    const handleExplorePage = (num: number) => {
        if (num >= 1 && num <= TOTAL_QURAN_PAGES) {
            setCurrentPage(num);
            setPageNumberInput(String(num));
            fetchPageData(num);
            setIsJumpToPageOpen(false);
        }
    };
    
    useEffect(() => {
        if (currentPage !== null) {
            const savedHistory = settings.history.find(item => item.type === 'page' && item.pageNumber === currentPage);
            setIsInsightSaved(!!savedHistory);
        }
    }, [currentPage, settings.history]);
    
    const { pageJuz, pageSurahs } = useMemo(() => {
        if (!pageVerses || pageVerses.length === 0) {
            return { pageJuz: null, pageSurahs: [] };
        }
        const juz = pageVerses[0].juzNumber;
        const surahNames = [...new Set(pageVerses.map(v => v.surahName))];
        return { pageJuz: juz, pageSurahs: surahNames };
    }, [pageVerses]);
    
    const playAudio = useCallback((verseKey: string) => {
        const audio = audioRef.current;
        if (!audio) return;
        
        setIsAudioLoading(true);
        setPlayingVerseKey(verseKey);
        audio.src = getVerseAudioUrl(verseKey, settings.reciter);
        audio.play().catch(() => {
            setError(t('errorAudio'));
            resetAudio();
        });
    }, [settings.reciter, t, resetAudio]);

    const playNextVerseInPage = useCallback(() => {
        if (!isPagePlaying || pageVerses.length === 0) {
            resetAudio();
            return;
        }

        const nextIndex = pagePlayIndex + 1;
        
        if (nextIndex < pageVerses.length) {
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
            }
            
            transitionTimeoutRef.current = window.setTimeout(() => {
                setPagePlayIndex(nextIndex);
                playAudio(pageVerses[nextIndex].verseKey);
            }, 750); // 750ms pause for a smooth transition
        } else {
            resetAudio(); // End of page
        }
    }, [isPagePlaying, pagePlayIndex, pageVerses, playAudio, resetAudio]);
    
    const handlePlayPauseVerse = useCallback((verseKey: string) => {
        const audio = audioRef.current;
        if (!audio) return;
        
        setIsPagePlaying(false); // Stop page playback if a single verse is selected
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
            transitionTimeoutRef.current = null;
        }

        if (playingVerseKey === verseKey) {
            audio.pause();
            setPlayingVerseKey(null);
        } else {
            playAudio(verseKey);
        }
    }, [playingVerseKey, playAudio]);
    
    const handlePlayPausePage = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || pageVerses.length === 0) return;

        if (isPagePlaying) {
            audio.pause();
            setIsPagePlaying(false);
            setPlayingVerseKey(null);
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
                transitionTimeoutRef.current = null;
            }
        } else {
            setIsPagePlaying(true);
            const verseToPlay = pageVerses[pagePlayIndex];
            if (playingVerseKey === verseToPlay.verseKey) {
                 audio.play().catch(() => {
                    setError(t('errorAudio'));
                    resetAudio();
                });
            } else {
                playAudio(verseToPlay.verseKey);
            }
        }
    }, [isPagePlaying, pagePlayIndex, pageVerses, playingVerseKey, playAudio, resetAudio, t]);
    
    const handleSave = () => {
        if (!pageInsight || currentPage === null) return;
        onSave(currentPage, pageInsight);
        setIsInsightSaved(true);
    };

    const handleGenerateDeeper = async () => {
        if (!pageInsight) return;
        setIsLoadingDeeper(true);
        try {
            const newActions = await generateDeeperPageActions(pageInsight, pageVerses, { name: settings.name, gender: settings.gender, age: settings.age }, lang);
            setPageInsight(prev => prev ? ({ ...prev, deeperActions: [...(prev.deeperActions || []), ...newActions] }) : null);
        } catch (err: any) {
            setError(err.message || t('errorUnknown'));
        } finally {
            setIsLoadingDeeper(false);
        }
    };
    
    const handleExplainMisconception = async (misconception: Misconception, index: number) => {
        if (!pageInsight) return;
        setIsLoadingExplanations(prev => ({ ...prev, [index]: true }));
        try {
            const explanation = await explainMisconception(
                misconception.text,
                pageVerses,
                { name: settings.name, country: settings.country, gender: settings.gender, age: settings.age },
                lang
            );
            setPageInsight(prev => {
                if (!prev) return null;
                const newMisconceptions = [...prev.misconceptions];
                newMisconceptions[index] = { ...newMisconceptions[index], explanation };
                return { ...prev, misconceptions: newMisconceptions };
            });
        } catch (err: any) {
            setError(err.message || t('errorUnknown'));
        } finally {
            setIsLoadingExplanations(prev => ({ ...prev, [index]: false }));
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

    const handleShare = async () => {
        if (!pageInsight || !currentPage) return;
        const shareText = `*${pageInsight.title} (${t('page')} ${currentPage})*\n\n*${t('keyThemesOfThePage')}:*\n${pageInsight.tags.join(', ')}\n\n*${t('actionableTazakkurTitle')}:*\n- ${pageInsight.actions.map(a => `${a.text} (${a.surahName} ${a.source})`).join('\n- ')}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: t('sharePageInsightTitle', { page: currentPage }),
                    text: shareText,
                });
            } catch (error) { console.error('Error sharing:', error); }
        } else {
            navigator.clipboard.writeText(shareText);
            alert(t('insightCopiedToClipboard'));
        }
    };

    const openBookmarkModal = (verseKey: string) => {
        setSelectedVerseKey(verseKey);
        setIsBookmarkModalOpen(true);
    };

    const openTafsirModal = (verseKey: string) => {
        setSelectedVerseKey(verseKey);
        setIsTafsirModalOpen(true);
    };

    const fontSizeClasses = {
        arabic: { sm: 'text-xl', base: 'text-2xl', lg: 'text-3xl', xl: 'text-4xl', '2xl': 'text-5xl' },
        translation: { sm: 'text-xs', base: 'text-sm', lg: 'text-base', xl: 'text-lg', '2xl': 'text-xl' }
    };
    const arabicClass = fontSizeClasses.arabic[settings.arabicFontSize];
    const translationClass = fontSizeClasses.translation[settings.translationFontSize];


    return (
        <div className="min-h-screen p-4 md:p-8 flex flex-col space-y-6 animate-fade-in overflow-x-hidden">
            <audio 
                ref={audioRef}
                onCanPlay={() => setIsAudioLoading(false)}
                onEnded={playNextVerseInPage}
                onError={() => { setError(t('errorAudio')); resetAudio(); }}
            />
            {isBookmarkModalOpen && selectedVerseKey && (
                <BookmarkVerseModal isOpen={isBookmarkModalOpen} onClose={() => setIsBookmarkModalOpen(false)} verseKey={selectedVerseKey} settings={settings} onSave={onBookmarkUpdate} />
            )}
            {isTafsirModalOpen && selectedVerseKey && (
                <TafsirModal isOpen={isTafsirModalOpen} onClose={() => setIsTafsirModalOpen(false)} verseKey={selectedVerseKey} language={lang} favoriteTafsir={settings.favoriteTafsir} />
            )}
            
            <header className="flex items-center gap-4">
                 {currentPage && (
                    <button onClick={onBack} className="text-gray-600 dark:text-slate-200 hover:text-purple-500 dark:hover:text-purple-400 transition-colors p-2 rounded-full bg-white dark:bg-slate-800">
                        <FiArrowLeft size={24} />
                    </button>
                 )}
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My<span className="bg-gradient-to-r from-purple-500 to-sky-500 text-transparent bg-clip-text"><span className="logo-q">Q</span>uran</span>Journal</h1>
            </header>
            
            <main className="flex-grow space-y-6 pb-20">
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6">
                    {!currentPage ? (
                        <div className="text-center py-10 animate-fade-in">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{t('pageInsightTitle')}</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">{t('pageSelectionPrompt')}</p>
                            <div className="max-w-sm mx-auto space-y-4">
                                <input type="number" value={pageNumberInput} onChange={(e) => setPageNumberInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleExplorePage(parseInt(pageNumberInput))} className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg py-3 px-4 text-center font-bold text-lg focus:ring-2 focus:ring-purple-400 focus:outline-none" />
                                <button onClick={() => handleExplorePage(parseInt(pageNumberInput))} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg transition-colors">{t('pageSelectionButton')}</button>
                            </div>
                        </div>
                    ) : isLoading ? (
                        <Spinner text={t('loadingPageInsight')} />
                    ) : error ? (
                        <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg flex items-start gap-3">
                            <FiAlertTriangle className="shrink-0 mt-1" />
                            <p className="text-sm">{t(error) || error}</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center flex-wrap gap-2">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">{pageInsight?.title}</h2>
                                <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
                                    {pageSurahs.map(name => <span key={name} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{name}</span>)}
                                    {pageJuz && <span className="bg-sky-100 text-sky-700 px-2 py-1 rounded-full">{t('juz')} {pageJuz}</span>}
                                    {currentPage && <span className="bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded-full">{t('page')} {currentPage}</span>}
                                </div>
                            </div>
                            
                             <div className="flex items-center justify-center">
                                <button onClick={handlePlayPausePage} className="flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/20 px-4 py-2 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-colors">
                                    {isPagePlaying ? <FiPause /> : <FiVolume2 />}
                                    {isPagePlaying ? t('pausePageAudio') : t('playPageAudio')}
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[50vh] overflow-y-auto p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                                {pageVerses.map((verse, index) => (
                                    <div
                                        key={verse.verseKey}
                                        ref={(el) => { if(el) verseRefs.current[verse.verseKey] = el; }}
                                        className={`border-b border-gray-200 dark:border-slate-800/50 last:border-b-0 pb-3 mb-3 transition-all duration-500 ease-in-out ${
                                            playingVerseKey && playingVerseKey !== verse.verseKey ? 'opacity-40 blur-sm' : 'opacity-100 blur-0'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handlePlayPauseVerse(verse.verseKey)} className={`flex items-center justify-center w-7 h-7 rounded-full text-purple-600 dark:text-purple-300 transition-colors ${playingVerseKey === verse.verseKey ? 'bg-purple-200 dark:bg-purple-500/30' : 'bg-gray-200 dark:bg-slate-700'}`}>
                                                    {isAudioLoading && playingVerseKey === verse.verseKey ? <FiLoader className="animate-spin" /> : playingVerseKey === verse.verseKey ? <FiPause size={14}/> : <FiPlay size={14}/>}
                                                </button>
                                                <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{verse.verseKey}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => openBookmarkModal(verse.verseKey)} title={t('bookmarkThisVerse')} className="p-1 text-gray-400 hover:text-yellow-400"><FiBookmark className={`transition-all ${settings.bookmarks[verse.verseKey] ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} /></button>
                                                <button onClick={() => openTafsirModal(verse.verseKey)} title={t('viewVerseTafsir')} className="p-1 text-gray-400 hover:text-purple-500"><FiBookOpen /></button>
                                            </div>
                                        </div>
                                        <p className={`arabic-text text-right leading-relaxed mb-1 ${arabicClass}`} dir="rtl">{verse.arabic}</p>
                                        <p className={`text-gray-600 dark:text-slate-400 italic ${translationClass}`}>"{verse.translation}"</p>
                                    </div>
                                ))}
                            </div>
                            
                            {pageInsight && (
                                <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-slate-700">
                                    
                                    <div>
                                        <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-1">{t('pageContinuityTitle')}</h4>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800/50 p-3 rounded-md">
                                           <p><strong className="text-green-600 dark:text-green-400">{t('pageContinuityPrev')}:</strong> <VerseTooltip>{pageInsight.continuity.prev}</VerseTooltip></p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                         <h3 className="font-bold text-lg text-purple-700 dark:text-purple-300">{t('pageSummaryTitle')}</h3>
                                         <button onClick={handleShare} className="text-gray-500 hover:text-purple-500 dark:text-gray-400 dark:hover:text-purple-300 transition-colors p-2 rounded-full -mr-2 -mt-2"><FiShare2/></button>
                                    </div>
                                    <p className="text-sm italic text-gray-600 dark:text-gray-400 whitespace-pre-line"><VerseTooltip>{pageInsight.summary}</VerseTooltip></p>
                                    
                                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800/50 p-3 rounded-md">
                                       <p><strong className="text-sky-600 dark:text-sky-400">{t('pageContinuityNext')}:</strong> <VerseTooltip>{pageInsight.continuity.next}</VerseTooltip></p>
                                    </div>

                                    <div>
                                      <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">{t('keyThemesOfThePage')}</h4>
                                      <div className="flex flex-wrap gap-2">
                                          {pageInsight.tags.map(tag => (
                                              <span key={tag} className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300"><FiTag size={12}/>{tag}</span>
                                          ))}
                                      </div>
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-lg text-purple-700 dark:text-purple-300 mb-2 mt-4">{t('actionableTazakkurTitle')}</h3>
                                        <ul className="space-y-2">
                                            {pageInsight.actions.map((action, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 p-2.5 rounded-md">
                                                    <FiCheck className="text-green-500 mt-1 shrink-0"/>
                                                    <div>
                                                        <span><VerseTooltip>{action.text}</VerseTooltip></span>
                                                        <span className="block text-xs text-purple-500 dark:text-purple-400 font-mono mt-1">({action.surahName} {action.source})</span>
                                                    </div>
                                                </li>
                                            ))}
                                            {pageInsight.deeperActions?.map((action, i) => (
                                                <li key={`deeper-${i}`} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300 bg-sky-100/50 dark:bg-sky-900/30 p-2.5 rounded-md">
                                                    <FiZap className="text-sky-500 mt-1 shrink-0"/>
                                                    <div>
                                                        <span><VerseTooltip>{action.text}</VerseTooltip></span>
                                                        <span className="block text-xs text-purple-500 dark:text-purple-400 font-mono mt-1">({action.surahName} {action.source})</span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-3">
                                            <button onClick={handleGenerateDeeper} disabled={isLoadingDeeper} className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-sky-600 dark:text-sky-300 bg-sky-100 dark:bg-sky-500/20 px-3 py-2 rounded-lg hover:bg-sky-200 dark:hover:bg-sky-500/30 transition-colors disabled:opacity-50">
                                                {isLoadingDeeper ? <FiLoader className="animate-spin" /> : <FiZap />}
                                                {isLoadingDeeper ? t('generatingDeeperActions') : t('reflectDeeper')}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h3 className="font-bold text-lg text-amber-700 dark:text-amber-300 mb-2 mt-4">{t('societalMisconceptionsTitle')}</h3>
                                        <ul className="space-y-2">
                                            {pageInsight.misconceptions.map((misconception, i) => (
                                                <li key={i} className="text-sm text-gray-700 dark:text-slate-300 bg-amber-100/50 dark:bg-amber-900/20 p-2.5 rounded-md">
                                                    <div className="flex items-start gap-2">
                                                        <FiAlertCircle className="text-amber-500 mt-1 shrink-0"/>
                                                        <p className="flex-1">{misconception.text}</p>
                                                    </div>
                                                    {misconception.explanation ? (
                                                        <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-900/50">
                                                            <p className="text-xs italic whitespace-pre-line">
                                                                <VerseTooltip>{misconception.explanation}</VerseTooltip>
                                                            </p>
                                                            <div className="text-right mt-2">
                                                                <button onClick={() => handleShareExplanation(misconception.explanation)} title={t('shareTazakkur')} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors p-1 rounded-full"><FiShare2 size={14}/></button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-2 text-right">
                                                            <button
                                                                onClick={() => handleExplainMisconception(misconception, i)}
                                                                disabled={isLoadingExplanations[i]}
                                                                className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-200/50 dark:bg-amber-500/20 px-2 py-1 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                                                            >
                                                                {isLoadingExplanations[i] && <FiLoader className="animate-spin" />}
                                                                {t('explainMoreButton')}
                                                            </button>
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    { !isInsightSaved ? (
                                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <button onClick={handleSave} className="w-full flex items-center justify-center gap-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-bold py-3 px-4 rounded-lg transition-colors">
                                                <FiCheck /> {t('markPageAsReflected')}
                                            </button>
                                            <button onClick={handleSave} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                                                <FiSave /> {t('savePageInsight')}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="mt-6 text-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 animate-fade-in">
                                            <FiCheck className="text-4xl text-green-500 mx-auto mb-2" />
                                            <h3 className="font-bold text-green-700 dark:text-green-300">{t('insightSaved')}</h3>
                                            <button onClick={() => currentPage && handleExplorePage(currentPage + 1)} disabled={!currentPage || currentPage >= TOTAL_QURAN_PAGES} className="mt-4 flex items-center justify-center gap-2 mx-auto bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                                                {t('nextPage')} <FiChevronRight />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
            
            {currentPage && !isLoading && (
                 <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-slate-700 p-2 z-40">
                    <div className="max-w-xl mx-auto flex items-center justify-between gap-1">
                        <button onClick={onBack} title={t('backToMain')} className="flex flex-col items-center justify-center h-14 w-16 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors"><FiHome size={20}/><span className="text-xs">{t('backToMain')}</span></button>
                        <button onClick={() => handleExplorePage(currentPage - 1)} disabled={currentPage <= 1} className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-semibold bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 disabled:opacity-50"><FiChevronLeft/><span>{currentPage-1}</span></button>
                        <div className="flex flex-col items-center">
                            <span className="text-2xl font-bold text-purple-600 dark:text-purple-300">{currentPage}</span>
                            <span className="text-xs text-gray-500">{t('currentPage')}</span>
                        </div>
                        <button onClick={() => handleExplorePage(currentPage + 1)} disabled={currentPage >= TOTAL_QURAN_PAGES} className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-semibold bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 disabled:opacity-50"><span>{currentPage+1}</span><FiChevronRight/></button>
                        <button onClick={() => setIsJumpToPageOpen(true)} title={t('jumpToPage')} className="flex flex-col items-center justify-center h-14 w-16 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors"><FiHash size={20}/><span className="text-xs">{t('jumpToPage')}</span></button>
                    </div>
                 </footer>
            )}
            {isJumpToPageOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsJumpToPageOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg" onClick={e => e.stopPropagation()}>
                        <p className="text-sm font-semibold mb-2">{t('pageSelectionPrompt')}</p>
                        <div className="flex items-center gap-2">
                             <input type="number" value={pageNumberInput} onChange={(e) => setPageNumberInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleExplorePage(parseInt(pageNumberInput))} className="w-full bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg py-2 px-3 text-center font-bold focus:ring-2 focus:ring-purple-400 focus:outline-none" autoFocus />
                             <button onClick={() => handleExplorePage(parseInt(pageNumberInput))} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">{t('go')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
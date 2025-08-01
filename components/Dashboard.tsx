import React, { useMemo, useState, useEffect } from 'react';
import { SURAH_NAMES, TOTAL_QURAN_VERSES, TOTAL_QURAN_PAGES } from '../constants';
import { FiTrendingUp, FiCalendar, FiChevronsRight, FiZap, FiBookmark, FiSearch, FiLoader, FiChevronDown, FiBook } from 'react-icons/fi';
import { UserSettings, HistoryItem, VerseHistory, PageHistory } from '../types';
import { summarizeTazakkur } from '../services/geminiService';
import { useI18n } from '../lib/i18n';
import VerseModal from './VerseModal';


interface DashboardProps {
    settings: UserSettings;
    onHistoryItemClick: (verseKey: string) => void;
    onViewAllClick: () => void;
    onNavigateToFindGuidance: () => void;
    onNavigateToPageInsight: () => void;
    onCacheSummary: (verseKey: string, summary: string) => void;
}

const PointsStat: React.FC<{ label: string; value: number; }> = ({ label, value }) => (
    <div className="flex flex-col items-center justify-center bg-gray-200/50 dark:bg-slate-800 p-3 rounded-lg text-center">
        <span className="text-lg md:text-xl font-bold text-yellow-600">{value}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    </div>
);


export const Dashboard: React.FC<DashboardProps> = ({ settings, onHistoryItemClick, onViewAllClick, onNavigateToFindGuidance, onNavigateToPageInsight, onCacheSummary }) => {
    const { history, points, bookmarks, bookmarkCategories } = settings;
    const { t, lang } = useI18n();
    
    const [summary, setSummary] = useState('');
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isVerseModalOpen, setIsVerseModalOpen] = useState(false);
    const [selectedVerseKey, setSelectedVerseKey] = useState<string | null>(null);
    const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);

    const handleVerseClick = (verseKey: string) => {
        setSelectedVerseKey(verseKey);
        setIsVerseModalOpen(true);
    };

    const dailyTazakkur = useMemo(() => {
        const savedReflections = history.filter((item): item is VerseHistory => item.type === 'verse' && !!item.tazakkurNote);
        if (savedReflections.length === 0) return null;
        // Simple pseudo-random based on day of the year
        const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        const randomIndex = dayOfYear % savedReflections.length;
        return savedReflections[randomIndex];
    }, [history]);
    
    const progressStats = useMemo(() => {
        const completedVerses = history.filter(item => item.type === 'verse').length;
        const verseProgress = (completedVerses / TOTAL_QURAN_VERSES) * 100;

        const completedPagesSet = new Set(history.filter((item): item is PageHistory => item.type === 'page').map(item => item.pageNumber));
        const completedPages = completedPagesSet.size;
        const pageProgress = (completedPages / TOTAL_QURAN_PAGES) * 100;

        return {
            completedVerses,
            verseProgress,
            completedPages,
            pageProgress
        };
    }, [history]);

    useEffect(() => {
        if (dailyTazakkur) {
            if (dailyTazakkur.tazakkurSummary) {
                setSummary(dailyTazakkur.tazakkurSummary);
                setIsSummarizing(false);
            } else if (dailyTazakkur.tazakkurNote) {
                setIsSummarizing(true);
                summarizeTazakkur(dailyTazakkur.tazakkurNote)
                    .then(newSummary => {
                        setSummary(newSummary);
                        onCacheSummary(dailyTazakkur.verseKey, newSummary);
                    })
                    .catch(err => {
                        console.error(err);
                        setSummary(dailyTazakkur.tazakkurNote.substring(0, 150) + '...'); // Fallback
                    })
                    .finally(() => {
                        setIsSummarizing(false);
                    });
            }
        }
    }, [dailyTazakkur, onCacheSummary]);
    
    const pointsSummary = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const dayOfWeek = now.getDay(); // Sunday - 0, Monday - 1
        const firstDayOfWeek = new Date(today);
        // Adjust to Monday
        firstDayOfWeek.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));

        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let todayCount = 0;
        let yesterdayCount = 0;
        let weekCount = 0;
        let monthCount = 0;

        history.forEach(item => {
            const itemDate = new Date(item.date);
            const itemDateWithoutTime = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
            const pointsToAdd = item.type === 'page' ? 25 : 10;

            if (itemDateWithoutTime.getTime() === today.getTime()) {
                todayCount += pointsToAdd;
            }
            if (itemDateWithoutTime.getTime() === yesterday.getTime()) {
                yesterdayCount += pointsToAdd;
            }
            if (itemDateWithoutTime >= firstDayOfWeek) {
                weekCount += pointsToAdd;
            }
            if (itemDateWithoutTime >= firstDayOfMonth) {
                monthCount += pointsToAdd;
            }
        });
        
        return { 
            today: todayCount, 
            yesterday: yesterdayCount, 
            week: weekCount, 
            month: monthCount
        };
    }, [history]);


    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('ms-MY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    
    const allBookmarkedVerses = useMemo(() => {
        return Object.entries(bookmarks)
            .map(([verseKey, data]) => ({ verseKey, ...data }))
            .sort((a, b) => {
                if (a.pinned !== b.pinned) {
                    return a.pinned ? -1 : 1;
                }
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
    }, [bookmarks]);

    const getCategoriesForVerse = (verseKey: string) => {
        return bookmarkCategories.filter(cat => cat.verseKeys.includes(verseKey));
    };


    return (
        <div className="space-y-6">
             <VerseModal 
                isOpen={isVerseModalOpen} 
                onClose={() => setIsVerseModalOpen(false)} 
                verseKey={selectedVerseKey} 
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div 
                    className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6 cursor-pointer hover:border-purple-300 dark:hover:border-purple-600 transition-all group"
                    onClick={onNavigateToFindGuidance}
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-100 dark:bg-purple-500/20 p-3 rounded-full">
                            <FiSearch className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-800 dark:text-slate-100">{t('findGuidanceTitle')}</h2>
                            <p className="text-sm text-gray-600 dark:text-slate-400">{t('findGuidanceCardDescription')}</p>
                        </div>
                        <FiChevronsRight className="ml-auto text-gray-400 dark:text-slate-500 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
                 <div 
                    className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6 cursor-pointer hover:border-sky-300 dark:hover:border-sky-600 transition-all group"
                    onClick={onNavigateToPageInsight}
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-sky-100 dark:bg-sky-500/20 p-3 rounded-full">
                            <FiBook className="h-6 w-6 text-sky-600 dark:text-sky-300" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-800 dark:text-slate-100">{t('exploreByPageTitle')}</h2>
                            <p className="text-sm text-gray-600 dark:text-slate-400">{t('exploreByPageDescription')}</p>
                        </div>
                        <FiChevronsRight className="ml-auto text-gray-400 dark:text-slate-500 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </div>

             <div className="dark:bg-gradient-to-tr dark:from-purple-600 dark:to-blue-600 bg-gradient-to-tr from-purple-500 to-blue-500 text-white rounded-2xl shadow-lg p-6 animate-fade-in">
                 <h2 className="flex items-center text-lg font-bold mb-3 text-white">
                     <FiZap className="mr-2" />
                     {t('dailyTazakkur')}
                 </h2>
                 {dailyTazakkur ? (
                    <>
                         <blockquote className="border-l-4 border-purple-300/50 pl-4 min-h-[40px] flex items-center">
                            {isSummarizing ? (
                                <p className="text-sm italic text-white/70 animate-pulse">{t('generatingSummary')}</p>
                            ) : (
                                <p className="text-sm italic text-white/90">"{summary}"</p>
                            )}
                         </blockquote>
                         <div className="text-right mt-3">
                             <button onClick={() => handleVerseClick(dailyTazakkur.verseKey)} className="text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors">
                                {SURAH_NAMES[parseInt(dailyTazakkur.verseKey.split(':')[0]) - 1]} {dailyTazakkur.verseKey}
                             </button>
                         </div>
                    </>
                 ) : (
                    <div className="text-center py-2">
                        <p className="text-sm text-white/80">{t('dailyTazakkurEmpty')}</p>
                    </div>
                 )}
             </div>
        
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 md:gap-0">
                        <h2 className="flex items-center text-lg font-bold text-gray-800 dark:text-slate-100">
                            <FiTrendingUp className="mr-2 text-purple-500" />
                            {t('myProgress')}
                        </h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs text-gray-600 dark:text-slate-400 mb-1">
                                <span>{t('versesCompleted', { count: progressStats.completedVerses, total: TOTAL_QURAN_VERSES })}</span>
                                <span className="font-semibold text-purple-500">{progressStats.verseProgress.toFixed(2)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                                <div className="bg-purple-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progressStats.verseProgress}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-gray-600 dark:text-slate-400 mb-1">
                                <span>{t('pagesCompleted', { count: progressStats.completedPages, total: TOTAL_QURAN_PAGES })}</span>
                                <span className="font-semibold text-sky-500">{progressStats.pageProgress.toFixed(2)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                                <div className="bg-sky-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progressStats.pageProgress}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 border-t border-gray-200 dark:border-slate-700 pt-4">
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <PointsStat label={t('points')} value={points || 0} />
                            <PointsStat label={t('pointsToday')} value={pointsSummary.today} />
                            <PointsStat label={t('pointsYesterday')} value={pointsSummary.yesterday} />
                            <PointsStat label={t('pointsThisMonth')} value={pointsSummary.month} />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="flex items-center text-lg font-bold text-gray-800 dark:text-slate-100">
                            <FiBookmark className="mr-2 text-yellow-500" />
                            {t('myBookmarks')}
                        </h2>
                        <button onClick={() => setIsBookmarksOpen(!isBookmarksOpen)} className="text-gray-500 hover:text-purple-500">
                            <FiChevronDown className={`transition-transform duration-300 ${isBookmarksOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isBookmarksOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
                        {allBookmarkedVerses.length > 0 ? (
                            <div className="space-y-3">
                                {allBookmarkedVerses.map(({ verseKey, note, pinned, createdAt }) => (
                                    <button 
                                        key={verseKey} 
                                        onClick={() => handleVerseClick(verseKey)} 
                                        className="w-full text-left p-3 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-purple-600 dark:text-purple-400 text-sm">
                                                {SURAH_NAMES[parseInt(verseKey.split(':')[0]) - 1]} {verseKey}
                                            </p>
                                            {pinned && <FiBookmark className="text-yellow-400 fill-yellow-400 text-xs" />}
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-slate-400 italic mt-1 truncate">
                                            {note || t('noNoteAdded')}
                                        </p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {getCategoriesForVerse(verseKey).map(cat => (
                                                <span key={cat.id} style={{ backgroundColor: cat.color }} className="text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{cat.name}</span>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                                {t('noBookmarks')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

             <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6">
                 <div className="flex justify-between items-center mb-2">
                     <h2 className="flex items-center text-lg font-bold text-gray-800 dark:text-slate-100">
                         <FiCalendar className="mr-2 text-green-500" />
                         {t('historyHeader')}
                     </h2>
                     <button onClick={onViewAllClick} className="flex items-center gap-1 text-sm font-semibold text-purple-600 hover:text-purple-500 dark:text-purple-300 dark:hover:text-purple-200 transition-colors">
                         {t('viewAll')} <FiChevronsRight />
                     </button>
                 </div>
                 <div className="space-y-2">
                    {history.length > 0 ? history.slice(0, 3).map((item) => {
                        const verseKey = item.type === 'verse' ? item.verseKey : `${item.pageNumber}`;
                        const title = item.type === 'verse' 
                            ? `${SURAH_NAMES[parseInt(item.verseKey.split(':')[0]) - 1]} ${item.verseKey}`
                            : item.title || `${t('pageInsightTitle')} ${item.pageNumber}`;
                        return (
                            <button key={`${item.type}-${verseKey}-${item.date}`} onClick={() => item.type === 'verse' && onHistoryItemClick(item.verseKey)} className="w-full text-left p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-gray-700 dark:text-slate-300 text-sm truncate">{title}</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 shrink-0 ml-2">{formatDate(item.date)}</p>
                                </div>
                            </button>
                        )
                    }) : <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">{t('noHistoryFound')}</p>}
                 </div>
            </div>
        </div>
    );
}
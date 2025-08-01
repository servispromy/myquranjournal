import React, { useState, useMemo } from 'react';
import { UserSettings, HistoryItem } from '../types';
import { SURAH_NAMES, APP_VERSION } from '../constants';
import { FiArrowLeft, FiSearch, FiCalendar, FiBookOpen, FiStar, FiCheckCircle, FiCheck, FiZap, FiAlertCircle, FiChevronDown, FiTrash2 } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { useI18n } from '../lib/i18n';

interface HistoryPageProps {
  settings: UserSettings;
  onBack: () => void;
  onDeleteHistoryItem: (item: HistoryItem) => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ settings, onBack, onDeleteHistoryItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { t, lang } = useI18n();
  const [openItemDate, setOpenItemDate] = useState<string | null>(null);


  const filteredHistory = useMemo(() => {
    if (!searchTerm.trim()) {
      return settings.history;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return settings.history.filter(item => {
      if (item.type === 'verse') {
        const surahName = SURAH_NAMES[parseInt(item.verseKey.split(':')[0]) - 1] || '';
        const misconceptionText = item.misconception ? `${item.misconception.text} ${item.misconception.explanation || ''}` : '';
        return (
          item.verseKey.includes(lowercasedFilter) ||
          surahName.toLowerCase().includes(lowercasedFilter) ||
          (item.tazakkurNote && item.tazakkurNote.toLowerCase().includes(lowercasedFilter)) ||
          misconceptionText.toLowerCase().includes(lowercasedFilter)
        );
      }
      if (item.type === 'page') {
          const actionText = [...item.actions, ...(item.deeperActions || [])].map(a => a.text).join(' ');
          const misconceptionsText = (item.misconceptions || []).map(m => `${m.text} ${m.explanation || ''}`).join(' ');
          return (
              `page ${item.pageNumber}`.includes(lowercasedFilter) ||
              (item.title && item.title.toLowerCase().includes(lowercasedFilter)) ||
              item.summary.toLowerCase().includes(lowercasedFilter) ||
              actionText.toLowerCase().includes(lowercasedFilter) ||
              misconceptionsText.toLowerCase().includes(lowercasedFilter)
          );
      }
      return false;
    });
  }, [searchTerm, settings.history]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  
  const handleDelete = (item: HistoryItem) => {
    if (window.confirm(t('deleteReflectionConfirm'))) {
        onDeleteHistoryItem(item);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col space-y-6 animate-fade-in">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="text-gray-600 dark:text-slate-200 hover:text-purple-500 dark:hover:text-purple-400 transition-colors p-2 rounded-full bg-white dark:bg-slate-800">
          <FiArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('fullHistoryTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300">{t('historyEntries', { count: settings.history.length })}</p>
        </div>
      </header>

      <main className="flex-grow space-y-6">
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={t('searchHistory')}
            className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg py-3 pl-12 pr-4 focus:ring-2 focus:ring-purple-400 focus:outline-none"
          />
        </div>

        <div className="space-y-4">
          {filteredHistory.length > 0 ? (
            filteredHistory.slice().reverse().map((item) => {
              const isOpen = openItemDate === item.date;
              if (item.type === 'verse') {
                const [surah, ayah] = item.verseKey.split(':');
                const surahName = SURAH_NAMES[parseInt(surah) - 1] || 'Unknown';
                return (
                  <div key={item.date} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                    <button onClick={() => setOpenItemDate(isOpen ? null : item.date)} className="w-full flex justify-between items-center text-left">
                       <h3 className="font-bold text-purple-600 dark:text-purple-400">{surahName} {item.verseKey}</h3>
                       <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                            <FiCalendar size={12}/>
                            {formatDate(item.date)}
                          </span>
                          <FiChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                       </div>
                    </button>
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100 mt-3 pt-3 border-t border-gray-200 dark:border-slate-700' : 'max-h-0 opacity-0'}`}>
                        {item.tazakkurNote && (
                            <div className="prose prose-sm prose-ul:list-[circle] max-w-none text-gray-700 dark:text-slate-300">
                              <ReactMarkdown>{item.tazakkurNote}</ReactMarkdown>
                            </div>
                        )}
                        {item.misconception?.text && (
                             <div className="mt-3 pt-3 border-t border-dashed border-gray-300 dark:border-slate-600">
                                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-amber-600 dark:text-amber-400 mb-2">
                                    <FiAlertCircle size={12} />
                                    {t('societalMisconceptionsTitle')}
                                </h4>
                                <div className="text-sm text-gray-700 dark:text-slate-300 bg-amber-100/50 dark:bg-amber-800/20 p-3 rounded-md">
                                    <p>{item.misconception.text}</p>
                                    {item.misconception.explanation && (
                                        <p className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-900 text-xs italic">{item.misconception.explanation}</p>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <FiStar key={i} className={`text-sm ${i < (item.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-slate-600'}`} />
                                    ))}
                                </div>
                                {item.understood && (
                                    <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                                        <FiCheckCircle />
                                        <span>{t('iUnderstandWell')}</span>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => handleDelete(item)} title={t('deleteReflection')} className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-100/50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 px-2 py-1 rounded-md transition-colors">
                               <FiTrash2 size={12} /> {t('deleteReflection')}
                            </button>
                        </div>
                    </div>
                  </div>
                );
              } else if (item.type === 'page') {
                  return (
                    <div key={item.date} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                        <button onClick={() => setOpenItemDate(isOpen ? null : item.date)} className="w-full flex justify-between items-center text-left">
                            <h3 className="font-bold text-sky-600 dark:text-sky-400">{item.title || `${t('pageInsightTitle')} ${item.pageNumber}`}</h3>
                             <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                                    <FiCalendar size={12}/>
                                    {formatDate(item.date)}
                                </span>
                                <FiChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                            </div>
                        </button>
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100 mt-3 pt-3 border-t border-gray-200 dark:border-slate-700' : 'max-h-0 opacity-0'}`}>
                            <p className="text-sm italic text-gray-600 dark:text-gray-400 my-2">"{item.summary}"</p>
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                                <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">{t('actionableTazakkurTitle')}</h4>
                                <ul className="space-y-2">
                                    {item.actions.map((action, actionIndex) => (
                                        <li key={actionIndex} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 p-2 rounded-md">
                                            <FiCheck className="text-green-500 mt-1 shrink-0"/>
                                            <div>
                                              <span>{action.text}</span>
                                              <span className="block text-xs text-purple-500 dark:text-purple-400 font-mono mt-1">({action.surahName} {action.source})</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {item.deeperActions && item.deeperActions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-dashed border-gray-300 dark:border-slate-600">
                                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-sky-600 dark:text-sky-400 mb-2">
                                        <FiZap size={12} />
                                        {t('deeperTazakkurTitle')}
                                    </h4>
                                    <ul className="space-y-2">
                                        {item.deeperActions.map((action, actionIndex) => (
                                            <li key={actionIndex} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300 bg-sky-100/50 dark:bg-sky-800/20 p-2 rounded-md">
                                                <FiCheck className="text-green-500 mt-1 shrink-0"/>
                                                <div>
                                                    <span>{action.text}</span>
                                                    <span className="block text-xs text-purple-500 dark:text-purple-400 font-mono mt-1">({action.surahName} {action.source})</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {item.misconceptions && item.misconceptions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-dashed border-gray-300 dark:border-slate-600">
                                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-amber-600 dark:text-amber-400 mb-2">
                                        <FiAlertCircle size={12} />
                                        {t('societalMisconceptionsTitle')}
                                    </h4>
                                    <ul className="space-y-2">
                                        {item.misconceptions.map((misconception, i) => (
                                            <li key={i} className="text-sm text-gray-700 dark:text-slate-300 bg-amber-100/50 dark:bg-amber-800/20 p-3 rounded-md">
                                                <p>{misconception.text}</p>
                                                {misconception.explanation && (
                                                    <p className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-900 text-xs italic">{misconception.explanation}</p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                             <div className="flex items-center justify-end gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                                <button onClick={() => handleDelete(item)} title={t('deleteReflection')} className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-100/50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 px-2 py-1 rounded-md transition-colors">
                                   <FiTrash2 size={12} /> {t('deleteReflection')}
                                </button>
                            </div>
                        </div>
                    </div>
                  )
              }
              return null;
            })
          ) : (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <FiBookOpen size={48} className="mx-auto mb-4" />
              <p>{t('noHistoryFound')}</p>
              {searchTerm && <p className="text-sm">{t('tryDifferentSearch')}</p>}
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
};

export default HistoryPage;
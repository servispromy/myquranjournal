

import React, { useState } from 'react';
import { UserSettings, VerseSuggestion } from '../types';
import { suggestVersesForIssue } from '../services/geminiService';
import { FiArrowLeft, FiSearch, FiLoader, FiAlertTriangle } from 'react-icons/fi';
import { useI18n } from '../lib/i18n';
import { APP_VERSION } from '../constants';

interface FindGuidancePageProps {
  settings: UserSettings;
  onBack: () => void;
  onVerseSelect: (verseKey: string) => void;
}

const FindGuidancePage: React.FC<FindGuidancePageProps> = ({ settings, onBack, onVerseSelect }) => {
  const { t } = useI18n();
  const [issueText, setIssueText] = useState('');
  const [isFindingGuidance, setIsFindingGuidance] = useState(false);
  const [guidanceError, setGuidanceError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<VerseSuggestion[]>([]);

  const handleFindGuidance = async () => {
    if (!issueText.trim()) return;
    
    setIsFindingGuidance(true);
    setGuidanceError(null);
    setSuggestions([]);
    try {
      const result = await suggestVersesForIssue(issueText);
      setSuggestions(result);
    } catch (err: any) {
      setGuidanceError(err.message || t('findGuidanceNoResults'));
    } finally {
      setIsFindingGuidance(false);
    }
  };
  
  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col space-y-6 animate-fade-in">
        <header className="flex items-center gap-4">
            <button onClick={onBack} className="text-gray-600 dark:text-slate-200 hover:text-purple-500 dark:hover:text-purple-400 transition-colors p-2 rounded-full bg-white dark:bg-slate-800">
                <FiArrowLeft size={24} />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('findGuidancePageTitle')}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-300">{t('findGuidancePageIntro')}</p>
            </div>
        </header>

        <main className="flex-grow space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6 space-y-4">
                <textarea
                    value={issueText}
                    onChange={e => setIssueText(e.target.value)}
                    placeholder={t('findGuidancePlaceholder')}
                    className="w-full h-28 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-purple-400 focus:outline-none text-sm"
                />
                <button
                    onClick={handleFindGuidance}
                    disabled={!issueText.trim() || isFindingGuidance}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
                >
                    {isFindingGuidance ? <FiLoader className="animate-spin" /> : <FiSearch />}
                    {isFindingGuidance ? t('findGuidanceLoading') : t('findGuidanceButton')}
                </button>
                {guidanceError && (
                     <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg flex items-start gap-3 animate-fade-in">
                        <FiAlertTriangle className="shrink-0 mt-1" />
                        <div>
                            <h3 className="font-bold">{t('errorTitle')}</h3>
                            {guidanceError === 'errorBlockedRequest' ? (
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
                                <p className="text-sm">{t(guidanceError) || guidanceError}</p>
                            )}
                        </div>
                    </div>
                )}
                {suggestions.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">{t('findGuidanceResultsTitle')}</h3>
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                onClick={() => onVerseSelect(suggestion.verseKey)}
                                className="w-full text-left bg-gray-200/50 dark:bg-slate-800/50 hover:bg-gray-300 dark:hover:bg-slate-700 p-3 rounded-lg transition-colors"
                            >
                                <p className="font-bold text-purple-600 dark:text-purple-400">{suggestion.surahName} {suggestion.verseKey}</p>
                                <p className="text-xs italic text-gray-600 dark:text-slate-400">"{suggestion.reason}"</p>
                            </button>
                        ))}
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

export default FindGuidancePage;

import React, { useState } from 'react';
import InfoModal from './InfoModal';
import { FiInfo } from 'react-icons/fi';
import { useI18n } from '../lib/i18n';
import { UserSettings } from '../types';

interface WelcomeProps {
    onStart: (name: string) => void;
    onOpenUpdateLog: () => void;
    isExiting: boolean;
    language: UserSettings['language'];
    onLanguageChange: (lang: UserSettings['language']) => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onStart, onOpenUpdateLog, isExiting, language, onLanguageChange }) => {
    const [name, setName] = useState('');
    const [isInfoModalOpen, setInfoModalOpen] = useState(false);
    const { t } = useI18n();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onStart(name.trim());
        }
    };

    return (
        <>
            <InfoModal isOpen={isInfoModalOpen} onClose={() => setInfoModalOpen(false)} onOpenUpdateLog={onOpenUpdateLog} />

            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <div className={`w-full max-w-md bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700/50 rounded-2xl shadow-2xl p-8 text-gray-800 dark:text-slate-50 ${isExiting ? 'animate-modal-exit' : 'animate-modal-enter'}`}>
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold tracking-tight text-gray-800 dark:text-slate-50">
                            My<span className="bg-gradient-to-r from-purple-500 to-sky-500 text-transparent bg-clip-text"><span className="logo-q">Q</span>uran</span>Journal
                        </h1>
                         <p className="text-sky-600 dark:text-sky-200/80 mt-2">{t('appTagline')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-purple-700 dark:text-purple-200/90 mb-2">
                                {t('enterNamePrompt')}
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-50 rounded-lg py-2 px-4 focus:ring-2 focus:ring-purple-400 focus:outline-none transition duration-300 placeholder:text-gray-400"
                                placeholder={t('namePlaceholder')}
                                required
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-purple-700 dark:text-purple-200/90">
                                {t('languageLabel')}
                            </label>
                            <div className="flex justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => onLanguageChange('en')}
                                    className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors border-2 ${language === 'en' ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-transparent hover:border-purple-300'}`}
                                >
                                    English
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onLanguageChange('ms')}
                                    className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors border-2 ${language === 'ms' ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-transparent hover:border-purple-300'}`}
                                >
                                    Bahasa Melayu
                                </button>
                            </div>
                        </div>


                        <button
                            type="submit"
                            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/30 transform hover:-translate-y-0.5"
                            disabled={!name.trim()}
                        >
                            {t('startJourneyButton')}
                        </button>
                    </form>
                </div>
                <footer className="text-center text-white/50 mt-8">
                     <button 
                        onClick={() => setInfoModalOpen(true)}
                        className="flex items-center mx-auto space-x-2 text-sm hover:text-white transition-colors"
                    >
                        <FiInfo />
                        <span>{t('learnMoreLink')}</span>
                    </button>
                </footer>
            </div>
        </>
    );
};

export default Welcome;
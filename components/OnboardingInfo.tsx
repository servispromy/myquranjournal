
import React, { useState } from 'react';
import { useI18n } from '../lib/i18n';
import { UserSettings } from '../types';
import { FiCheck, FiBookOpen, FiZap } from 'react-icons/fi';

interface OnboardingInfoProps {
    onComplete: () => void;
    settings: UserSettings;
}

const OnboardingInfo: React.FC<OnboardingInfoProps> = ({ onComplete, settings }) => {
    const [isChecked, setIsChecked] = useState(false);
    const { t } = useI18n();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-100 via-sky-100 to-purple-100 dark:from-black dark:via-sky-900/50 dark:to-purple-900/50">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/20 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col text-gray-800 dark:text-white">
                <header className="text-center mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-800 dark:text-white">
                        {t('onboardingTitle', { name: settings.name })}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm md:text-base">{t('onboardingIntro')}</p>
                </header>

                <main className="flex-grow space-y-6 overflow-y-auto max-h-[50vh] pr-2">
                     <section>
                        <h3 className="flex items-center text-lg font-semibold text-sky-700 dark:text-sky-200 mb-3"><FiZap className="mr-2" /> {t('onboardingPrinciplesTitle')}</h3>
                        <ul className="space-y-4 text-sm">
                            <li className="flex items-start gap-3">
                                <FiCheck className="text-green-500 mt-1 shrink-0" />
                                <span dangerouslySetInnerHTML={{ __html: t('onboardingPrinciple1') }}></span>
                            </li>
                             <li className="flex items-start gap-3">
                                <FiCheck className="text-green-500 mt-1 shrink-0" />
                                <span dangerouslySetInnerHTML={{ __html: t('onboardingPrinciple2') }}></span>
                            </li>
                             <li className="flex items-start gap-3">
                                <FiCheck className="text-green-500 mt-1 shrink-0" />
                                <span dangerouslySetInnerHTML={{ __html: t('onboardingPrinciple3') }}></span>
                            </li>
                        </ul>
                    </section>
                    <section>
                        <h3 className="flex items-center text-lg font-semibold text-sky-700 dark:text-sky-200 mb-3"><FiBookOpen className="mr-2" /> {t('tafsirGuideTitle')}</h3>
                        <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: t('tafsirGuideBody') }} />
                    </section>
                </main>

                <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10">
                     <div className="flex items-center">
                        <input
                            id="accept-checkbox"
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setIsChecked(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                        <label htmlFor="accept-checkbox" className="ml-3 block text-sm text-gray-900 dark:text-gray-300 cursor-pointer">
                            {t('onboardingCheckbox')}
                        </label>
                    </div>
                    <button
                        onClick={onComplete}
                        disabled={!isChecked}
                        className="w-full mt-4 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/30 transform hover:-translate-y-0.5"
                    >
                        {t('onboardingButton')}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default OnboardingInfo;
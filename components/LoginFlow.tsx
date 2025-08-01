
import React, { useState } from 'react';
import Welcome from './Welcome';
import { useI18n } from '../lib/i18n';
import { UserSettings } from '../types';

interface LoginFlowProps {
    isReturningUser: boolean;
    onEnter: () => void;
    onLogin: (name: string) => void;
    onOpenUpdateLog: () => void;
    provisionalLanguage: UserSettings['language'];
    onProvisionalLanguageChange: (lang: UserSettings['language']) => void;
}

const LoginFlow: React.FC<LoginFlowProps> = ({ isReturningUser, onEnter, onLogin, onOpenUpdateLog, provisionalLanguage, onProvisionalLanguageChange }) => {
    const { t } = useI18n();
    const [isEntering, setIsEntering] = useState(false);
    const [isExitingWelcome, setIsExitingWelcome] = useState(false);

    const handleStartJourney = (name: string) => {
        setIsExitingWelcome(true);
        setTimeout(() => {
            onLogin(name);
        }, 300); // match animation duration
    };

    const handleButtonClick = () => {
        if (isReturningUser) {
            onEnter();
        } else {
            setIsEntering(true);
        }
    };

    return (
        <div 
            className="fixed inset-0 animated-gradient-bg transition-all duration-700 ease-in-out"
        >
            <div className="floating-light x1"></div>
            <div className="floating-light x2"></div>
            <div className="floating-light x3"></div>
            <div className="floating-light x4"></div>
            <div className="floating-light x5"></div>
            <div className="floating-light x6"></div>
            <div className="floating-light x7"></div>
            <div className="floating-light x8"></div>
            <div className="floating-light x9"></div>
            <div 
                className={`absolute inset-0 transition-all duration-700 ease-in-out ${isEntering ? 'backdrop-blur-md bg-black/30' : 'backdrop-blur-none bg-black/0'}`}
            >
                {!isEntering && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in p-4">
                        <div className="text-center">
                            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-2">
                                My<span className="bg-gradient-to-r from-purple-500 to-sky-500 text-transparent bg-clip-text"><span className="logo-q">Q</span>uran</span>Journal
                            </h1>
                            <p className="text-sky-200/80 text-lg mb-8">{t('appTagline')}</p>
                            <button
                                onClick={handleButtonClick}
                                className="bg-transparent border-2 border-white hover:bg-white/10 text-white font-normal py-3 px-8 rounded-full transition-all duration-300 transform hover:-translate-y-0.5 text-lg"
                            >
                                {t('startJourneyButton')}
                            </button>
                        </div>
                    </div>
                )}
                {isEntering && (
                    <Welcome 
                        onStart={handleStartJourney} 
                        onOpenUpdateLog={onOpenUpdateLog} 
                        isExiting={isExitingWelcome}
                        language={provisionalLanguage}
                        onLanguageChange={onProvisionalLanguageChange}
                    />
                )}
            </div>
        </div>
    );
};

export default LoginFlow;

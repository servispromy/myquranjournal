

import React, { useState } from 'react';
import { FiX, FiAward, FiChevronsRight } from 'react-icons/fi';
import { VscSparkle } from 'react-icons/vsc';
import { useI18n } from '../lib/i18n';

interface CongratsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNextAyah: () => void;
  userName: string;
}

const CongratsModal: React.FC<CongratsModalProps> = ({ isOpen, onClose, onNextAyah, userName }) => {
  const [isClosing, setIsClosing] = useState(false);
  const { t } = useI18n();

  if (!isOpen) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const handleNext = () => {
    setIsClosing(true);
    setTimeout(() => {
      onNextAyah();
      setIsClosing(false);
    }, 300);
  };

  const quotes = [
    t('quote1'),
    t('quote2'),
    t('quote3'),
    t('quote4'),
  ];
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={handleClose}
    >
      <div
        className={`relative bg-gradient-to-br from-purple-50 to-sky-50 dark:from-gray-800 dark:to-sky-900 border border-purple-200 dark:border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-sm text-center p-8 overflow-hidden ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute -top-10 -left-10 text-purple-200/30 dark:text-purple-400/10 animate-pulse">
            <VscSparkle size={120} />
        </div>
        <div className="absolute -bottom-12 -right-12 text-sky-200/30 dark:text-sky-400/10 animate-pulse delay-500">
            <VscSparkle size={150} />
        </div>

        <button onClick={handleClose} className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-full p-1 z-10">
          <FiX size={24} />
        </button>
        
        <div className="relative z-0">
          <FiAward className="text-6xl text-yellow-500 dark:text-yellow-400 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('congratsTitle', { name: userName })}</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{t('congratsSubtitle')}</p>
          <blockquote className="border-l-2 border-purple-300 dark:border-purple-500 pl-3">
              <p className="text-sm italic text-gray-500 dark:text-gray-400">"{randomQuote}"</p>
          </blockquote>
          <div className="mt-8 space-y-3">
            <button 
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/30 transform hover:-translate-y-0.5"
            >
              <span>{t('nextAyahButton')}</span>
              <FiChevronsRight />
            </button>
             <button 
              onClick={handleClose}
              className="w-full text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors py-2"
            >
              {t('anotherVerseButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CongratsModal;
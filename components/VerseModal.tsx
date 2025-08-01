
import React, { useState, useEffect } from 'react';
import { FiX, FiLoader, FiAlertTriangle } from 'react-icons/fi';
import { getVerseContent } from '../services/quranService';
import { VerseContent } from '../types';
import { useI18n } from '../lib/i18n';
import { SURAH_NAMES } from '../constants';

interface VerseModalProps {
  isOpen: boolean;
  onClose: () => void;
  verseKey: string | null;
  language: 'en' | 'ms';
}

const VerseModal: React.FC<VerseModalProps> = ({ isOpen, onClose, verseKey, language }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verseData, setVerseData] = useState<VerseContent | null>(null);
  const { t } = useI18n();
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const fetchVerse = async () => {
      if (verseKey) {
        setIsLoading(true);
        setError(null);
        setVerseData(null);
        try {
          const [sNum, aNum] = verseKey.split(':');
          const verseResult = await getVerseContent(parseInt(sNum), parseInt(aNum), language);
          setVerseData(verseResult);
        } catch (err: any) {
          setError(err.message || t('errorUnknown'));
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (isOpen) {
      fetchVerse();
    }
  }, [isOpen, verseKey, language, t]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  if (!isOpen) return null;
  
  const [surahNum, ayahNum] = verseKey?.split(':') || ['', ''];
  const surahName = SURAH_NAMES[parseInt(surahNum) - 1] || '';

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 shrink-0">
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-sky-500 dark:from-purple-300 dark:to-sky-300 text-transparent bg-clip-text">
            {surahName} {surahNum}:{ayahNum}
          </h2>
          <button onClick={handleClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-full p-1">
            <FiX size={24} />
          </button>
        </header>
        <main className="p-6 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center space-y-2 text-sky-500 dark:text-sky-300 min-h-[200px]">
              <FiLoader className="animate-spin text-4xl" />
              <p className="text-lg">{t('spinnerGenerating')}</p>
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 p-4 rounded-lg flex items-start gap-3">
              <FiAlertTriangle className="shrink-0 mt-1" />
              <p>{t(error) || error}</p>
            </div>
          )}
          {verseData && (
            <div className="space-y-4">
              <p className="arabic-text text-3xl md:text-4xl text-right leading-loose mb-4" dir="rtl">{verseData.arabic}</p>
              <p className="text-gray-600 dark:text-gray-300 italic text-lg">"{verseData.translation}"</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default VerseModal;

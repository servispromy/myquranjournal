
import React, { useState, useEffect } from 'react';
import { FiX, FiLoader, FiAlertTriangle, FiBookOpen } from 'react-icons/fi';
import { getVerseTafsir } from '../services/quranService';
import { useI18n } from '../lib/i18n';
import { SURAH_NAMES } from '../constants';
import { TafsirApiResponse } from '../types';
import ReactMarkdown from 'react-markdown';

interface TafsirModalProps {
  isOpen: boolean;
  onClose: () => void;
  verseKey: string | null;
  language: 'en' | 'ms';
  favoriteTafsir: string;
}

const TafsirModal: React.FC<TafsirModalProps> = ({ isOpen, onClose, verseKey, language, favoriteTafsir }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tafsirData, setTafsirData] = useState<TafsirApiResponse | null>(null);
  const { t } = useI18n();
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const fetchTafsir = async () => {
      if (verseKey) {
        setIsLoading(true);
        setError(null);
        setTafsirData(null);
        try {
          const tafsirResult = await getVerseTafsir(verseKey, language, favoriteTafsir);
          setTafsirData(tafsirResult);
        } catch (err: any) {
          setError(err.message || t('errorTafsir'));
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (isOpen) {
      fetchTafsir();
    }
  }, [isOpen, verseKey, t, language, favoriteTafsir]);

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
  
  const activeTafsir = tafsirData?.tafsirs?.[0];

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
          <h2 className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-green-500 to-sky-500 dark:from-green-300 dark:to-sky-300 text-transparent bg-clip-text">
            <FiBookOpen /> {t('tafsirModalTitle')} ({surahName} {surahNum}:{ayahNum})
          </h2>
          <button onClick={handleClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-full p-1">
            <FiX size={24} />
          </button>
        </header>
        <main className="p-6 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center space-y-2 text-sky-500 dark:text-sky-300 min-h-[200px]">
              <FiLoader className="animate-spin text-4xl" />
              <p className="text-lg">{t('loadingTafsir')}</p>
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 p-4 rounded-lg flex items-start gap-3">
              <FiAlertTriangle className="shrink-0 mt-1" />
              <p>{t(error) || error}</p>
            </div>
          )}
          {activeTafsir && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold mb-2 text-purple-700 dark:text-purple-300">{activeTafsir.author}</h3>
              {activeTafsir.groupVerse && (
                  <p className="text-xs italic text-gray-500 dark:text-gray-400 mb-3 bg-gray-100 dark:bg-white/5 p-2 rounded-md">{activeTafsir.groupVerse}</p>
              )}
              <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                  <ReactMarkdown>{activeTafsir.content}</ReactMarkdown>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default TafsirModal;
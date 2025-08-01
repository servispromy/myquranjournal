
import React, { useState } from 'react';
import { FiX, FiAlertCircle } from 'react-icons/fi';
import { useI18n } from '../lib/i18n';

interface DisclaimerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DisclaimerInfoModal: React.FC<DisclaimerInfoModalProps> = ({ isOpen, onClose }) => {
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

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in"
      onClick={handleClose}
    >
      <div
        className={`bg-yellow-50 dark:bg-gray-800 border border-yellow-200 dark:border-yellow-500/30 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-yellow-200 dark:border-white/10 shrink-0">
          <h2 className="flex items-center gap-2 text-xl font-bold text-yellow-700 dark:text-yellow-300">
              <FiAlertCircle />
              {t('disclaimerInfoTitle')}
          </h2>
          <button onClick={handleClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-full p-1">
            <FiX size={24} />
          </button>
        </header>

        <main className="p-6 overflow-y-auto space-y-4 text-yellow-800 dark:text-yellow-200/90">
            <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: t('disclaimerInfoBody1') }} />
            <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: t('disclaimerInfoBody2') }} />
            <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: t('disclaimerInfoBody3') }} />
            <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: t('disclaimerInfoBody4') }} />
        </main>
         <footer className="p-4 bg-yellow-100/50 dark:bg-slate-800/50 border-t border-yellow-200 dark:border-white/10">
            <button
                onClick={handleClose}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
                {t('iUnderstandButton')}
            </button>
        </footer>
      </div>
    </div>
  );
};

export default DisclaimerInfoModal;

import React, { useState } from 'react';
import { FiX, FiGift } from 'react-icons/fi';
import { useI18n } from '../lib/i18n';
import { APP_VERSION } from '../constants';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose }) => {
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
  
  const latestUpdateChanges = [
      t('updateLogV2_2_7_c1'),
      t('updateLogV2_2_7_c2'),
      t('updateLogV2_2_7_c3'),
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in" onClick={handleClose}>
      <div className={`bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`} onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-white">
            <FiGift className="text-purple-500" />
            {t('whatsNewModalTitle', { version: APP_VERSION })}
          </h2>
          <button onClick={handleClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-full p-1">
            <FiX size={24} />
          </button>
        </header>
        <main className="p-6 overflow-y-auto space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('updateLogV2_2_7_date')}</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
            {latestUpdateChanges.map((change, index) => <li key={index}>{change}</li>)}
          </ul>
        </main>
        <footer className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-white/10">
            <button onClick={handleClose} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                {t('whatsNewModalClose')}
            </button>
        </footer>
      </div>
    </div>
  );
};

export default WhatsNewModal;
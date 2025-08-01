import React, { useState } from 'react';
import { FiX, FiHeart, FiExternalLink } from 'react-icons/fi';
import { useI18n } from '../lib/i18n';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const [isClosing, setIsClosing] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
        onClose();
        setIsClosing(false);
    }, 300);
  };
  
  const STRIPE_LINK = "https://buy.stripe.com/4gM28q54E9sva9X9Z10Ny0a";
  const FOUNDATION_WEBSITE = "https://www.attibyan.org.my";

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
        onClick={handleClose}
      >
        <div 
          className={`bg-white dark:bg-gray-900 border border-pink-200 dark:border-pink-500/30 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
          onClick={e => e.stopPropagation()}
        >
          <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 shrink-0">
            <h2 className="flex items-center gap-2 text-xl font-bold text-pink-600 dark:text-pink-300">
                <FiHeart />
                {t('supportModalTitle')}
            </h2>
            <button onClick={handleClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-full p-1">
              <FiX size={24} />
            </button>
          </header>

          <main className="p-6 overflow-y-auto space-y-4 text-gray-600 dark:text-gray-300 text-center">
            <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: t('supportModalBody1') }} />
            <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: t('supportModalBody2') }} />
            <div className="bg-purple-500/10 dark:bg-purple-500/20 p-4 rounded-lg my-4">
                <p className="text-base font-semibold text-purple-700 dark:text-purple-200" dangerouslySetInnerHTML={{ __html: t('supportModalBody3') }} />
            </div>
            
          </main>
          <footer className="p-4 space-y-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-white/10">
            <a 
                href={STRIPE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-pink-500/30 transform hover:-translate-y-0.5"
            >
                {t('supportButtonContribute')}
                <FiExternalLink />
            </a>
            <a 
                href={FOUNDATION_WEBSITE}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full block text-center text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors py-2"
            >
              {t('supportButtonWebsite')}
            </a>
          </footer>
        </div>
      </div>
    </>
  );
};

export default SupportModal;

import React, { useState } from 'react';
import { FiX, FiShield, FiUser, FiCompass, FiAward, FiBookOpen, FiZap, FiEdit, FiHelpCircle, FiMessageCircle } from 'react-icons/fi';
import { APP_VERSION } from '../constants';
import { useI18n } from '../lib/i18n';
import { TadabburLevel } from '../types';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpdateLog: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, onOpenUpdateLog }) => {
  const { t, lang } = useI18n();
  const [isClosing, setIsClosing] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
        onClose();
        setIsClosing(false);
    }, 300);
  };

  const levelGroups = {
    easyGroup: ['L1', 'L2'],
    intermediateGroup: ['L3', 'L4'],
    highGroup: ['L5', 'L6', 'L7'],
    comprehensiveGroup: ['L8'],
  };

  const TazakkurPillar: React.FC<{ title: string; text: string; q: string; }> = ({ title, text, q }) => (
    <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-lg">
      <h5 className="font-bold text-gray-800 dark:text-white">{title}</h5>
      <p className="text-xs text-gray-500 dark:text-gray-400">{text}</p>
      <p className="text-xs italic text-purple-600 dark:text-purple-300 mt-1">"{q}"</p>
    </div>
  );

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
        onClick={handleClose}
      >
        <div 
          className={`bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
          onClick={e => e.stopPropagation()}
        >
          <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 shrink-0">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">My<span className="bg-gradient-to-r from-purple-500 to-sky-500 text-transparent bg-clip-text"><span className="logo-q">Q</span>uran</span>Journal</h2>
            <button onClick={handleClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-full p-1">
              <FiX size={24} />
            </button>
          </header>

          <main className="p-6 overflow-y-auto space-y-8 text-gray-600 dark:text-gray-300">
            <section>
              <h3 className="flex items-center text-lg font-semibold text-sky-700 dark:text-sky-200 mb-3"><FiAward className="mr-2" /> {t('missionTitle')}</h3>
              <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: t('missionText') }} />
            </section>

            <section>
              <h3 className="flex items-center text-lg font-semibold text-purple-700 dark:text-purple-200 mb-3"><FiMessageCircle className="mr-2" /> {t('noorIntroTitle')}</h3>
              <p className="text-sm mb-4">{t('noorIntroText')}</p>
              <div className="space-y-3">
                <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-lg">
                  <h5 className="font-bold text-gray-800 dark:text-white">{t('noorTraitGentleTitle')}</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('noorTraitGentleText')}</p>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-lg">
                  <h5 className="font-bold text-gray-800 dark:text-white">{t('noorTraitSupportiveTitle')}</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('noorTraitSupportiveText')}</p>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-lg">
                  <h5 className="font-bold text-gray-800 dark:text-white">{t('noorTraitGroundedTitle')}</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('noorTraitGroundedText')}</p>
                </div>
                <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-lg">
                  <h5 className="font-bold text-gray-800 dark:text-white">{t('noorTraitBoundariesTitle')}</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('noorTraitBoundariesText')}</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="flex items-center text-lg font-semibold text-sky-700 dark:text-sky-200 mb-3"><FiHelpCircle className="mr-2" /> {t('tafsirGuideTitle')}</h3>
              <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: t('tafsirGuideBody') }} />
            </section>

            <section>
              <h3 className="flex items-center text-lg font-semibold text-sky-700 dark:text-sky-200 mb-3"><FiZap className="mr-2" /> {t('pillarsTitle')}</h3>
              <p className="text-sm mb-4">{t('pillarsIntro')}</p>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <FiShield className="text-sky-500 dark:text-sky-300 text-2xl shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-sky-700 dark:text-sky-200">{t('taPillarTitle')}</h4>
                    <p className="text-sm">{t('taPillarText')}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <FiUser className="text-green-500 dark:text-green-300 text-2xl shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-green-700 dark:text-green-200">{t('tiPillarTitle')}</h4>
                    <p className="text-sm">{t('tiPillarText')}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <FiCompass className="text-amber-500 dark:text-amber-300 text-2xl shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-amber-700 dark:text-amber-200">{t('tsPillarTitle')}</h4>
                    <p className="text-sm">{t('tsPillarText')}</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="flex items-center text-lg font-semibold text-purple-700 dark:text-purple-200 mb-3"><FiEdit className="mr-2" /> {t('tazakkurProcessTitle')}</h3>
              <p className="text-sm mb-4">{t('tazakkurProcessIntro')}</p>
              <div className="space-y-3">
                  <TazakkurPillar title={t('p1Title')} text={t('p1Text')} q={t('p1Question')}/>
                  <TazakkurPillar title={t('p2Title')} text={t('p2Text')} q={t('p2Question')}/>
                  <TazakkurPillar title={t('p3Title')} text={t('p3Text')} q={t('p3Question')}/>
                  <TazakkurPillar title={t('rTitle')} text={t('rText')} q={t('rQuestion')}/>
              </div>
            </section>

            <section>
              <h3 className="flex items-center text-lg font-semibold text-sky-700 dark:text-sky-200 mb-3"><FiBookOpen className="mr-2" /> {t('levelsTitle')}</h3>
              <div className="space-y-6">
                <div className="md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-6 space-y-6 md:space-y-0">
                  {Object.entries(levelGroups).map(([groupKey, levels]) => (
                    <div key={groupKey}>
                      <h4 className="font-semibold text-gray-700 dark:text-gray-200">{t(groupKey)}</h4>
                      <div className="space-y-3 mt-2">
                        {levels.map(key => (
                          <div key={key} className="p-3 bg-gray-100 dark:bg-white/5 rounded-lg">
                            <p className="font-bold text-gray-800 dark:text-white">{key}: {t(key as TadabburLevel)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t(`${key}_desc` as any)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
          <footer className="p-3 text-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-white/10">
              <p>
                {t('footerLine1', { version: APP_VERSION })} -{' '}
                <button onClick={onOpenUpdateLog} className="underline hover:text-purple-400">
                  {t('updateLogLink')}
                </button>
              </p>
              <p dangerouslySetInnerHTML={{ __html: t('footerLine2') }} />
          </footer>
        </div>
      </div>
    </>
  );
};

export default InfoModal;

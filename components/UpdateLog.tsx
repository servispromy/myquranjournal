import React, { useState } from 'react';
import { FiX, FiGift } from 'react-icons/fi';
import { useI18n } from '../lib/i18n';

interface UpdateLogProps {
  isOpen: boolean;
  onClose: () => void;
}

const UpdateLog: React.FC<UpdateLogProps> = ({ isOpen, onClose }) => {
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

  const updates = [
    {
      version: '2.2.9',
      date: t('updateLogV2_2_9_date'),
      changes: [
        t('updateLogV2_2_9_c1'),
      ]
    },
    {
      version: '2.2.8',
      date: t('updateLogV2_2_8_date'),
      changes: [
        t('updateLogV2_2_8_c1'),
      ]
    },
    {
      version: '2.2.7',
      date: t('updateLogV2_2_7_date'),
      changes: [
        t('updateLogV2_2_7_c1'),
        t('updateLogV2_2_7_c2'),
        t('updateLogV2_2_7_c3'),
      ]
    },
    {
      version: '2.2.6',
      date: t('updateLogV2_2_6_date'),
      changes: [
        t('updateLogV2_2_6_c1'),
        t('updateLogV2_2_6_c2'),
      ]
    },
    {
      version: '2.2.5',
      date: t('updateLogV2_2_5_date'),
      changes: [
        t('updateLogV2_2_5_c1'),
        t('updateLogV2_2_5_c2'),
        t('updateLogV2_2_5_c3'),
      ]
    },
    {
      version: '2.2.4',
      date: t('updateLogV2_2_4_date'),
      changes: [
        t('updateLogV2_2_4_c1'),
        t('updateLogV2_2_4_c2'),
      ]
    },
    {
      version: '2.2.3',
      date: t('updateLogV2_2_3_date'),
      changes: [
        t('updateLogV2_2_3_c1'),
        t('updateLogV2_2_3_c2'),
        t('updateLogV2_2_3_c3'),
      ]
    },
    {
      version: '2.2.2',
      date: t('updateLogV2_2_2_date'),
      changes: [
        t('updateLogV2_2_2_c1'),
        t('updateLogV2_2_2_c2'),
        t('updateLogV2_2_2_c3'),
        t('updateLogV2_2_2_c4'),
      ]
    },
    {
      version: '2.2.1',
      date: t('updateLogV2_2_1_date'),
      changes: [
        t('updateLogV2_2_1_c1'),
        t('updateLogV2_2_1_c2'),
        t('updateLogV2_2_1_c3'),
        t('updateLogV2_2_1_c4'),
      ]
    },
    {
      version: '2.2.0',
      date: t('updateLogV2_2_0_date'),
      changes: [
        t('updateLogV2_2_0_c1'),
        t('updateLogV2_2_0_c2'),
      ]
    },
    {
      version: '2.1.7',
      date: t('updateLogV2_1_7_date'),
      changes: [
        t('updateLogV2_1_7_c1'),
        t('updateLogV2_1_7_c2'),
      ]
    },
    {
      version: '2.1.6',
      date: t('updateLogV2_1_6_date'),
      changes: [
        t('updateLogV2_1_6_c1'),
        t('updateLogV2_1_6_c2'),
        t('updateLogV2_1_6_c3'),
        t('updateLogV2_1_6_c4'),
        t('updateLogV2_1_6_c5'),
      ]
    },
    {
      version: '2.1.5',
      date: t('updateLogV2_1_5_date'),
      changes: [
        t('updateLogV2_1_5_c1'),
      ]
    },
     {
      version: '2.1.4',
      date: t('updateLogV2_1_4_date'),
      changes: [
        t('updateLogV2_1_4_c1'),
      ]
    },
     {
      version: '2.1.3',
      date: t('updateLogV2_1_3_date'),
      changes: [
        t('updateLogV2_1_3_c1'),
        t('updateLogV2_1_3_c2'),
      ]
    },
     {
      version: '2.1.2',
      date: t('updateLogV2_1_2_date'),
      changes: [
        t('updateLogV2_1_2_c1'),
        t('updateLogV2_1_2_c2'),
        t('updateLogV2_1_2_c3'),
      ]
    },
     {
      version: '2.1.1',
      date: t('updateLogV2_1_1_date'),
      changes: [
        t('updateLogV2_1_1_c1'),
        t('updateLogV2_1_1_c2'),
        t('updateLogV2_1_1_c3'),
        t('updateLogV2_1_1_c4'),
      ]
    },
     {
      version: '2.1.0',
      date: t('updateLogV2_1_0_date'),
      changes: [
        t('updateLogV2_1_0_c1'),
        t('updateLogV2_1_0_c2'),
        t('updateLogV2_1_0_c3'),
        t('updateLogV2_1_0_c4'),
        t('updateLogV2_1_0_c5'),
      ]
    },
     {
      version: '2.0.0',
      date: t('updateLogV2_0_0_date'),
      changes: [
        t('updateLogV2_0_0_c1'),
        t('updateLogV2_0_0_c2'),
        t('updateLogV2_0_0_c3'),
        t('updateLogV2_0_0_c4'),
        t('updateLogV2_0_0_c5'),
      ]
    },
     {
      version: '1.9.7',
      date: t('updateLogV1_9_7_date'),
      changes: [
        t('updateLogV1_9_7_c1_pending'),
      ]
    },
     {
      version: '1.9.6',
      date: t('updateLogV1_9_6_date'),
      changes: [
        t('updateLogV1_9_6_c1'),
        t('updateLogV1_9_6_c2'),
        t('updateLogV1_9_6_c3'),
      ]
    },
     {
      version: '1.9.5',
      date: t('updateLogV1_9_5_date'),
      changes: [
        t('updateLogV1_9_5_c1'),
        t('updateLogV1_9_5_c2'),
        t('updateLogV1_9_5_c3'),
        t('updateLogV1_9_5_c4'),
      ]
    },
     {
      version: '1.9.4',
      date: t('updateLogV1_9_4_date'),
      changes: [
        t('updateLogV1_9_4_c1'),
        t('updateLogV1_9_4_c2'),
      ]
    },
     {
      version: '1.9.3',
      date: t('updateLogV1_9_3_date'),
      changes: [
        t('updateLogV1_9_3_c1'),
      ]
    },
     {
      version: '1.9.2',
      date: t('updateLogV1_9_2_date'),
      changes: [
        t('updateLogV1_9_2_c1'),
        t('updateLogV1_9_2_c2'),
      ]
    },
     {
      version: '1.9.1',
      date: t('updateLogV1_9_1_date'),
      changes: [
        t('updateLogV1_9_1_c1'),
      ]
    },
     {
      version: '1.9.0',
      date: t('updateLogV1_9_0_date'),
      changes: [
        t('updateLogV1_9_0_c1'),
        t('updateLogV1_9_0_c2'),
      ]
    },
     {
      version: '1.8.0',
      date: t('updateLogV1_8_0_date'),
      changes: [
        t('updateLogV1_8_0_c1'),
        t('updateLogV1_8_0_c2'),
        t('updateLogV1_8_0_c3'),
        t('updateLogV1_8_0_c4'),
      ]
    },
     {
      version: '1.7.1',
      date: t('updateLogV1_7_1_date'),
      changes: [
        t('updateLogV1_7_1_c1'),
        t('updateLogV1_7_1_c2'),
      ]
    },
     {
      version: '1.7.0',
      date: t('updateLogV1_7_0_date'),
      changes: [
        t('updateLogV1_7_0_c1'),
        t('updateLogV1_7_0_c2'),
        t('updateLogV1_7_0_c3'),
      ]
    },
     {
      version: '1.6.1',
      date: t('updateLogV1_6_1_date'),
      changes: [
        t('updateLogV1_6_1_c6'),
        t('updateLogV1_6_1_c5'),
        t('updateLogV1_6_1_c1'),
        t('updateLogV1_6_1_c2'),
        t('updateLogV1_6_1_c3'),
        t('updateLogV1_6_1_c4'),
      ]
    },
     {
      version: '1.6.0',
      date: t('updateLogV1_6_0_date'),
      changes: [
        t('updateLogV1_6_0_c1'),
        t('updateLogV1_6_0_c2'),
        t('updateLogV1_6_0_c3'),
        t('updateLogV1_6_0_c4'),
        t('updateLogV1_6_0_c5'),
      ]
    },
     {
      version: '1.5.0',
      date: t('updateLogV1_5_0_date'),
      changes: [
        t('updateLogV1_5_0_c1'),
        t('updateLogV1_5_0_c2'),
        t('updateLogV1_5_0_c3'),
        t('updateLogV1_5_0_c4'),
      ]
    },
    {
      version: '1.4.0',
      date: t('updateLogV1_4_0_date'),
      changes: [
        t('updateLogV1_4_0_c1'),
        t('updateLogV1_4_0_c2'),
        t('updateLogV1_4_0_c3'),
      ]
    },
    {
      version: '1.3.0',
      date: t('updateLogV1_3_0_date'),
      changes: [
        t('updateLogV1_3_0_c1'),
        t('updateLogV1_3_0_c2'),
        t('updateLogV1_3_0_c3'),
      ]
    },
    {
      version: '1.2.0',
      date: t('updateLogV1_2_0_date'),
      changes: [
        t('updateLogV1_2_0_c1'),
        t('updateLogV1_2_0_c2'),
        t('updateLogV1_2_0_c3'),
        t('updateLogV1_2_0_c4'),
      ]
    }
  ];

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in"
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-white">
            <FiGift className="text-purple-500" />
            {t('updateLogTitle')}
          </h2>
          <button onClick={handleClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-full p-1">
            <FiX size={24} />
          </button>
        </header>
        <main className="p-6 overflow-y-auto space-y-6">
          {updates.map(update => (
            <div key={update.version}>
              <div className="flex items-baseline gap-3">
                <h3 className="font-bold text-gray-900 dark:text-white">Version {update.version}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{update.date}</p>
              </div>
              <ul className="mt-2 ml-1 list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
                {update.changes.map((change, index) => <li key={index}>{change}</li>)}
              </ul>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
};

export default UpdateLog;
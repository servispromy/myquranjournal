

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiX, FiLoader, FiSend, FiMessageCircle } from 'react-icons/fi';
import { useI18n } from '../lib/i18n';
import { ChatMessage, TadabburAnalysis, VerseContent, UserSettings } from '../types';
import { askAboutVerse } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface PersonalHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  verseKey: string;
  verseContent: VerseContent;
  tadabburAnalysis: TadabburAnalysis;
  settings: UserSettings;
}

const PersonalHelperModal: React.FC<PersonalHelperModalProps> = ({ isOpen, onClose, verseKey, verseContent, tadabburAnalysis, settings }) => {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMessages([{
        role: 'model',
        content: t('helperIntro')
      }]);
    } else {
        // Reset state on close
        setMessages([]);
        setUserInput('');
        setIsLoading(false);
    }
  }, [isOpen, t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
        onClose();
        setIsClosing(false);
    }, 300);
  };

  const handleSend = useCallback(async () => {
    if (!userInput.trim() || isLoading) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userInput }];
    setMessages(newMessages);
    setUserInput('');
    setIsLoading(true);

    try {
      const response = await askAboutVerse(userInput, newMessages, verseKey, verseContent, tadabburAnalysis, settings);
      setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: t('errorUnknown') }]);
    } finally {
      setIsLoading(false);
    }
  }, [userInput, isLoading, messages, verseKey, verseContent, tadabburAnalysis, settings, t]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 shrink-0">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
            <FiMessageCircle className="text-purple-500" /> {t('helperTitle')}
          </h2>
          <button onClick={handleClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-full p-1">
            <FiX size={24} />
          </button>
        </header>

        <main className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white shrink-0 text-lg font-bold">N</div>}
              <div className={`max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}>
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
           {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white shrink-0 text-lg font-bold">N</div>
              <div className="max-w-md p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                <FiLoader className="animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        <footer className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              placeholder={t('helperPlaceholder')}
              className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 focus:ring-2 focus:ring-purple-400 focus:outline-none"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!userInput.trim() || isLoading}
              className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:bg-purple-800"
            >
              <FiSend size={18}/>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PersonalHelperModal;
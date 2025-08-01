
import React, { useState, useEffect, useMemo } from 'react';
import { FiX, FiPlus, FiSave, FiTrash2, FiTag } from 'react-icons/fi';
import { useI18n } from '../lib/i18n';
import { BookmarkCategory, UserSettings } from '../types';
import { BOOKMARK_COLORS } from '../constants';

interface BookmarkVerseModalProps {
  isOpen: boolean;
  onClose: () => void;
  verseKey: string;
  settings: UserSettings;
  onSave: (updates: { bookmarks: UserSettings['bookmarks'], bookmarkCategories: UserSettings['bookmarkCategories'] }) => void;
}

const BookmarkVerseModal: React.FC<BookmarkVerseModalProps> = ({ isOpen, onClose, verseKey, settings, onSave }) => {
  const { t } = useI18n();
  const [note, setNote] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(BOOKMARK_COLORS[0]);
  const [isClosing, setIsClosing] = useState(false);

  const pinnedCount = useMemo(() => Object.values(settings.bookmarks).filter(b => b.pinned).length, [settings.bookmarks]);

  useEffect(() => {
    if (isOpen && verseKey) {
      const existingBookmark = settings.bookmarks[verseKey];
      setNote(existingBookmark?.note || '');
      setIsPinned(existingBookmark?.pinned || false);
      
      const initialSelected = new Set<string>();
      settings.bookmarkCategories.forEach(cat => {
        if (cat.verseKeys.includes(verseKey)) {
          initialSelected.add(cat.id);
        }
      });
      setSelectedCategoryIds(initialSelected);
    }
  }, [isOpen, verseKey, settings]);
  
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
        onClose();
        setIsClosing(false);
    }, 300);
  };

  if (!isOpen) return null;

  const handleCategoryToggle = (catId: string) => {
    const newSelection = new Set(selectedCategoryIds);
    if (newSelection.has(catId)) {
      newSelection.delete(catId);
    } else {
      newSelection.add(catId);
    }
    setSelectedCategoryIds(newSelection);
  };

  const updateCategories = (categories: BookmarkCategory[], verseKey: string, selectedIds: Set<string>): BookmarkCategory[] => {
      return categories.map(cat => {
          const isSelected = selectedIds.has(cat.id);
          const hasVerse = cat.verseKeys.includes(verseKey);
          if (isSelected && !hasVerse) {
              return { ...cat, verseKeys: [...cat.verseKeys, verseKey] };
          }
          if (!isSelected && hasVerse) {
              return { ...cat, verseKeys: cat.verseKeys.filter(vk => vk !== verseKey) };
          }
          return cat;
      });
  };
  
  const handleCreateAndAdd = () => {
    if (!newCategoryName.trim()) return;

    let updatedBookmarks = { ...settings.bookmarks };
    let updatedCategories = [...settings.bookmarkCategories];
    
    // Create new category
    const newCategory: BookmarkCategory = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
      color: newCategoryColor,
      verseKeys: [verseKey]
    };
    updatedCategories.push(newCategory);
    
    // Update selected categories
    const newSelectedIds = new Set(selectedCategoryIds);
    newSelectedIds.add(newCategory.id);
    setSelectedCategoryIds(newSelectedIds);

    // Create or update the bookmark itself
    const existingBookmark = updatedBookmarks[verseKey];
    updatedBookmarks[verseKey] = {
      ...existingBookmark,
      note: note.trim(),
      pinned: isPinned,
      createdAt: existingBookmark?.createdAt || new Date().toISOString()
    };
    
    // Now also update category associations
    updatedCategories = updateCategories(updatedCategories, verseKey, newSelectedIds);

    onSave({ bookmarks: updatedBookmarks, bookmarkCategories: updatedCategories });

    setNewCategoryName('');
    setNewCategoryColor(BOOKMARK_COLORS[0]);
    handleClose();
  };

  const handleSaveChanges = () => {
    let updatedBookmarks = { ...settings.bookmarks };
    
    if (selectedCategoryIds.size === 0) { // If no category selected, delete the bookmark
        delete updatedBookmarks[verseKey];
    } else {
        const existingBookmark = updatedBookmarks[verseKey];
        updatedBookmarks[verseKey] = {
          note: note.trim(),
          pinned: isPinned,
          createdAt: existingBookmark?.createdAt || new Date().toISOString()
        };
    }
    
    const updatedCategories = updateCategories(settings.bookmarkCategories, verseKey, selectedCategoryIds);
    onSave({ bookmarks: updatedBookmarks, bookmarkCategories: updatedCategories });
    handleClose();
  };

  const handleDeleteBookmark = () => {
      if (window.confirm(t('deleteBookmarkConfirm'))) {
          let updatedBookmarks = { ...settings.bookmarks };
          delete updatedBookmarks[verseKey];

          const updatedCategories = settings.bookmarkCategories.map(cat => ({
              ...cat,
              verseKeys: cat.verseKeys.filter(vk => vk !== verseKey)
          }));

          onSave({ bookmarks: updatedBookmarks, bookmarkCategories: updatedCategories });
          handleClose();
      }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 shrink-0">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">{t('manageBookmarks')}</h2>
          <button onClick={handleClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-full p-1">
            <FiX size={24} />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('bookmarkNoteLabel')}</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('bookmarkNotePlaceholder')}
              className="w-full h-24 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-purple-400 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('pinToTopLabel')}</span>
              <div className="relative">
                <input type="checkbox" className="sr-only peer" checked={isPinned} onChange={() => setIsPinned(!isPinned)} disabled={!isPinned && pinnedCount >= 3} />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
              </div>
            </label>
            {!isPinned && pinnedCount >= 3 && <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">{t('pinLimitWarning')}</p>}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('addToCategory')}</h3>
            {settings.bookmarkCategories.length > 0 ? (
                settings.bookmarkCategories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-black/20 hover:bg-gray-200 dark:hover:bg-black/40 cursor-pointer transition-colors">
                        <input
                            type="checkbox"
                            checked={selectedCategoryIds.has(cat.id)}
                            onChange={() => handleCategoryToggle(cat.id)}
                            className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                         <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></div>
                        <span className="flex-1 text-gray-800 dark:text-gray-200">{cat.name}</span>
                    </label>
                ))
            ) : (
                <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">{t('noCategoriesYet')}</p>
            )}
          </div>
          
           <div className="pt-4 border-t border-gray-200 dark:border-white/10 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('newCategoryPrompt')}</h3>
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder={t('categoryNamePlaceholder')}
                className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-white/20 rounded-lg p-2 focus:ring-2 focus:ring-purple-400 focus:outline-none"
              />
              <div className="flex flex-wrap gap-2">
                  {BOOKMARK_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewCategoryColor(color)}
                        className={`w-7 h-7 rounded-full transition-transform transform hover:scale-110 ${newCategoryColor === color ? 'ring-2 ring-offset-2 ring-purple-500 dark:ring-offset-gray-900' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                  ))}
              </div>
               <button 
                onClick={handleCreateAndAdd} 
                disabled={!newCategoryName.trim()}
                className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                <FiPlus/> {t('createCategory')}
              </button>
           </div>

        </main>
        
        <footer className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-white/10 shrink-0 space-y-2">
          <button
              onClick={handleSaveChanges}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
              <FiSave /> {t('saveChanges')}
          </button>
           <button
              onClick={handleDeleteBookmark}
              className="w-full flex items-center justify-center gap-2 text-sm text-red-600 dark:text-red-400 font-semibold hover:bg-red-500/10 py-2 px-4 rounded-lg transition-colors"
          >
              <FiTrash2 /> {t('deleteBookmarkButton')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default BookmarkVerseModal;

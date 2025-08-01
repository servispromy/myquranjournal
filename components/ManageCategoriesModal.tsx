
import React, { useState, useEffect } from 'react';
import { FiX, FiEdit2, FiTrash2, FiSave } from 'react-icons/fi';
import { useI18n } from '../lib/i18n';
import { BookmarkCategory } from '../types';
import { BOOKMARK_COLORS } from '../constants';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: BookmarkCategory[];
  onUpdateCategories: (newCategories: BookmarkCategory[]) => void;
}

const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({ isOpen, onClose, categories, onUpdateCategories }) => {
  const { t } = useI18n();
  const [localCategories, setLocalCategories] = useState<BookmarkCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; color: string } | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalCategories(categories);
      setEditingCategory(null);
    }
  }, [isOpen, categories]);
  
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
        onClose();
        setIsClosing(false);
    }, 300);
  };

  if (!isOpen) return null;

  const handleStartEdit = (category: BookmarkCategory) => {
    setEditingCategory({ id: category.id, name: category.name, color: category.color });
  };
  
  const handleCancelEdit = () => {
    setEditingCategory(null);
  };

  const handleSaveEdit = () => {
    if (!editingCategory) return;
    if (!editingCategory.name.trim()) return;

    setLocalCategories(prev => prev.map(cat => 
        cat.id === editingCategory.id 
        ? { ...cat, name: editingCategory.name.trim(), color: editingCategory.color }
        : cat
    ));
    setEditingCategory(null);
  };
  
  const handleConfirmDelete = (categoryId: string) => {
    const categoryToDelete = localCategories.find(c => c.id === categoryId);
    if (!categoryToDelete) return;
    
    if (window.confirm(t('deleteConfirmationText', { name: categoryToDelete.name }))) {
        setLocalCategories(prev => prev.filter(cat => cat.id !== categoryId));
    }
  };

  const handleUpdateAndSave = () => {
    onUpdateCategories(localCategories);
    handleClose();
  };

  const isDefaultCategory = (id: string) => id === 'default_general';

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in"
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 shrink-0">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">{t('manageCategoriesTitle')}</h2>
          <button onClick={handleClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-full p-1">
            <FiX size={24} />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto space-y-2">
            {localCategories.map(cat => (
                <div key={cat.id} className="p-3 rounded-lg bg-gray-100 dark:bg-black/20">
                   {editingCategory && editingCategory.id === cat.id ? (
                        <div className="space-y-3 animate-fade-in">
                            <input
                                type="text"
                                value={editingCategory.name}
                                onChange={e => setEditingCategory({...editingCategory, name: e.target.value})}
                                className="w-full bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-white/20 rounded-lg p-2 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                            />
                            <div className="flex flex-wrap gap-2">
                                {BOOKMARK_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setEditingCategory({...editingCategory, color})}
                                        className={`w-7 h-7 rounded-full transition-transform transform hover:scale-110 ${editingCategory.color === color ? 'ring-2 ring-offset-2 ring-purple-500 dark:ring-offset-gray-900' : ''}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={handleCancelEdit} className="text-sm font-semibold px-3 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">{t('cancelButton')}</button>
                                <button onClick={handleSaveEdit} className="flex items-center gap-1.5 text-sm font-semibold bg-purple-600 text-white px-3 py-1 rounded-lg"><FiSave/>{t('saveChanges')}</button>
                            </div>
                        </div>
                   ) : (
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></div>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{cat.name}</span>
                            </div>
                            {!isDefaultCategory(cat.id) && (
                                <div className="flex items-center gap-1">
                                    <button onClick={() => handleStartEdit(cat)} title={t('editCategory')} className="p-2 text-gray-500 dark:text-gray-400 hover:text-sky-500 rounded-full transition-colors"><FiEdit2 size={16}/></button>
                                    <button onClick={() => handleConfirmDelete(cat.id)} title={t('deleteCategory')} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 rounded-full transition-colors"><FiTrash2 size={16}/></button>
                                </div>
                            )}
                        </div>
                   )}
                </div>
            ))}
        </main>

        <footer className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-white/10 shrink-0">
          <button
              onClick={handleUpdateAndSave}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
              <FiSave className="inline-block mr-2"/>
              {t('updateAndSaveButton')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ManageCategoriesModal;
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FiX, FiUser, FiUploadCloud, FiShare2, FiAlertTriangle, FiGift, FiCheck, FiDatabase, FiMessageSquare, FiEdit2, FiHeart, FiType } from 'react-icons/fi';
import { UserSettings, TadabburDifficulty, FontSize } from '../types';
import { APP_VERSION, AGE_OPTIONS, COUNTRIES, USER_ROLES, TAFSIR_AUTHORS, RECITERS } from '../constants';
import { useI18n } from '../lib/i18n';
import SearchableSelect from './SearchableSelect';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: UserSettings;
  onUpdate: (newSettings: UserSettings) => void;
  onOpenUpdateLog: () => void;
  onOpenManageCategories: () => void;
  onOpenSupportModal: () => void;
}

function toBase64(canvas: HTMLCanvasElement): string {
    return canvas.toDataURL('image/jpeg', 0.8);
}

function getCroppedImg(image: HTMLImageElement, crop: PixelCrop): Promise<string> {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return Promise.reject(new Error('Canvas context not available'));
    }

    const pixelRatio = window.devicePixelRatio;
    canvas.width = crop.width * pixelRatio;
    canvas.height = crop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height,
    );
    
    return Promise.resolve(toBase64(canvas));
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentSettings, onUpdate, onOpenUpdateLog, onOpenManageCategories, onOpenSupportModal }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const [feedbackText, setFeedbackText] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameForEdit, setNameForEdit] = useState('');

  useEffect(() => {
    // When modal opens, sync the state for name editing
    if (isOpen) {
      setNameForEdit(currentSettings.name);
    }
  }, [isOpen, currentSettings.name]);


  const handleUpdate = (field: keyof UserSettings, value: any) => {
    onUpdate({ ...currentSettings, [field]: value });
  };
  
  const handleNameEditDone = () => {
    if (nameForEdit.trim()) {
        handleUpdate('name', nameForEdit.trim());
    }
    setIsEditingName(false);
  };


  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [error, setError] = useState<string | null>(null);

  const ageOptions = useMemo(() => AGE_OPTIONS.map(age => ({ label: age, value: age })), []);
  const countryOptions = useMemo(() => COUNTRIES.map(country => ({ label: country, value: country })), []);
  const reciterOptions = useMemo(() => RECITERS.map(r => ({ label: r.name, value: r.id })), []);


  const handleClose = () => {
      setIsClosing(true);
      setTimeout(() => {
          onClose();
          setIsClosing(false);
          setIsEditingName(false);
      }, 300);
  };

  if (!isOpen) return null;
  
  const handleRoleChange = (roleId: string) => {
    const newRoles = currentSettings.roles.includes(roleId)
        ? currentSettings.roles.filter(r => r !== roleId)
        : [...currentSettings.roles, roleId];
    handleUpdate('roles', newRoles);
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
       if (file.size > 2 * 1024 * 1024) { // 2MB limit
            setError(t('errorImageSize'));
            return;
        }
        const reader = new FileReader();
        reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
        reader.readAsDataURL(file);
    }
  };
  
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
      width,
      height
    );
    setCrop(crop);
  }

  const handleSaveAvatar = async () => {
    if (completedCrop && imgRef.current) {
        try {
            const base64Image = await getCroppedImg(imgRef.current, completedCrop);
            handleUpdate('profilePic', base64Image);
            setImgSrc(''); // Close cropper
        } catch (e) {
            console.error(e);
            setError(t('errorCropImage'));
        }
    }
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return;
    const whatsappNumber = '60139526200';
    const message = `${t('feedbackMessageHeader', { name: currentSettings.name })}\n\n${feedbackText}`;
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };
  
  const handleShareApp = async () => {
    const shareData = {
      title: 'MyQuran Journal',
      text: t('shareAppText'),
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        alert(t('shareAppCopied'));
      }
    } catch (err) {
      console.error("Error sharing app:", err);
      // Fallback for failed share
      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      alert(t('shareAppCopied'));
    }
  };

  const InputRow: React.FC<{label: string; children: React.ReactNode}> = ({label, children}) => (
    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-center">
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
      <div className="mt-1 sm:mt-0 sm:col-span-2">{children}</div>
    </div>
  );
  
  const difficultyLevels: TadabburDifficulty[] = ['easy', 'intermediate', 'high', 'comprehensive'];
  const fontSizes: FontSize[] = ['sm', 'base', 'lg', 'xl', '2xl'];

  const FontSizeSelector: React.FC<{value: FontSize, onChange: (size: FontSize) => void}> = ({ value, onChange }) => (
    <div className="grid grid-cols-5 gap-1 bg-gray-200 dark:bg-slate-800 p-1 rounded-lg">
        {fontSizes.map(size => (
            <button
                key={size}
                onClick={() => onChange(size)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${value === size ? 'bg-purple-500 text-white' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-700'}`}
            >
                {t(`fontSize${size.charAt(0).toUpperCase() + size.slice(1)}`)}
            </button>
        ))}
    </div>
  );


  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={handleClose}>
      <div className={`bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`} onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 shrink-0">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">My<span className="bg-gradient-to-r from-purple-500 to-sky-500 text-transparent bg-clip-text"><span className="logo-q">Q</span>uran</span>Journal</h2>
          <button onClick={handleClose} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-full p-1"><FiX size={24} /></button>
        </header>

        <main className="p-6 overflow-y-auto space-y-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              {currentSettings.profilePic ? (
                <img src={currentSettings.profilePic} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-purple-400" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center text-white"><FiUser size={32} /></div>
              )}
            </div>
            <div>
              <button onClick={handleImageUploadClick} className="flex items-center gap-2 text-sm font-semibold bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors">
                <FiUploadCloud /> {t('changePictureButton')}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('imageSizeHint')}</p>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm">
                <FiAlertTriangle /> {error}
            </div>
          )}

          {imgSrc && (
             <div className="space-y-4">
                <div className="flex justify-center bg-gray-100 dark:bg-black/20 p-2 rounded-lg">
                    <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={1} circularCrop>
                        <img ref={imgRef} src={imgSrc} onLoad={onImageLoad} alt="Crop preview" style={{ maxHeight: '40vh' }} />
                    </ReactCrop>
                </div>
                <div className="flex justify-center gap-4">
                     <button onClick={() => setImgSrc('')} className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700">{t('cancelButton')}</button>
                     <button onClick={handleSaveAvatar} className="flex items-center gap-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg">{t('saveAvatarButton')}</button>
                </div>
             </div>
          )}

          <div className="space-y-4 border-t border-gray-200 dark:border-white/10 pt-6">
            <InputRow label={t('nameLabel')}>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameForEdit}
                    onChange={(e) => setNameForEdit(e.target.value)}
                    className="flex-grow w-full bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg py-2 px-3 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleNameEditDone()}
                  />
                  <button onClick={handleNameEditDone} className="px-4 py-2 text-sm font-semibold bg-purple-600 text-white rounded-lg">{t('doneButton')}</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="py-2 px-3 text-gray-800 dark:text-gray-200">{currentSettings.name}</span>
                  <button onClick={() => { setIsEditingName(true); setNameForEdit(currentSettings.name); }} className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:underline">
                    <FiEdit2 size={12}/>{t('editButton')}
                  </button>
                </div>
              )}
            </InputRow>
            
            <InputRow label={t('genderLabel')}>
                 <div className="flex items-center gap-2">
                    <button onClick={() => handleUpdate('gender', 'male')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border-2 transition-colors ${currentSettings.gender === 'male' ? 'bg-sky-500/20 text-sky-700 dark:text-sky-200 border-sky-500' : 'bg-gray-100 dark:bg-slate-800 border-transparent hover:border-sky-300'}`}>{t('male')}</button>
                    <button onClick={() => handleUpdate('gender', 'female')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border-2 transition-colors ${currentSettings.gender === 'female' ? 'bg-pink-500/20 text-pink-700 dark:text-pink-200 border-pink-500' : 'bg-gray-100 dark:bg-slate-800 border-transparent hover:border-pink-300'}`}>{t('female')}</button>
                 </div>
            </InputRow>
            
            <InputRow label={t('ageLabel')}>
                <SearchableSelect options={ageOptions} value={currentSettings.age} onChange={(v) => handleUpdate('age', v)} placeholder={t('searchAge')} />
            </InputRow>

            <InputRow label={t('countryLabel')}>
                <SearchableSelect options={countryOptions} value={currentSettings.country} onChange={(v) => handleUpdate('country', v)} placeholder={t('searchCountry')} />
            </InputRow>

             <div className="sm:grid sm:grid-cols-3 sm:gap-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 pt-2">{t('iAmAlsoA')}</label>
                <div className="mt-1 sm:mt-0 sm:col-span-2">
                    <div className="grid grid-cols-2 gap-2">
                        {USER_ROLES.map(role => (
                             <label key={role.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${currentSettings.roles.includes(role.id) ? 'bg-purple-100 dark:bg-purple-500/20 border-purple-300 dark:border-purple-500/50' : 'bg-gray-100 dark:bg-slate-800 border-transparent hover:border-gray-300 dark:hover:border-slate-600'}`}>
                                <input type="checkbox" checked={currentSettings.roles.includes(role.id)} onChange={() => handleRoleChange(role.id)} className="hidden" />
                                <span className="text-lg">{role.icon}</span>
                                <span className="text-xs font-semibold text-gray-800 dark:text-gray-300">{t(`role${role.id.charAt(0).toUpperCase() + role.id.slice(1)}`)}</span>
                            </label>
                        ))}
                    </div>
                     {currentSettings.roles.includes('other') && (
                        <div className="mt-2">
                           <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('roleOtherLabel')}</label>
                           <input type="text" value={currentSettings.roleOther || ''} onChange={(e) => handleUpdate('roleOther', e.target.value)} placeholder={t('roleOtherPlaceholder')} className="w-full text-sm bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg py-2 px-3 focus:ring-2 focus:ring-purple-400 focus:outline-none" />
                        </div>
                    )}
                </div>
            </div>

            <InputRow label={t('tadabburDifficultyLabel')}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {difficultyLevels.map((diff) => (
                      <button 
                          key={diff} 
                          onClick={() => handleUpdate('tadabburDifficulty', diff)} 
                          className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border-2 transition-colors ${currentSettings.tadabburDifficulty === diff ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-200 border-purple-500' : 'bg-gray-100 dark:bg-slate-800 border-transparent hover:border-gray-300 dark:hover:border-slate-500'}`}
                      >
                         {currentSettings.tadabburDifficulty === diff && <FiCheck/>}
                         {t(`difficulty${diff.charAt(0).toUpperCase() + diff.slice(1)}`)}
                      </button>
                  ))}
              </div>
            </InputRow>
            <p className="text-xs text-gray-500 dark:text-gray-400 sm:col-start-2 sm:col-span-2">{t('tadabburDifficultyHelp')}</p>
            
             <InputRow label={t('reciterLabel')}>
              <SearchableSelect 
                options={reciterOptions} 
                value={currentSettings.reciter} 
                onChange={(v) => handleUpdate('reciter', v)} 
                placeholder={t('selectReciter')} 
              />
            </InputRow>

            <InputRow label={t('favoriteTafsirLabel')}>
              <select 
                value={currentSettings.favoriteTafsir} 
                onChange={(e) => handleUpdate('favoriteTafsir', e.target.value)} 
                className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg py-2 px-3 focus:ring-2 focus:ring-purple-400 focus:outline-none"
              >
                {TAFSIR_AUTHORS.map(author => (
                  <option key={author} value={author}>{author}</option>
                ))}
              </select>
            </InputRow>
            <p className="text-xs text-gray-500 dark:text-gray-400 sm:col-start-2 sm:col-span-2">{t('favoriteTafsirHelp')}</p>

            <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"><FiType/>{t('readingPreferences')}</h3>
                <InputRow label={t('arabicFontSize')}>
                    <FontSizeSelector value={currentSettings.arabicFontSize} onChange={(s) => handleUpdate('arabicFontSize', s)} />
                </InputRow>
                 <InputRow label={t('translationFontSize')}>
                    <FontSizeSelector value={currentSettings.translationFontSize} onChange={(s) => handleUpdate('translationFontSize', s)} />
                </InputRow>
            </div>


            <InputRow label={t('themeLabel')}>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleUpdate('theme', 'light')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border-2 transition-colors ${currentSettings.theme === 'light' ? 'bg-yellow-400/20 text-yellow-700 border-yellow-500' : 'bg-gray-100 dark:bg-slate-800 border-transparent hover:border-yellow-300'}`}>{t('lightTheme')}</button>
                    <button onClick={() => handleUpdate('theme', 'dark')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border-2 transition-colors ${currentSettings.theme === 'dark' ? 'bg-indigo-400/20 text-indigo-700 dark:text-indigo-200 border-indigo-500' : 'bg-gray-100 dark:bg-slate-800 border-transparent hover:border-indigo-300'}`}>{t('darkTheme')}</button>
                </div>
            </InputRow>

          </div>
          
          <div className="pt-6 border-t border-gray-200 dark:border-white/10 space-y-4">
              <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('dataBookmarks')}</h3>
                   <button onClick={onOpenManageCategories} className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors">
                      <FiDatabase /> {t('manageBookmarkCategories')}
                   </button>
              </div>

              <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('feedbackTitle')}</h3>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={t('feedbackPlaceholder')}
                    className="w-full h-24 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-purple-400 focus:outline-none text-sm"
                  />
                  <button
                    onClick={handleSendFeedback}
                    disabled={!feedbackText.trim()}
                    className="mt-2 w-full flex items-center justify-center gap-2 text-sm font-semibold bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                      <FiMessageSquare /> {t('sendWhatsApp')}
                  </button>
              </div>

              <div className="space-y-2">
                 {/* <button onClick={onOpenSupportModal} className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-300 hover:bg-pink-200 dark:hover:bg-pink-500/30 px-4 py-2 rounded-lg transition-colors">
                    <FiHeart /> {t('supportMission')}
                </button> */}
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleShareApp} className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors">
                        <FiShare2 /> {t('shareApp')}
                    </button>
                    <button onClick={onOpenUpdateLog} className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors">
                        <FiGift /> {t('updateLogTitle')}
                    </button>
                </div>
              </div>
          </div>
        </main>
        
        <footer className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-white/10 shrink-0">
            <button
                onClick={handleClose}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
                {t('doneButton')}
            </button>
        </footer>
      </div>
    </div>
  );
};

export default SettingsModal;
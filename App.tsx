import React, { useState, useCallback, useEffect } from 'react';
import LoginFlow from './components/LoginFlow';
import Tadabbur from './components/Tadabbur';
import SettingsModal from './components/SettingsModal';
import HistoryPage from './components/HistoryPage';
import FindGuidancePage from './components/FindGuidancePage';
import OnboardingInfo from './components/OnboardingInfo';
import { UserSettings, BookmarkCategory, Bookmark, HistoryItem, PageInsight as PageInsightType, VerseHistory } from './types';
import { I18nProvider } from './lib/i18n';
import UpdateLog from './components/UpdateLog';
import ManageCategoriesModal from './components/ManageCategoriesModal';
import SupportModal from './components/SupportModal';
import { PageInsight } from './components/PageInsight';
import WhatsNewModal from './components/WhatsNewModal';
import DisclaimerInfoModal from './components/DisclaimerInfoModal';
import { APP_VERSION } from './constants';

type Page = 'tadabbur' | 'history' | 'findGuidance' | 'pageInsight';

const App: React.FC = () => {
    const [settings, setSettings] = useState<UserSettings | null>(() => {
        try {
            const savedSettings = localStorage.getItem('myQuranJournalSettings');
            if (savedSettings) {
                let parsed = JSON.parse(savedSettings);

                // Default values for new settings
                if (!parsed.language || parsed.language === 'ar') parsed.language = 'en';
                if (!parsed.theme) parsed.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                if (!parsed.points) parsed.points = 0;
                if (!parsed.gender || parsed.gender === 'unspecified') parsed.gender = 'male'; 
                if (parsed.age === undefined) parsed.age = '';
                if (parsed.country === undefined) parsed.country = '';
                if (parsed.roles === undefined) parsed.roles = [];
                if (parsed.roleOther === undefined) parsed.roleOther = '';
                if (parsed.tadabburDifficulty === undefined) parsed.tadabburDifficulty = 'easy';
                if (parsed.favoriteTafsir === undefined) parsed.favoriteTafsir = 'Ibn Kathir';
                if (parsed.reciter === undefined) parsed.reciter = '1'; // Default to Mishary
                if (parsed.arabicFontSize === undefined) parsed.arabicFontSize = 'lg';
                if (parsed.translationFontSize === undefined) parsed.translationFontSize = 'base';
                if (parsed.lastSeenVersion === undefined) parsed.lastSeenVersion = '0.0.0';
                
                // Remove deprecated apiKey if it exists
                if (parsed.apiKey) {
                    delete parsed.apiKey;
                }

                // Migration from old `occupation` to new `roles`
                if (parsed.occupation !== undefined) {
                    parsed.roles = [];
                    if (parsed.occupation === 'student' || parsed.occupation === 'educator') {
                        parsed.roles.push(parsed.occupation);
                    }
                    delete parsed.occupation;
                    if (parsed.occupationOther) {
                       parsed.roleOther = parsed.occupationOther;
                       delete parsed.occupationOther;
                    }
                }
                
                // Migration for history format (v1 to v2)
                if (Array.isArray(parsed.history) && parsed.history.length > 0) {
                     parsed.history = parsed.history.map((item: any) => {
                        // If it's an old item without a 'type', migrate it
                        if (!item.type) {
                            const base = typeof item === 'string' 
                                ? { verseKey: item, date: new Date().toISOString() } 
                                : { ...item };
                            
                            return {
                                type: 'verse', // Add the type
                                verseKey: base.verseKey,
                                date: base.date || new Date().toISOString(),
                                tazakkurNote: base.tazakkurNote || '',
                                tazakkurSummary: base.tazakkurSummary || '',
                                rating: base.rating || 0,
                                understood: base.understood || false,
                            };
                        }
                        return item; // It's a new item, leave it
                     });
                } else if (!parsed.history) {
                    parsed.history = [];
                }

                // Migration from old bookmarkCategories to new bookmarks system
                if (Array.isArray(parsed.bookmarkCategories) && parsed.bookmarkCategories[0]?.verses) {
                    const newBookmarks: { [verseKey: string]: Bookmark } = {};
                    const newCategories: BookmarkCategory[] = parsed.bookmarkCategories.map((cat: any) => {
                        const newCat: BookmarkCategory = {
                            id: cat.id,
                            name: cat.name,
                            color: cat.color,
                            verseKeys: cat.verses
                        };
                        
                        cat.verses.forEach((verseKey: string) => {
                            if (!newBookmarks[verseKey]) {
                                newBookmarks[verseKey] = {
                                    note: '',
                                    pinned: false,
                                    createdAt: new Date().toISOString()
                                };
                            }
                        });
                        return newCat;
                    });
                    
                    parsed.bookmarks = newBookmarks;
                    parsed.bookmarkCategories = newCategories;
                } else {
                    if (parsed.bookmarks === undefined) parsed.bookmarks = {};
                    if (parsed.bookmarkCategories === undefined) parsed.bookmarkCategories = [];
                }
                
                // Migration for history misconceptions format (v2.1.4 to v2.1.5)
                if (Array.isArray(parsed.history)) {
                    parsed.history = parsed.history.map((item: any) => {
                        if (item.type === 'page' && item.misconceptions && item.misconceptions.length > 0 && typeof item.misconceptions[0] === 'string') {
                            return {
                                ...item,
                                misconceptions: item.misconceptions.map((text: string) => ({ text, explanation: undefined }))
                            };
                        }
                        if (item.type === 'verse' && item.misconception && typeof item.misconception === 'string') {
                            return {
                                ...item,
                                misconception: { text: item.misconception, explanation: undefined }
                            };
                        }
                        return item;
                    });
                }

                
                // Migration for onboarding completion. All users who haven't seen it should see it.
                if (parsed.hasCompletedOnboarding === undefined) {
                    parsed.hasCompletedOnboarding = false;
                }

                // Remove old disclaimer flag
                if (parsed.hasAcceptedDisclaimer !== undefined) {
                    delete parsed.hasAcceptedDisclaimer;
                }
                
                return parsed as UserSettings;
            }
            return null;
        } catch (e) {
            console.error("Could not access localStorage:", e);
            return null;
        }
    });
    
    const [viewState, setViewState] = useState<'entry' | 'main'>('entry');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isUpdateLogOpen, setIsUpdateLogOpen] = useState(false);
    const [isManageCategoriesModalOpen, setIsManageCategoriesModalOpen] = useState(false);
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
    const [isDisclaimerInfoModalOpen, setIsDisclaimerInfoModalOpen] = useState(false);
    const [isWhatsNewModalOpen, setIsWhatsNewModalOpen] = useState(false);
    const [provisionalLanguage, setProvisionalLanguage] = useState<UserSettings['language']>('en');
    
    const [currentPage, setCurrentPage] = useState<Page>('tadabbur');
    const [isPageTransitioning, setIsPageTransitioning] = useState(false);
    const [preloadVerseKey, setPreloadVerseKey] = useState<string | null>(null);

    useEffect(() => {
        if (settings && settings.lastSeenVersion < APP_VERSION) {
            setIsWhatsNewModalOpen(true);
        }
    }, [settings]);

    useEffect(() => {
        // Hide the static splash screen after the app has loaded
        const splash = document.getElementById('splash-screen');
        if (splash) {
            setTimeout(() => {
                splash.classList.add('hidden');
                splash.addEventListener('transitionend', () => splash.remove());
            }, 50); // Short delay to allow React to render
        }
    }, []);

    useEffect(() => {
        if (settings) {
            localStorage.setItem('myQuranJournalSettings', JSON.stringify(settings));
            const root = window.document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(settings.theme);
        }
    }, [settings]);
    
    const navigateTo = useCallback((page: Page) => {
        if (page === currentPage) return;
        setIsPageTransitioning(true);
        setTimeout(() => {
            setCurrentPage(page);
            setIsPageTransitioning(false);
        }, 150);
    }, [currentPage]);

    const handleLogin = useCallback((name: string) => {
        const defaultSettings: UserSettings = {
            name: name,
            profilePic: null,
            theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
            language: provisionalLanguage,
            gender: 'male',
            roles: [],
            roleOther: '',
            age: '',
            country: '',
            tadabburDifficulty: 'easy',
            favoriteTafsir: 'Ibn Kathir',
            reciter: '1',
            history: [],
            points: 0,
            bookmarks: {},
            bookmarkCategories: [],
            hasCompletedOnboarding: false,
            lastSeenVersion: '0.0.0',
            arabicFontSize: 'lg',
            translationFontSize: 'base',
        };
        setSettings(defaultSettings);
        setViewState('main');
        // Open settings for the new user to complete their profile
        if (!settings) {
            setIsSettingsOpen(true);
        }
    }, [provisionalLanguage, settings]);
    
    const handleSettingsUpdate = (newSettings: UserSettings) => {
      setSettings(prev => {
          const updatedSettings = { ...(prev || {}), ...newSettings };
          return updatedSettings as UserSettings;
      });
    };

    const handleOnboardingComplete = useCallback(() => {
        setSettings(prev => {
            if (!prev) return null;
            return { ...prev, hasCompletedOnboarding: true };
        });
    }, []);
    
    const handleHistoryUpdate = useCallback((historyData: Omit<VerseHistory, 'type' | 'date'>) => {
        setSettings(prev => {
            if (!prev) return null;
            
            const { verseKey } = historyData;
            const historyIndex = prev.history.findIndex(item => item.type === 'verse' && item.verseKey === verseKey);
            let newHistory = [...prev.history];
            let newPoints = prev.points;

            const newEntry: HistoryItem = {
                type: 'verse',
                date: new Date().toISOString(),
                ...historyData,
            };

            if (historyIndex > -1) {
                // Merge new data with existing, preserving old note if new one is not provided
                const oldEntry = newHistory[historyIndex] as VerseHistory;
                newHistory[historyIndex] = {
                    ...oldEntry,
                    ...newEntry,
                    tazakkurNote: newEntry.tazakkurNote ?? oldEntry.tazakkurNote,
                };
            } else {
                newHistory.push(newEntry);
                newPoints = (prev.points || 0) + 10;
            }
            
            return { ...prev, history: newHistory, points: newPoints };
        });
    }, []);
    
    const handleDeleteHistoryItem = useCallback((itemToDelete: HistoryItem) => {
        setSettings(prev => {
            if (!prev) return null;
            const newHistory = prev.history.filter(item => item.date !== itemToDelete.date);
            // Not deducting points for deletion as it's a record removal, not an undo.
            return { ...prev, history: newHistory };
        });
    }, []);

    const handlePageInsightSave = useCallback((pageNumber: number, insight: PageInsightType) => {
        setSettings(prev => {
            if (!prev) return null;
            
            const historyIndex = prev.history.findIndex(item => item.type === 'page' && item.pageNumber === pageNumber);
            let newHistory = [...prev.history];
            let newPoints = prev.points;

            const newEntry: HistoryItem = {
                type: 'page',
                pageNumber,
                date: new Date().toISOString(),
                title: insight.title,
                summary: insight.summary,
                actions: insight.actions,
                deeperActions: insight.deeperActions,
                tags: insight.tags,
                continuity: insight.continuity,
                misconceptions: insight.misconceptions,
            };

            if (historyIndex > -1) {
                newHistory[historyIndex] = newEntry;
            } else {
                newHistory.push(newEntry);
                newPoints = (prev.points || 0) + 25; // More points for a page reflection
            }
            
            return { ...prev, history: newHistory, points: newPoints };
        });
    }, []);

    const handleBookmarkUpdate = useCallback((updates: { bookmarks: UserSettings['bookmarks'], bookmarkCategories: UserSettings['bookmarkCategories'] }) => {
        setSettings(prev => {
            if (!prev) return null;
            return { ...prev, ...updates };
        });
    }, []);

    const handleCacheSummary = useCallback((verseKey: string, summary: string) => {
        setSettings(prev => {
            if (!prev) return null;
            const historyIndex = prev.history.findIndex(item => item.type === 'verse' && item.verseKey === verseKey);
            if (historyIndex === -1) return prev; 

            const newHistory = [...prev.history] as any; // Cast to any to modify
            newHistory[historyIndex] = { ...newHistory[historyIndex], tazakkurSummary: summary };
            
            return { ...prev, history: newHistory };
        });
    }, []);

    const handleVerseSelectFromGuidance = useCallback((verseKey: string) => {
        setPreloadVerseKey(verseKey);
        navigateTo('tadabbur');
    }, [navigateTo]);

    const onPreloadConsumed = useCallback(() => setPreloadVerseKey(null), []);
    
    const handleCloseWhatsNew = useCallback(() => {
        setSettings(prev => {
            if (!prev) return null;
            return { ...prev, lastSeenVersion: APP_VERSION };
        });
        setIsWhatsNewModalOpen(false);
    }, []);

    if (viewState === 'entry') {
        return (
            <I18nProvider language={settings?.language || provisionalLanguage}>
                <LoginFlow 
                    isReturningUser={!!settings}
                    onEnter={() => setViewState('main')}
                    onLogin={handleLogin}
                    onOpenUpdateLog={() => setIsUpdateLogOpen(true)}
                    provisionalLanguage={provisionalLanguage}
                    onProvisionalLanguageChange={setProvisionalLanguage}
                />
                <UpdateLog isOpen={isUpdateLogOpen} onClose={() => setIsUpdateLogOpen(false)} />
            </I18nProvider>
        );
    }
    
    if (!settings) {
        // This case should theoretically not be hit if viewState logic is correct,
        // but it's a safe fallback.
        return null; 
    }

    return (
        <I18nProvider language={settings.language}>
             <div className="min-h-screen w-full bg-transparent transition-colors duration-300">
                <div className={`transition-opacity duration-150 ${isPageTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                  {(() => {
                      if (!settings.hasCompletedOnboarding) {
                          return <OnboardingInfo onComplete={handleOnboardingComplete} settings={settings} />;
                      }
                      
                      switch (currentPage) {
                          case 'history':
                              return <HistoryPage settings={settings} onBack={() => navigateTo('tadabbur')} onDeleteHistoryItem={handleDeleteHistoryItem} />;
                          case 'findGuidance':
                              return <FindGuidancePage settings={settings} onBack={() => navigateTo('tadabbur')} onVerseSelect={handleVerseSelectFromGuidance} />;
                          case 'pageInsight':
                              return <PageInsight 
                                          settings={settings} 
                                          onBack={() => navigateTo('tadabbur')} 
                                          onSave={handlePageInsightSave} 
                                          onBookmarkUpdate={handleBookmarkUpdate}
                                          onUpdateSettings={handleSettingsUpdate}
                                      />;
                          case 'tadabbur':
                          default:
                              return (
                                  <Tadabbur 
                                      settings={settings} 
                                      onSettingsClick={() => setIsSettingsOpen(true)}
                                      onHistoryUpdate={handleHistoryUpdate}
                                      onNavigateToHistory={() => navigateTo('history')}
                                      onNavigateToFindGuidance={() => navigateTo('findGuidance')}
                                      onNavigateToPageInsight={() => navigateTo('pageInsight')}
                                      onCacheSummary={handleCacheSummary}
                                      onBookmarkUpdate={handleBookmarkUpdate}
                                      initialVerseKey={preloadVerseKey}
                                      onPreloadConsumed={onPreloadConsumed}
                                      onOpenUpdateLog={() => setIsUpdateLogOpen(true)}
                                      onOpenDisclaimerInfo={() => setIsDisclaimerInfoModalOpen(true)}
                                  />
                              );
                      }
                  })()}
                </div>
                
                <SettingsModal 
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    currentSettings={settings}
                    onUpdate={handleSettingsUpdate}
                    onOpenUpdateLog={() => setIsUpdateLogOpen(true)}
                    onOpenManageCategories={() => setIsManageCategoriesModalOpen(true)}
                    onOpenSupportModal={() => setIsSupportModalOpen(true)}
                />

                <ManageCategoriesModal
                    isOpen={isManageCategoriesModalOpen}
                    onClose={() => setIsManageCategoriesModalOpen(false)}
                    categories={settings.bookmarkCategories}
                    onUpdateCategories={(newCategories) => handleBookmarkUpdate({ bookmarks: settings.bookmarks, bookmarkCategories: newCategories })}
                />

                <SupportModal 
                    isOpen={isSupportModalOpen}
                    onClose={() => setIsSupportModalOpen(false)}
                />
                
                <WhatsNewModal 
                    isOpen={isWhatsNewModalOpen}
                    onClose={handleCloseWhatsNew}
                />

                <DisclaimerInfoModal
                    isOpen={isDisclaimerInfoModalOpen}
                    onClose={() => setIsDisclaimerInfoModalOpen(false)}
                />

                <UpdateLog isOpen={isUpdateLogOpen} onClose={() => setIsUpdateLogOpen(false)} />
            </div>
        </I18nProvider>
    );
};

export default App;
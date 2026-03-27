/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { View, UserProfile } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './views/Dashboard';
import Courses from './views/Courses';
import Messages from './views/Messages';
import ReviewDecks from './views/ReviewDecks';
import CourseDetail from './views/CourseDetail';
import Login from './views/Login';
import Profile from './views/Profile';
import Calendar from './views/Calendar';
import Settings from './views/Settings';
import Community from './views/Community';
import SearchResults from './views/SearchResults';
import { auth, db, handleFirestoreError, OperationType, isQuotaExceeded } from './firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import { updateGlobalPresence } from './services/presenceService';
import { initializeCourseChats } from './services/chatService';
import { courses } from './data';
import { useStudy } from './contexts/StudyContext';
import { useTheme } from './contexts/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Focus, AlertCircle } from 'lucide-react';

// Removed local UserProfile interface as it is now in types.ts

export default function App() {
  const { isFocusMode, isStudyMode, toggleFocusMode } = useStudy();
  const { isDarkMode } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [viewHistory, setViewHistory] = useState<{ view: View; id?: string }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(undefined);
  const [selectedDeckId, setSelectedDeckId] = useState<string | undefined>(undefined);
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    // Clear quota flag on mount to allow retries in new sessions
    localStorage.removeItem('firestore_quota_exceeded');
    
    // Listen for custom events or check for errors in services
    const handleQuotaError = () => setQuotaExceeded(true);
    window.addEventListener('firestore-quota-exceeded', handleQuotaError);
    return () => window.removeEventListener('firestore-quota-exceeded', handleQuotaError);
  }, []);

  useEffect(() => {
    if (user && profile) {
      // Initial update
      updateGlobalPresence();
      
      // Heartbeat every 60 seconds
      const interval = setInterval(() => {
        updateGlobalPresence();
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [user, profile]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      
      if (user) {
        // Test connection
        const testConnection = async () => {
          try {
            await getDocFromServer(doc(db, 'test', 'connection'));
          } catch (error) {
            if (error instanceof Error && error.message.includes('the client is offline')) {
              console.error("Please check your Firebase configuration.");
            }
          }
        };
        testConnection();

        // Listen to profile changes in Firestore
        const userRef = doc(db, 'users', user.uid);
        const privateRef = doc(db, 'users', user.uid, 'private', 'data');

        let publicProfile: any = null;
        let privateProfile: any = null;

        const updateCombinedProfile = () => {
          if (publicProfile) {
            const newProfile = {
              ...publicProfile,
              email: privateProfile?.email || user.email || ''
            };
            
            // Avoid redundant updates if profile hasn't changed
            setProfile(prev => {
              if (prev && 
                  prev.displayName === newProfile.displayName && 
                  prev.photoURL === newProfile.photoURL && 
                  prev.email === newProfile.email &&
                  JSON.stringify(prev.bio) === JSON.stringify(newProfile.bio) &&
                  JSON.stringify(prev.interests) === JSON.stringify(newProfile.interests)) {
                return prev;
              }
              return newProfile;
            });
          }
        };

        unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            publicProfile = snapshot.data();
            updateCombinedProfile();
            
            // Initialize course chats as soon as profile is available
            initializeCourseChats(
              courses, 
              user.uid, 
              publicProfile.displayName || user.displayName || 'You', 
              publicProfile.photoURL || user.photoURL || ''
            );
          } else {
            // Create profile if it doesn't exist
            const newProfile = {
              uid: user.uid,
              displayName: user.displayName || '',
              displayNameLowercase: (user.displayName || '').toLowerCase(),
              photoURL: user.photoURL || '',
              updatedAt: serverTimestamp()
            };

            const privateData = {
              email: user.email || '',
              updatedAt: serverTimestamp()
            };

            if (isQuotaExceeded()) {
              setProfile({ ...newProfile, email: user.email || '' } as any);
              return;
            }

            Promise.all([
              setDoc(userRef, newProfile),
              setDoc(privateRef, privateData)
            ]).catch(e => {
              console.error("Error creating profile:", e);
              handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
            });
          }
        }, (error) => {
          console.error("Error listening to profile:", error);
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        });

        const unsubscribePrivate = onSnapshot(privateRef, (snapshot) => {
          if (snapshot.exists()) {
            privateProfile = snapshot.data();
            updateCombinedProfile();
          }
        }, (error) => {
          console.error("Error listening to private profile:", error);
          // Don't throw here to avoid breaking the app if private data is missing
        });

        // Add to cleanup
        const originalUnsubscribeProfile = unsubscribeProfile;
        unsubscribeProfile = () => {
          originalUnsubscribeProfile();
          unsubscribePrivate();
        };
      } else {
        setProfile(null);
        if (unsubscribeProfile) unsubscribeProfile();
      }
      
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const getTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'courses': return 'Courses';
      case 'messages': return 'Messages';
      case 'decks': return 'Review Decks';
      case 'course-detail': return 'Course Details';
      case 'calendar': return 'Academic Calendar';
      case 'profile': return 'My Profile';
      case 'settings': return 'Settings';
      case 'community': return 'Community';
      case 'search': return 'Search Results';
      default: return 'PNU CollaboratED';
    }
  };

  const handleCourseClick = (courseId: string) => {
    setViewHistory(prev => [...prev, { view: currentView, id: selectedCourseId || undefined }]);
    setSelectedCourseId(courseId);
    setCurrentView('course-detail');
  };

  const handleChatClick = (chatId: string) => {
    setViewHistory(prev => [...prev, { view: currentView, id: selectedCourseId || undefined }]);
    setSelectedChatId(chatId);
    setCurrentView('messages');
  };

  const handleReviewClick = (deckId?: string) => {
    setViewHistory(prev => [...prev, { view: currentView, id: selectedCourseId || undefined }]);
    setSelectedDeckId(deckId);
    setCurrentView('decks');
  };

  const handleProfileClick = (userId: string) => {
    setViewHistory(prev => [...prev, { view: currentView, id: selectedProfileId }]);
    setSelectedProfileId(userId);
    setCurrentView('profile');
  };

  const handleChatChange = useCallback((id: string | undefined) => {
    setSelectedChatId(id);
  }, []);

  const renderView = () => {
    return (
      <motion.div
        key={currentView + (selectedProfileId || '') + (selectedCourseId || '')}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="h-full"
      >
        {(() => {
          switch (currentView) {
            case 'dashboard': return <Dashboard user={user!} profile={profile} onCourseClick={handleCourseClick} onChatClick={handleChatClick} onViewAllCourses={() => handleNavigate('courses')} onViewCalendar={() => handleNavigate('calendar')} onNavigate={handleNavigate} />;
            case 'courses': return <Courses onCourseClick={handleCourseClick} onChatClick={handleChatClick} />;
            case 'messages': return (
              <Messages 
                user={user!} 
                profile={profile} 
                initialChatId={selectedChatId} 
                onChatChange={handleChatChange}
              />
            );
            case 'decks': return <ReviewDecks user={user!} initialDeckId={selectedDeckId} />;
            case 'course-detail': return <CourseDetail courseId={selectedCourseId} onBack={handleBack} onChatClick={handleChatClick} onReviewClick={handleReviewClick} />;
            case 'calendar': return <Calendar />;
            case 'profile': return <Profile user={user!} targetUserId={selectedProfileId} onChatClick={handleChatClick} />;
            case 'settings': return <Settings user={user!} profile={profile} onLogout={handleLogout} />;
            case 'community': return <Community currentUser={profile as UserProfile} onNavigate={handleNavigate} onChatClick={handleChatClick} />;
            case 'search': return <SearchResults onNavigate={(view: View, id?: string) => {
              if (view === 'course-detail' && id) {
                handleCourseClick(id);
              } else if (view === 'messages' && id) {
                handleChatClick(id);
              } else if (view === 'decks' && id) {
                handleReviewClick(id);
              } else if (view === 'profile' && id) {
                handleProfileClick(id);
              } else {
                handleNavigate(view);
              }
            }} />;
            default: return <Dashboard user={user!} profile={profile} onCourseClick={handleCourseClick} onChatClick={handleChatClick} onViewAllCourses={() => handleNavigate('courses')} onViewCalendar={() => handleNavigate('calendar')} onNavigate={handleNavigate} />;
          }
        })()}
      </motion.div>
    );
  };

  const handleNavigate = (view: View, id?: string) => {
    if (view !== currentView || id !== selectedProfileId) {
      setViewHistory(prev => [...prev, { view: currentView, id: selectedCourseId || selectedProfileId || undefined }]);
      setCurrentView(view);
      if (view === 'profile' && id) {
        setSelectedProfileId(id);
      } else if (view !== 'profile') {
        setSelectedProfileId(undefined);
      }
      
      if (view !== 'messages') {
        setSelectedChatId(undefined);
      }
      if (view !== 'decks') {
        setSelectedDeckId(undefined);
      }
    }
    setIsSidebarOpen(false);
  };

  const handleBack = () => {
    if (viewHistory.length > 0) {
      const lastState = viewHistory[viewHistory.length - 1];
      setViewHistory(prev => prev.slice(0, -1));
      setCurrentView(lastState.view);
      if (lastState.id) {
        setSelectedCourseId(lastState.id);
      }
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className={`flex h-screen font-sans text-slate-900 dark:text-slate-100 overflow-hidden relative transition-colors duration-700 ${
      isDarkMode ? 'dark bg-slate-950' : 'bg-slate-50'
    } ${
      isStudyMode ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
    }`}>
      {/* Study Mode Overlay/Glow */}
      <AnimatePresence>
        {isStudyMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-0"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.05) 0%, transparent 70%)'
            }}
          />
        )}
      </AnimatePresence>

      {/* Quota Exceeded Alert */}
      <AnimatePresence>
        {quotaExceeded && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
          >
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl shadow-xl flex items-start gap-3">
              <div className="bg-amber-100 dark:bg-amber-800 p-2 rounded-xl text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100 mb-1">Firestore Quota Exceeded</h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  Your daily free tier write limit has been reached. Some features may be unavailable until the quota resets tomorrow.
                </p>
                <button 
                  onClick={() => setQuotaExceeded(false)}
                  className="mt-3 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar 
        currentView={currentView} 
        onNavigate={handleNavigate} 
        isOpen={isSidebarOpen && !isFocusMode} 
        onClose={() => setIsSidebarOpen(false)} 
        user={user}
        profile={profile}
      />
      
      <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-500 relative z-10 ${
        isFocusMode ? 'max-w-4xl mx-auto w-full' : ''
      }`}>
        <AnimatePresence>
          {!isFocusMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Header 
                title={getTitle()} 
                onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
                onProfileClick={() => handleNavigate('profile')}
                onNavigate={handleNavigate}
                onBack={handleBack}
                showBack={viewHistory.length > 0}
                user={user}
                profile={profile}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode Banners */}
        <div className="px-4 sm:px-8 pt-4 flex flex-wrap gap-2">
          <AnimatePresence>
            {isStudyMode && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full shadow-lg shadow-indigo-500/20 uppercase tracking-wider"
              >
                <Brain className="w-3 h-3" />
                Study Session Active
              </motion.div>
            )}
            {isFocusMode && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full shadow-lg shadow-emerald-500/20 uppercase tracking-wider"
              >
                <Focus className="w-3 h-3" />
                Focus Mode Enabled
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <main className={`flex-1 overflow-y-auto transition-all duration-500 ${
          isFocusMode ? 'p-4 sm:p-8' : 'bg-slate-50/50 dark:bg-slate-900/50'
        }`}>
          <AnimatePresence mode="wait">
            {renderView()}
          </AnimatePresence>
        </main>

        {/* Focus Mode Exit Button */}
        <AnimatePresence>
          {isFocusMode && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={toggleFocusMode}
              className="fixed bottom-8 right-8 p-4 bg-white shadow-2xl rounded-full border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all z-50 group"
              title="Exit Focus Mode"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest hidden group-hover:inline">Exit Focus</span>
                <Focus className="w-6 h-6" />
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

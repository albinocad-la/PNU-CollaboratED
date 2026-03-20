/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { View } from './types';
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
import { AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { updateGlobalPresence } from './services/presenceService';

interface UserProfile {
  displayName?: string;
  photoURL?: string;
  email?: string;
  ugNumber?: string;
  bio?: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [viewHistory, setViewHistory] = useState<{ view: View; id?: string }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (user) {
      // Initial update
      updateGlobalPresence();
      
      // Heartbeat every 30 seconds
      const interval = setInterval(() => {
        updateGlobalPresence();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      
      if (user) {
        // Listen to profile changes in Firestore
        const userRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(userRef, async (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          } else {
            // Create profile if it doesn't exist (ensures Google account is registered)
            const newProfile = {
              uid: user.uid,
              displayName: user.displayName || '',
              photoURL: user.photoURL || '',
              email: user.email || '',
              updatedAt: serverTimestamp()
            };
            try {
              await setDoc(userRef, newProfile);
              setProfile(newProfile as any);
            } catch (e) {
              console.error("Error creating profile:", e);
              // Fallback to auth data
              setProfile({
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                email: user.email || '',
              });
            }
          }
        }, (error) => {
          console.error("Error listening to profile:", error);
        });
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

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard key="dashboard" user={user!} profile={profile} onCourseClick={handleCourseClick} onChatClick={handleChatClick} onViewAllCourses={() => handleNavigate('courses')} onViewCalendar={() => handleNavigate('calendar')} />;
      case 'courses': return <Courses key="courses" onCourseClick={handleCourseClick} onChatClick={handleChatClick} />;
      case 'messages': return <Messages key="messages" user={user!} profile={profile} initialChatId={selectedChatId} />;
      case 'decks': return <ReviewDecks key="decks" user={user!} />;
      case 'course-detail': return <CourseDetail key="course-detail" courseId={selectedCourseId} onBack={handleBack} onChatClick={handleChatClick} />;
      case 'calendar': return <Calendar key="calendar" />;
      case 'profile': return <Profile key="profile" user={user!} />;
      default: return <Dashboard key="dashboard" user={user!} profile={profile} onCourseClick={handleCourseClick} onChatClick={handleChatClick} onViewAllCourses={() => handleNavigate('courses')} onViewCalendar={() => handleNavigate('calendar')} />;
    }
  };

  const handleNavigate = (view: View) => {
    if (view !== currentView) {
      setViewHistory(prev => [...prev, { view: currentView, id: selectedCourseId || undefined }]);
      setCurrentView(view);
      if (view !== 'messages') {
        setSelectedChatId(undefined);
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
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      <Sidebar 
        currentView={currentView} 
        onNavigate={handleNavigate} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        user={user}
        profile={profile}
      />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header 
          title={getTitle()} 
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
          onProfileClick={() => handleNavigate('profile')}
          onBack={handleBack}
          showBack={viewHistory.length > 0}
          user={user}
          profile={profile}
        />
        
        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          <AnimatePresence mode="wait">
            {renderView()}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

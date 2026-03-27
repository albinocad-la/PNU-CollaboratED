import { View } from '../types';
import { LayoutDashboard, BookOpen, Users, MessageSquare, Layers, Settings, LogOut, Calendar, Brain } from 'lucide-react';
import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import SlideButton from './SlideButton';
import { useStudy } from '../contexts/StudyContext';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
  user: User;
  profile: any;
}

export default function Sidebar({ currentView, onNavigate, isOpen, onClose, user, profile }: SidebarProps) {
  const { isFocusMode, isStudyMode, toggleFocusMode, toggleStudyMode } = useStudy();
  const navItems: { id: View; label: string; icon: ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-5 h-5" /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'community', label: 'Community', icon: <Users className="w-5 h-5" /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'decks', label: 'Review Decks', icon: <Layers className="w-5 h-5" /> },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const displayName = profile?.displayName || user.displayName || 'User';
  const photoURL = profile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${displayName}`;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

    <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-white dark:bg-slate-900 flex flex-col h-screen border-r border-slate-200 dark:border-slate-800
        transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      <div className="p-8 flex items-center gap-4 group cursor-pointer" onClick={() => onNavigate('dashboard')}>
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
          <Brain className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">CollaboratED</h1>
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">PNU Academic Hub</p>
        </div>
      </div>

      <div className="px-6 mb-8">
        <button 
          onClick={() => onNavigate('profile')}
          className={`w-full flex items-center gap-3 p-4 rounded-3xl border transition-all active:scale-95 ${
            currentView === 'profile' 
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20' 
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
          }`}
        >
          <img 
            src={photoURL} 
            alt={displayName} 
            className={`w-11 h-11 rounded-2xl object-cover border-2 ${
              currentView === 'profile' ? 'border-white/50' : 'border-white dark:border-slate-700 shadow-sm'
            }`}
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0 text-left">
            <p className={`text-sm font-black truncate ${currentView === 'profile' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{displayName}</p>
            <p className={`text-[10px] truncate uppercase tracking-widest font-bold ${currentView === 'profile' ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'}`}>Student</p>
          </div>
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-hide">
        <p className="px-4 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Main Menu</p>
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group relative active:scale-95 ${
                isActive 
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute left-0 w-1.5 h-6 bg-indigo-600 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <span className={`relative z-10 transition-transform group-hover:scale-110 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>{item.icon}</span>
              <span className="relative z-10 font-bold text-sm tracking-tight">{item.label}</span>
            </button>
          );
        })}
        
        <div className="pt-8">
          <p className="px-4 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Quick Actions</p>
          <div className="px-4 py-2 space-y-4">
            <SlideButton 
              label="Focus Mode" 
              activeColor="bg-emerald-500" 
              isActive={isFocusMode}
              onToggle={toggleFocusMode}
            />
            <SlideButton 
              label="Study Mode" 
              activeColor="bg-indigo-600" 
              isActive={isStudyMode}
              onToggle={toggleStudyMode}
            />
          </div>
        </div>
      </nav>

      <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <button 
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all active:scale-95 ${
            currentView === 'settings' 
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' 
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-bold text-sm">Settings</span>
        </button>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all text-rose-500 active:scale-95"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-bold text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
    </>
  );
}

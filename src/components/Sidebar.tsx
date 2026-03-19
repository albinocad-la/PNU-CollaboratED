import { View } from '../types';
import { LayoutDashboard, BookOpen, Users, MessageSquare, Layers, Settings, LogOut, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../firebase';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
  user: User;
  profile: any;
}

export default function Sidebar({ currentView, onNavigate, isOpen, onClose, user, profile }: SidebarProps) {
  const navItems: { id: View; label: string; icon: ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-5 h-5" /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen className="w-5 h-5" /> },
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
        w-64 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
          P
        </div>
        <span className="text-xl font-semibold text-white tracking-tight">PNU CollaboratED</span>
      </div>

      <div className="px-6 mb-6">
        <button 
          onClick={() => onNavigate('profile')}
          className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${
            currentView === 'profile' 
              ? 'bg-indigo-600 border-indigo-500 text-white' 
              : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-700'
          }`}
        >
          <img 
            src={photoURL} 
            alt={displayName} 
            className={`w-10 h-10 rounded-xl object-cover border ${
              currentView === 'profile' ? 'border-indigo-400' : 'border-slate-600'
            }`}
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0 text-left">
            <p className={`text-sm font-bold truncate ${currentView === 'profile' ? 'text-white' : 'text-white'}`}>{displayName}</p>
            <p className={`text-[10px] truncate uppercase tracking-wider font-semibold ${currentView === 'profile' ? 'text-indigo-200' : 'text-slate-400'}`}>Student</p>
          </div>
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors relative ${
                isActive ? 'text-white' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 bg-indigo-600 rounded-xl"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10">{item.icon}</span>
              <span className="relative z-10 font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-colors">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-colors text-red-400 hover:text-red-300"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
    </>
  );
}

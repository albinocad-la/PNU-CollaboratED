import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Settings as SettingsIcon, 
  User, 
  Lock, 
  Bell, 
  Moon, 
  Sun, 
  Shield, 
  UserX, 
  ChevronRight,
  LogOut,
  Globe,
  HelpCircle,
  CreditCard,
  Loader2,
  Check
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import SlideButton from '../components/SlideButton';
import { subscribeToBlockedUsers, unblockUser } from '../services/socialService';
import { SocialRelation } from '../types';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface SettingsProps {
  user: any;
  profile: any;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, profile, onLogout }) => {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [privacy, setPrivacy] = useState(true);
  const [activeSubSection, setActiveSubSection] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [blockedList, setBlockedList] = useState<SocialRelation[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || user?.displayName || '');

  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName);
    }
  }, [profile?.displayName]);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToBlockedUsers(user.uid, (blocked) => {
      setBlockedList(blocked);
      setLoadingBlocked(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleUnblock = async (targetUserId: string) => {
    try {
      await unblockUser(user.uid, targetUserId);
    } catch (error) {
      console.error('Error unblocking user:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user?.uid || !displayName.trim()) return;
    
    setUpdatingProfile(true);
    setUpdateSuccess(false);
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        displayNameLowercase: displayName.trim().toLowerCase(),
        updatedAt: serverTimestamp()
      });
      
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const faqs = [
    {
      question: 'How do I change my course?',
      answer: 'You can change your course by going to the Dashboard and clicking on the "Switch Course" button in the top navigation bar. Select your new subject from the list of available courses.'
    },
    {
      question: 'How to reset my progress?',
      answer: 'To reset your progress, go to Settings > Profile and scroll down to the "Danger Zone". Click on "Reset Progress" to clear all your study history and achievements.'
    },
    {
      question: 'Can I use the app offline?',
      answer: 'Yes! You can download flashcard sets for offline use. Look for the download icon on any deck. Your progress will sync automatically once you are back online.'
    },
    {
      question: 'How to invite friends?',
      answer: 'Go to your Profile page and click on "Invite Friends". You will get a unique referral link that you can share via social media or direct message.'
    }
  ];

  const renderSubSection = () => {
    switch (activeSubSection) {
      case 'blocked':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-2xl mx-auto"
          >
            <button 
              onClick={() => setActiveSubSection(null)}
              className="flex items-center gap-2 text-indigo-600 font-bold mb-6 hover:gap-3 transition-all"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              Back to Settings
            </button>
            
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Blocked Accounts</h2>
            <p className="text-slate-500 mb-8">Users you've blocked won't be able to message you or see your profile.</p>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              {loadingBlocked ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
                  <p className="text-slate-500">Loading blocked users...</p>
                </div>
              ) : blockedList.length > 0 ? (
                blockedList.map((u, idx) => (
                  <div key={u.uid} className={`flex items-center justify-between p-4 ${idx !== blockedList.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''}`}>
                    <div className="flex items-center gap-3">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt={u.displayName} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{u.displayName}</p>
                        <p className="text-xs text-slate-500">
                          Blocked on {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : 'recently'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleUnblock(u.uid)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <UserX className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500">No blocked users yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        );
      case 'profile':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-2xl mx-auto"
          >
            <button 
              onClick={() => setActiveSubSection(null)}
              className="flex items-center gap-2 text-indigo-600 font-bold mb-6 hover:gap-3 transition-all"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              Back to Settings
            </button>
            
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Profile Information</h2>
            <p className="text-slate-500 mb-8">Update your personal details and how others see you.</p>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
              <div className="flex flex-col items-center gap-4 mb-4">
                <img 
                  src={profile?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}`} 
                  alt="Avatar" 
                  className="w-24 h-24 rounded-full border-4 border-indigo-50 object-cover"
                />
                <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Change Avatar</button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Display Name</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Email Address</label>
                  <input 
                    type="email" 
                    disabled
                    defaultValue={profile?.email || user?.email}
                    className="w-full p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
              
              <button 
                onClick={handleUpdateProfile}
                disabled={updatingProfile || !displayName.trim()}
                className={`w-full py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                  updateSuccess 
                    ? 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-none' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {updatingProfile ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : updateSuccess ? (
                  <>
                    <Check className="w-5 h-5" />
                    Changes Saved!
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </motion.div>
        );
      case 'password':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-2xl mx-auto"
          >
            <button 
              onClick={() => setActiveSubSection(null)}
              className="flex items-center gap-2 text-indigo-600 font-bold mb-6 hover:gap-3 transition-all"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              Back to Settings
            </button>
            
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Password & Security</h2>
            <p className="text-slate-500 mb-8">Manage your password and account security settings.</p>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Current Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">New Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
              
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Two-factor authentication is currently <strong>disabled</strong>. We recommend enabling it for better security.
                  </p>
                </div>
              </div>
              
              <button className="w-full py-4 bg-slate-800 dark:bg-indigo-600 text-white rounded-2xl font-bold hover:bg-slate-900 dark:hover:bg-indigo-700 transition-colors">
                Update Password
              </button>
            </div>
          </motion.div>
        );
      case 'help':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-2xl mx-auto"
          >
            <button 
              onClick={() => setActiveSubSection(null)}
              className="flex items-center gap-2 text-indigo-600 font-bold mb-6 hover:gap-3 transition-all"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              Back to Settings
            </button>
            
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Help Center</h2>
            <p className="text-slate-500 mb-8">Find answers to common questions or contact support.</p>

            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div 
                  key={i} 
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <span className="font-bold text-slate-700 dark:text-slate-200">{faq.question}</span>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedQuestion === i ? 'rotate-90' : ''}`} />
                  </button>
                  
                  {expandedQuestion === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="px-4 pb-4"
                    >
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
              
              <div className="mt-8 p-6 bg-indigo-600 rounded-3xl text-white text-center">
                <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <h3 className="text-lg font-bold mb-1">Still need help?</h3>
                <p className="text-indigo-100 text-sm mb-4">Our support team is available 24/7.</p>
                <button className="px-6 py-2 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors">
                  Contact Support
                </button>
              </div>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  if (activeSubSection) {
    return renderSubSection();
  }

  const sections = [
    {
      title: 'Account',
      items: [
        { id: 'profile', icon: User, label: 'Profile Information', sub: 'Name, email, and avatar', color: 'text-blue-500', onClick: () => setActiveSubSection('profile') },
        { id: 'blocked', icon: UserX, label: 'Blocked Accounts', sub: 'Manage blocked users', color: 'text-rose-500', onClick: () => setActiveSubSection('blocked') },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { id: 'dark-mode', icon: isDarkMode ? Moon : Sun, label: 'Dark Mode', sub: isDarkMode ? 'Dark theme enabled' : 'Light theme enabled', type: 'toggle', value: isDarkMode, onToggle: toggleDarkMode, color: 'text-indigo-500' },
        { id: 'notifications', icon: Bell, label: 'Notifications', sub: 'Email and push alerts', type: 'toggle', value: notifications, onToggle: () => setNotifications(!notifications), color: 'text-amber-500' },
        { id: 'language', icon: Globe, label: 'Language', sub: 'English (US)', color: 'text-cyan-500', onClick: () => alert('Language selection coming soon!') },
      ]
    },
    {
      title: 'Security & Privacy',
      items: [
        { id: 'privacy', icon: Shield, label: 'Privacy Mode', sub: 'Hide your online status', type: 'toggle', value: privacy, onToggle: () => setPrivacy(!privacy), color: 'text-purple-500' },
        { id: 'password', icon: Lock, label: 'Password & Security', sub: '2FA and login history', color: 'text-slate-500', onClick: () => setActiveSubSection('password') },
      ]
    },
    {
      title: 'Support',
      items: [
        { id: 'help', icon: HelpCircle, label: 'Help Center', sub: 'FAQs and support', color: 'text-slate-400', onClick: () => setActiveSubSection('help') },
      ]
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto pb-12"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
          <SettingsIcon className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your account preferences and privacy.</p>
        </div>
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 ml-2">{section.title}</h2>
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              {section.items.map((item, idx) => (
                <div 
                  key={item.id}
                  onClick={item.onClick}
                  className={`flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                    idx !== section.items.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-900 ${item.color}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{item.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.sub}</p>
                    </div>
                  </div>
                  
                  {item.type === 'toggle' ? (
                    <SlideButton 
                      isActive={item.value!} 
                      onToggle={item.onToggle!} 
                      activeColor="bg-indigo-600"
                    />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-3xl font-bold hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors border border-rose-100 dark:border-rose-900/30"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </motion.div>
  );
};

export default Settings;

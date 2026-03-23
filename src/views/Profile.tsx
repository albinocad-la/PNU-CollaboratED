import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, Mail, Hash, FileText, Save, Camera, CheckCircle2, AlertCircle, Users, Heart, UserCheck } from 'lucide-react';
import SlideButton from '../components/SlideButton';
import { useStudy } from '../contexts/StudyContext';
import { UserProfile as UserProfileData } from '../types';

// ... (handleFirestoreError and other interfaces)

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, user: User) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      isAnonymous: user.isAnonymous,
      tenantId: user.tenantId,
      providerInfo: user.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ProfileProps {
  user: User;
  key?: string;
}

export default function Profile({ user }: ProfileProps) {
  const { isStudyMode, toggleStudyMode } = useStudy();
  const [profileData, setProfileData] = useState<UserProfileData>({
    uid: user.uid,
    displayName: user.displayName || '',
    email: user.email || '',
    photoURL: user.photoURL || '',
    ugNumber: '',
    bio: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [socialStats, setSocialStats] = useState({ friends: 0, following: 0, followers: 0 });
  const [studyStats, setStudyStats] = useState({ studyTime: 0, cardsReviewed: 0 });

  useEffect(() => {
    if (!user.uid) return;

    const unsubFriends = onSnapshot(collection(db, 'users', user.uid, 'friends'), (snap) => {
      setSocialStats(prev => ({ ...prev, friends: snap.size }));
    });
    const unsubFollowing = onSnapshot(collection(db, 'users', user.uid, 'following'), (snap) => {
      setSocialStats(prev => ({ ...prev, following: snap.size }));
    });
    const unsubFollowers = onSnapshot(collection(db, 'users', user.uid, 'followers'), (snap) => {
      setSocialStats(prev => ({ ...prev, followers: snap.size }));
    });

    const sessionsRef = collection(db, 'users', user.uid, 'sessions');
    const unsubSessions = onSnapshot(sessionsRef, (snap) => {
      let totalMinutes = 0;
      let totalCards = 0;
      snap.forEach(doc => {
        const data = doc.data();
        totalMinutes += data.durationMinutes || 0;
        totalCards += data.cardsReviewed || 0;
      });
      setStudyStats({ studyTime: totalMinutes, cardsReviewed: totalCards });
    });

    return () => {
      unsubFriends();
      unsubFollowing();
      unsubFollowers();
      unsubSessions();
    };
  }, [user.uid]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfileData(docSnap.data() as UserProfileData);
        } else {
          // If no profile exists, pre-fill with auth data
          setProfileData({
            uid: user.uid,
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
            ugNumber: '',
            bio: '',
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user.uid]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, {
        ...profileData,
        displayNameLowercase: profileData.displayName.toLowerCase(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      try {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`, user);
      } catch (e) {
        setMessage({ type: 'error', text: 'Failed to update profile. Please check permissions.' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-8 max-w-4xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white tracking-tight mb-2">My Profile</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">Manage your personal information and account settings.</p>
        </div>
        <SlideButton label="Study Mode" isActive={isStudyMode} onToggle={toggleStudyMode} />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="h-32 bg-indigo-600 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="relative group">
              <img 
                src={profileData.photoURL || `https://ui-avatars.com/api/?name=${profileData.displayName}`} 
                alt={profileData.displayName} 
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-white dark:border-slate-900 shadow-lg bg-white dark:bg-slate-800"
                referrerPolicy="no-referrer"
              />
              <button className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-16 pb-8 px-8">
          <div className="flex flex-wrap items-center gap-6 mb-8 px-2">
            <div className="text-center">
              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mb-1">
                <Users className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Friends</span>
              </div>
              <p className="text-xl font-black text-slate-800 dark:text-white">{socialStats.friends}</p>
            </div>
            <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
            <div className="text-center">
              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mb-1">
                <Heart className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Following</span>
              </div>
              <p className="text-xl font-black text-slate-800 dark:text-white">{socialStats.following}</p>
            </div>
            <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
            <div className="text-center">
              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mb-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Followers</span>
              </div>
              <p className="text-xl font-black text-slate-800 dark:text-white">{socialStats.followers}</p>
            </div>
            <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
            <div className="text-center">
              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Cards</span>
              </div>
              <p className="text-xl font-black text-slate-800 dark:text-white">{studyStats.cardsReviewed}</p>
            </div>
            <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
            <div className="text-center">
              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mb-1">
                <FileText className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Hours</span>
              </div>
              <p className="text-xl font-black text-slate-800 dark:text-white">{(studyStats.studyTime / 60).toFixed(1)}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Full Name
                </label>
                <input 
                  type="text" 
                  value={profileData.displayName}
                  onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all outline-none text-slate-800 dark:text-slate-200"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <input 
                  type="email" 
                  value={profileData.email}
                  disabled
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 dark:text-slate-500 cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Email cannot be changed as it is linked to your Google account.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  UG Number
                </label>
                <input 
                  type="text" 
                  value={profileData.ugNumber}
                  onChange={(e) => setProfileData({ ...profileData, ugNumber: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all outline-none text-slate-800 dark:text-slate-200"
                  placeholder="e.g. UG-2023-001"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Profile Picture URL
                </label>
                <input 
                  type="url" 
                  value={profileData.photoURL}
                  onChange={(e) => setProfileData({ ...profileData, photoURL: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all outline-none text-slate-800 dark:text-slate-200"
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Bio
              </label>
              <textarea 
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 transition-all outline-none text-slate-800 dark:text-slate-200 resize-none"
                placeholder="Tell us a little about yourself..."
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex-1 mr-4">
                <AnimatePresence>
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={`flex items-center gap-2 text-sm font-medium ${
                        message.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {message.text}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                type="submit"
                disabled={saving}
                className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-white transition-all active:scale-95 shadow-lg ${
                  saving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                }`}
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}

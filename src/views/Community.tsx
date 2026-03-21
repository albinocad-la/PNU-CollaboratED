import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  UserPlus, 
  UserMinus, 
  UserCheck, 
  Users, 
  Heart, 
  MessageCircle,
  MoreHorizontal,
  SearchX,
  UserCircle,
  UserX
} from 'lucide-react';
import { 
  searchUsers, 
  addFriend, 
  unfriend, 
  follow, 
  unfollow,
  blockUser,
  subscribeToFriends,
  subscribeToFollowing,
  subscribeToFollowers,
  subscribeToBlockedUsers
} from '../services/socialService';
import { UserProfile, SocialRelation } from '../types';

interface CommunityProps {
  currentUser: UserProfile;
}

const Community: React.FC<CommunityProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'search' | 'friends' | 'following' | 'followers'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [friends, setFriends] = useState<SocialRelation[]>([]);
  const [following, setFollowing] = useState<SocialRelation[]>([]);
  const [followers, setFollowers] = useState<SocialRelation[]>([]);
  const [blocked, setBlocked] = useState<SocialRelation[]>([]);

  useEffect(() => {
    if (!currentUser.uid) return;

    const unsubFriends = subscribeToFriends(currentUser.uid, setFriends);
    const unsubFollowing = subscribeToFollowing(currentUser.uid, setFollowing);
    const unsubFollowers = subscribeToFollowers(currentUser.uid, setFollowers);
    const unsubBlocked = subscribeToBlockedUsers(currentUser.uid, setBlocked);

    return () => {
      unsubFriends();
      unsubFollowing();
      unsubFollowers();
      unsubBlocked();
    };
  }, [currentUser.uid]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchUsers(searchTerm);
      // Filter out current user and blocked users
      setSearchResults(results.filter(u => 
        u.uid !== currentUser.uid && 
        !blocked.some(b => b.uid === u.uid)
      ));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const isFriend = (userId: string) => friends.some(f => f.uid === userId);
  const isFollowing = (userId: string) => following.some(f => f.uid === userId);
  const isBlocked = (userId: string) => blocked.some(b => b.uid === userId);

  const handleBlock = async (targetUser: UserProfile | SocialRelation) => {
    if (!window.confirm(`Are you sure you want to block ${targetUser.displayName}?`)) return;
    
    try {
      await blockUser(currentUser.uid, targetUser as UserProfile);
      // If we're in search results, we might want to refresh or remove the user
      setSearchResults(prev => prev.filter(u => u.uid !== targetUser.uid));
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  };

  const UserCard: React.FC<{ user: UserProfile | SocialRelation, type: 'search' | 'list' }> = ({ user, type }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between group hover:border-indigo-300 dark:hover:border-indigo-500 transition-all shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName} 
              className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <UserCircle className="w-8 h-8" />
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100">{user.displayName}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isFriend(user.uid) ? 'Friend' : isFollowing(user.uid) ? 'Following' : 'Student'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isFriend(user.uid) ? (
          <button
            onClick={() => unfriend(currentUser.uid, user.uid)}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
            title="Unfriend"
          >
            <UserMinus className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => addFriend(currentUser, user as UserProfile)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
            title="Add Friend"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        )}

        {isFollowing(user.uid) ? (
          <button
            onClick={() => unfollow(currentUser.uid, user.uid)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
          >
            Following
          </button>
        ) : (
          <button
            onClick={() => follow(currentUser, user as UserProfile)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none transition-all"
          >
            Follow
          </button>
        )}

        <button
          onClick={() => handleBlock(user)}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
          title="Block User"
        >
          <UserX className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Community</h1>
          <p className="text-slate-500 dark:text-slate-400">Connect with fellow students and share your progress.</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
          {[
            { id: 'search', label: 'Search', icon: Search },
            { id: 'friends', label: 'Friends', icon: Users },
            { id: 'following', label: 'Following', icon: Heart },
            { id: 'followers', label: 'Followers', icon: UserCheck }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.id !== 'search' && (
                <span className="ml-1 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 rounded-md text-[10px]">
                  {tab.id === 'friends' ? friends.length : tab.id === 'following' ? following.length : followers.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'search' && (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search students by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none transition-all shadow-sm text-slate-800 dark:text-slate-100"
              />
              <button 
                type="submit"
                disabled={isSearching || searchTerm.length < 2}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.length > 0 ? (
                searchResults.map(user => (
                  <UserCard key={user.uid} user={user} type="search" />
                ))
              ) : searchTerm && !isSearching ? (
                <div className="col-span-full py-12 text-center">
                  <SearchX className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400">No students found</h3>
                  <p className="text-slate-400">Try searching for a different name.</p>
                </div>
              ) : (
                <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400">Find your classmates</h3>
                  <p className="text-slate-400">Search for students to build your study network.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'friends' && (
          <motion.div
            key="friends"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {friends.length > 0 ? (
              friends.filter(f => !isBlocked(f.uid)).map(friend => (
                <UserCard key={friend.uid} user={friend} type="list" />
              ))
            ) : (
              <div className="col-span-full py-12 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400">No friends yet</h3>
                <p className="text-slate-400">Start adding friends to see them here.</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'following' && (
          <motion.div
            key="following"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {following.length > 0 ? (
              following.filter(f => !isBlocked(f.uid)).map(user => (
                <UserCard key={user.uid} user={user} type="list" />
              ))
            ) : (
              <div className="col-span-full py-12 text-center">
                <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400">Not following anyone</h3>
                <p className="text-slate-400">Follow students to keep up with their progress.</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'followers' && (
          <motion.div
            key="followers"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {followers.length > 0 ? (
              followers.filter(f => !isBlocked(f.uid)).map(user => (
                <UserCard key={user.uid} user={user} type="list" />
              ))
            ) : (
              <div className="col-span-full py-12 text-center">
                <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400">No followers yet</h3>
                <p className="text-slate-400">Build your profile to attract followers.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Community;

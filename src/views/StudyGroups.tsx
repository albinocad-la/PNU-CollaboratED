import React, { useState, useEffect } from 'react';
import { courses } from '../data';
import { Users, MessageCircle, Plus, Search, MoreVertical, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  StudyGroup, 
  subscribeToStudyGroups, 
  joinStudyGroup, 
  createStudyGroup 
} from '../services/studyGroupService';
import { useGroupOnlineStatus } from '../services/presenceService';
import { auth } from '../firebase';

interface StudyGroupsProps {
  onChatClick: (groupId: string) => void;
  key?: string;
}

function GroupStatus({ groupId, lastActive }: { groupId: string, lastActive: any }) {
  const { isOnline, activeCount } = useGroupOnlineStatus(groupId);
  
  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-300'}`}></span>
      {isOnline ? (
        <span className="text-emerald-600 font-bold">{activeCount} Online</span>
      ) : (
        <span>Active {formatTime(lastActive)}</span>
      )}
    </span>
  );
}

export default function StudyGroups({ onChatClick }: StudyGroupsProps) {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'my'>('all');
  
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCourse, setNewGroupCourse] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToStudyGroups((fetchedGroups) => {
      setGroups(fetchedGroups);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName || !newGroupCourse) return;

    setIsSubmitting(true);
    try {
      await createStudyGroup(newGroupName, newGroupCourse, newGroupDesc);
      setIsCreateModalOpen(false);
      setNewGroupName('');
      setNewGroupCourse('');
      setNewGroupDesc('');
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group. Please make sure you are signed in with a Google account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      await joinStudyGroup(groupId);
    } catch (error) {
      console.error('Error joining group:', error);
      alert('Failed to join group. Please make sure you are signed in with a Google account.');
    }
  };

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase());
    // For "my groups", we'd ideally check membership. For now, let's just show all or filter by creator
    const matchesFilter = filter === 'all' || group.createdBy === auth.currentUser?.uid;
    return matchesSearch && matchesFilter;
  });

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight mb-2">Study Groups</h2>
          <p className="text-slate-500 text-sm sm:text-base">Collaborate with peers using your Google account to study together.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Group
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for groups..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilter('all')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium transition-colors ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            Discover
          </button>
          <button 
            onClick={() => setFilter('my')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium transition-colors ${filter === 'my' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            My Groups
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-slate-500 font-medium">Loading study groups...</p>
        </div>
      ) : filteredGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map(group => {
            const course = courses.find(c => c.id === group.courseId);
            return (
              <div key={group.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group cursor-pointer relative">
                <div className={`h-20 ${course?.color || 'bg-slate-500'} relative`}>
                  <div className="absolute inset-0 bg-black/10"></div>
                  <button className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 relative">
                  <div className="absolute -top-10 left-6 w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
                    <Users className={`w-8 h-8 ${course?.color ? course.color.replace('bg-', 'text-') : 'text-slate-500'}`} />
                  </div>
                  
                  <div className="mt-8">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-md uppercase tracking-wider">
                        {course?.code || 'GENERAL'}
                      </span>
                      <GroupStatus groupId={group.id} lastActive={group.lastActive} />
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">
                      {group.name}
                    </h3>
                    
                    <p className="text-sm text-slate-500 mb-6 line-clamp-2">
                      {group.description || `A dedicated group for students taking ${course?.name || 'this course'} to discuss lectures and study together.`}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <Users className="w-4 h-4 text-slate-400" />
                        {group.memberCount || 0} Members
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onChatClick(group.id);
                          }}
                          className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors" 
                          title="Chat"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinGroup(group.id);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-20 text-center">
          <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">No groups found</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-8">
            {searchQuery ? `We couldn't find any groups matching "${searchQuery}".` : "Be the first to create a study group for your course!"}
          </p>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            Create a Group
          </button>
        </div>
      )}

      {/* Create Group Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Create Study Group</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Group Name</label>
                  <input 
                    type="text" 
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. UTS Midterm Prep"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Course</label>
                  <select 
                    required
                    value={newGroupCourse}
                    onChange={(e) => setNewGroupCourse(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none appearance-none"
                  >
                    <option value="">Select a course</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Description (Optional)</label>
                  <textarea 
                    rows={3}
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="What is this group about?"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none resize-none"
                  />
                </div>
                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Group'}
                  </button>
                </div>
                <p className="text-[10px] text-center text-slate-400 mt-4">
                  By creating a group, you agree that your Google profile information will be visible to other members.
                </p>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

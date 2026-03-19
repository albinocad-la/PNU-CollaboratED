import { Send, Paperclip, Smile, MoreVertical, Search, MessageCircle, Users as UsersIcon, Hash, ChevronLeft, Plus, Info, Image as ImageIcon, File as FileIcon, X, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useRef, useEffect } from 'react';
import { Message, Chat } from '../types';
import { User } from 'firebase/auth';
import { updateGroupPresence, useGroupOnlineStatus } from '../services/presenceService';
import { subscribeToChats, subscribeToMessages, sendMessage, getOrCreateDirectChat, searchUsers, initializeCourseChats, getAllCourseChats, joinChat, createGroupChat } from '../services/chatService';
import { courses } from '../data';

interface MessagesProps {
  user: User;
  profile: any;
  initialChatId?: string;
  key?: string;
}

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  onClick: () => void;
  userId: string;
  key?: string;
}

function ChatListItem({ chat, isActive, onClick, userId }: ChatListItemProps) {
  const { isOnline } = useGroupOnlineStatus(chat.id);
  
  return (
    <div 
      onClick={onClick}
      className={`p-3 sm:p-4 border-b border-slate-100 cursor-pointer transition-all relative ${
        isActive ? 'bg-indigo-50/80' : 'bg-white hover:bg-slate-50'
      }`}
    >
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r-full" />}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          {chat.type === 'course' ? (
            <div className={`w-12 h-12 rounded-2xl ${chat.color || 'bg-indigo-500'} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
              {chat.name.split(' ').map((w: string) => w[0]).join('').substring(0, 2)}
            </div>
          ) : chat.avatar ? (
            <img src={chat.avatar} alt={chat.name} className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-slate-200" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
              <UsersIcon className="w-6 h-6" />
            </div>
          )}
          {isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-white rounded-full bg-emerald-500 shadow-sm"></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-0.5">
            <h4 className={`font-bold truncate text-sm sm:text-base ${isActive ? 'text-indigo-900' : 'text-slate-800'}`}>
              {chat.name}
            </h4>
            <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
              {chat.lastActive ? (typeof chat.lastActive === 'string' ? chat.lastActive : 'Just now') : ''}
            </span>
          </div>
          <p className={`text-xs truncate ${isActive ? 'text-indigo-600 font-medium' : 'text-slate-500'}`}>
            {chat.lastMessage || (chat.type === 'course' ? 'Course Group' : 'Direct Message')}
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatHeader({ chat, onBack, onInfo }: { chat: Chat, onBack?: () => void, onInfo?: () => void }) {
  const { isOnline, activeCount } = useGroupOnlineStatus(chat.id);
  
  return (
    <div className="h-16 border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 bg-white shrink-0 z-10">
      <div className="flex items-center gap-2 sm:gap-3">
        {onBack && (
          <button onClick={onBack} className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <div className="relative">
          {chat.type === 'course' ? (
            <div className={`w-10 h-10 rounded-xl ${chat.color || 'bg-indigo-500'} flex items-center justify-center text-white font-bold text-sm`}>
              {chat.name.split(' ').map((w: string) => w[0]).join('').substring(0, 2)}
            </div>
          ) : chat.avatar ? (
            <img src={chat.avatar} alt={chat.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
              <UsersIcon className="w-5 h-5" />
            </div>
          )}
          {isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full bg-emerald-500"></div>
          )}
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">{chat.name}</h3>
          <p className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1">
            {isOnline ? (
              <>
                <span className="text-emerald-600 font-bold">Active now</span>
                {chat.type === 'course' && <span className="text-slate-300">•</span>}
                {chat.type === 'course' && <span>{activeCount} online</span>}
              </>
            ) : (
              <span>{chat.type === 'course' ? 'Course Group' : 'Offline'}</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 text-indigo-600">
        <button onClick={onInfo} className="p-2 hover:bg-indigo-50 rounded-full transition-colors"><Info className="w-5 h-5" /></button>
      </div>
    </div>
  );
}

export default function Messages({ user, profile, initialChatId }: MessagesProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>(initialChatId || '');
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(!!initialChatId);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showJoinGroups, setShowJoinGroups] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<any[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Chat[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const activeChat = chats.find(c => c.id === activeChatId);

  const displayName = profile?.displayName || user.displayName || 'You';
  const photoURL = profile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${displayName}`;

  // Initialize course chats and subscribe
  useEffect(() => {
    const init = async () => {
      await initializeCourseChats(courses);
    };
    init();

    const unsubscribe = subscribeToChats(user.uid, (data) => {
      setChats(data);
      if (!activeChatId && data.length > 0 && !initialChatId) {
        if (window.innerWidth >= 768) {
          setActiveChatId(data[0].id);
        }
      }
    });
    return () => unsubscribe();
  }, [user.uid]);

  // Fetch available groups to join
  useEffect(() => {
    if (showJoinGroups) {
      const fetchGroups = async () => {
        const allGroups = await getAllCourseChats();
        // Filter out groups the user is already in
        const userChatIds = chats.map(c => c.id);
        setAvailableGroups(allGroups.filter(g => !userChatIds.includes(g.id)));
      };
      fetchGroups();
    }
  }, [showJoinGroups, chats]);

  // Subscribe to messages
  useEffect(() => {
    if (!activeChatId) {
      setCurrentMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(activeChatId, (data) => {
      setCurrentMessages(data.map(m => ({
        ...m,
        isMe: m.senderId === user.uid
      })));
    });

    return () => unsubscribe();
  }, [activeChatId, user.uid]);

  // Presence tracking
  useEffect(() => {
    if (activeChatId) {
      updateGroupPresence(activeChatId);
      const interval = setInterval(() => updateGroupPresence(activeChatId), 30000);
      return () => clearInterval(interval);
    }
  }, [activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !activeChatId) return;

    const content = input.trim();
    setInput('');
    
    try {
      await sendMessage(activeChatId, user.uid, displayName, photoURL, content);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length > 1) {
      setIsSearching(true);
      const results = await searchUsers(val, user.uid);
      setSearchResults(results);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const startDirectChat = async (otherUser: any) => {
    try {
      const chatId = await getOrCreateDirectChat(
        user.uid, 
        otherUser.id, 
        otherUser.displayName, 
        otherUser.photoURL
      );
      setActiveChatId(chatId);
      setShowMobileChat(true);
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const handleJoinGroup = async (chatId: string) => {
    try {
      await joinChat(chatId, user.uid);
      setShowJoinGroups(false);
      setActiveChatId(chatId);
      setShowMobileChat(true);
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedParticipants.length === 0) return;
    
    try {
      const participantIds = selectedParticipants.map(p => p.id);
      const chatId = await createGroupChat(newGroupName, participantIds, user.uid);
      if (chatId) {
        setShowCreateGroup(false);
        setNewGroupName('');
        setSelectedParticipants([]);
        setActiveChatId(chatId);
        setShowMobileChat(true);
      }
    } catch (error) {
      console.error('Error creating group chat:', error);
    }
  };

  const toggleParticipant = (u: any) => {
    if (selectedParticipants.find(p => p.id === u.id)) {
      setSelectedParticipants(selectedParticipants.filter(p => p.id !== u.id));
    } else {
      setSelectedParticipants([...selectedParticipants, u]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;

    setUploading(true);
    
    // Simulate upload
    setTimeout(async () => {
      try {
        const mockUrl = type === 'image' 
          ? `https://picsum.photos/seed/${Date.now()}/800/600`
          : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
        
        await sendMessage(
          activeChatId, 
          user.uid, 
          displayName, 
          photoURL, 
          type === 'image' ? 'Sent an image' : `Sent a file: ${file.name}`,
          type,
          mockUrl,
          file.name
        );
      } catch (error) {
        console.error('Error uploading:', error);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (imageInputRef.current) imageInputRef.current.value = '';
      }
    }, 1500);
  };

  const selectChat = (id: string) => {
    setActiveChatId(id);
    setShowMobileChat(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] flex flex-col overflow-hidden"
    >
      <div className="flex-1 flex overflow-hidden bg-white">
        {/* Sidebar */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-white shrink-0 transition-transform duration-300 ${showMobileChat ? '-translate-x-full md:translate-x-0 hidden md:flex' : 'flex'}`}>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Chats</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowJoinGroups(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-100 transition-colors"
                >
                  <Compass className="w-4 h-4" />
                  Join Groups
                </button>
                <button 
                  onClick={() => setShowCreateGroup(true)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search Messenger"
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-full focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm placeholder-slate-500"
              />
              {searchQuery && (
                <button 
                  onClick={() => { setSearchQuery(''); setSearchResults([]); setIsSearching(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {isSearching ? (
              <div className="p-2 space-y-1">
                <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Search Results</p>
                {searchResults.length > 0 ? (
                  searchResults.map(u => (
                    <div 
                      key={u.id}
                      onClick={() => startDirectChat(u)}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                    >
                      <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-10 h-10 rounded-full object-cover border border-slate-100" referrerPolicy="no-referrer" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{u.displayName}</h4>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="px-4 py-4 text-sm text-slate-400 text-center">No users found</p>
                )}
              </div>
            ) : (
              chats.length > 0 ? (
                chats.map(chat => (
                  <ChatListItem 
                    key={chat.id} 
                    chat={chat} 
                    isActive={activeChatId === chat.id} 
                    onClick={() => selectChat(chat.id)} 
                    userId={user.uid}
                  />
                ))
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-sm">No chats yet. Join a course group or search for someone to start chatting!</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-white min-w-0 transition-transform duration-300 ${!showMobileChat ? 'translate-x-full md:translate-x-0 hidden md:flex' : 'flex'}`}>
          {activeChat ? (
            <>
              <ChatHeader 
                chat={activeChat} 
                onBack={() => setShowMobileChat(false)} 
              />

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 bg-white scrollbar-hide">
                <div className="flex flex-col items-center py-8 space-y-3">
                  <div className="relative">
                    {activeChat.type === 'course' ? (
                      <div className={`w-20 h-20 rounded-3xl ${activeChat.color || 'bg-indigo-500'} flex items-center justify-center text-white font-bold text-3xl shadow-lg`}>
                        {activeChat.name.split(' ').map((w: string) => w[0]).join('').substring(0, 2)}
                      </div>
                    ) : activeChat.avatar ? (
                      <img src={activeChat.avatar} alt={activeChat.name} className="w-20 h-20 rounded-3xl object-cover shadow-lg border-2 border-white" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 shadow-lg">
                        <UsersIcon className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-slate-800 text-lg">{activeChat.name}</h4>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">
                      {activeChat.type === 'course' ? 'Official Course Group' : 'Messenger'}
                    </p>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {currentMessages.map((msg, idx) => {
                    const isLastInGroup = idx === currentMessages.length - 1 || currentMessages[idx + 1].senderId !== msg.senderId;
                    
                    return (
                      <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`flex gap-2 ${msg.isMe ? 'flex-row-reverse' : ''} ${isLastInGroup ? 'mb-4' : 'mb-0.5'}`}
                      >
                        {!msg.isMe && isLastInGroup ? (
                          <img src={msg.senderAvatar} alt={msg.senderName} className="w-7 h-7 rounded-full object-cover self-end mb-1 border border-slate-100" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-7 shrink-0" />
                        )}
                        
                        <div className={`max-w-[75%] sm:max-w-[60%] flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                          {msg.type === 'image' ? (
                            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                              <img src={msg.fileUrl} alt="Sent image" className="max-w-full h-auto max-h-64 object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ) : msg.type === 'file' ? (
                            <a 
                              href={msg.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm border ${
                                msg.isMe 
                                  ? 'bg-indigo-600 text-white border-indigo-500' 
                                  : 'bg-slate-100 text-slate-800 border-slate-200'
                              }`}
                            >
                              <div className={`p-2 rounded-lg ${msg.isMe ? 'bg-white/20' : 'bg-white'}`}>
                                <FileIcon className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold truncate">{msg.fileName}</p>
                                <p className={`text-[10px] ${msg.isMe ? 'text-indigo-100' : 'text-slate-500'}`}>Click to open file</p>
                              </div>
                            </a>
                          ) : (
                            <div className={`px-4 py-2 rounded-2xl text-sm ${
                              msg.isMe 
                                ? 'bg-indigo-600 text-white rounded-tr-md' 
                                : 'bg-slate-100 text-slate-800 rounded-tl-md'
                            }`}>
                              {msg.content}
                            </div>
                          )}
                          {isLastInGroup && (
                            <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {uploading && (
                  <div className="flex justify-center py-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                      <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      Uploading file...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 sm:p-4 bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-indigo-600">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={(e) => handleFileUpload(e, 'file')} 
                    />
                    <input 
                      type="file" 
                      ref={imageInputRef} 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFileUpload(e, 'image')} 
                    />
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 hover:bg-indigo-50 rounded-full transition-colors"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => imageInputRef.current?.click()}
                      className="p-2 hover:bg-indigo-50 rounded-full transition-colors"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Aa"
                      className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-sm text-slate-800 placeholder-slate-500 py-1"
                    />
                    <button type="button" className="text-indigo-600 hover:text-indigo-700 transition-colors p-1">
                      <Smile className="w-5 h-5" />
                    </button>
                  </form>
                  
                  {input.trim() ? (
                    <button 
                      onClick={handleSendMessage}
                      className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  ) : (
                    <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                      <Smile className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 opacity-20" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Chat Selected</h3>
              <p className="text-sm text-slate-500">Search for a user or join a course group to start a conversation.</p>
            </div>
          )}
        </div>
      </div>

      {/* Join Groups Modal */}
      <AnimatePresence>
        {showJoinGroups && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowJoinGroups(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Join Course Groups</h3>
                  <p className="text-xs text-slate-500 font-medium">Find your classmates and start collaborating</p>
                </div>
                <button 
                  onClick={() => setShowJoinGroups(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {availableGroups.length > 0 ? (
                  availableGroups.map(group => (
                    <div 
                      key={group.id}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all group"
                    >
                      <div className={`w-12 h-12 rounded-2xl ${group.color || 'bg-indigo-500'} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
                        {group.name.split(' ').map((w: string) => w[0]).join('').substring(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 truncate">{group.name}</h4>
                        <p className="text-xs text-slate-500">Official Course Group</p>
                      </div>
                      <button 
                        onClick={() => handleJoinGroup(group.id)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-500/20"
                      >
                        Join
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <Compass className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">You've joined all available groups!</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateGroup(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">New Group Chat</h3>
                  <p className="text-xs text-slate-500 font-medium">Create a custom group with your friends</p>
                </div>
                <button 
                  onClick={() => setShowCreateGroup(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter group name..."
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add Participants</label>
                    <span className="text-[10px] font-bold text-indigo-600">{selectedParticipants.length} selected</span>
                  </div>
                  
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search users..."
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm"
                    />
                  </div>

                  {selectedParticipants.length > 0 && (
                    <div className="flex flex-wrap gap-2 py-2">
                      {selectedParticipants.map(p => (
                        <div key={p.id} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full text-[10px] font-bold">
                          <img src={p.photoURL} className="w-4 h-4 rounded-full" />
                          {p.displayName}
                          <button onClick={() => toggleParticipant(p)} className="hover:text-indigo-900">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
                    {searchResults.map(u => (
                      <div 
                        key={u.id}
                        onClick={() => toggleParticipant(u)}
                        className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors ${
                          selectedParticipants.find(p => p.id === u.id) ? 'bg-indigo-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <img src={u.photoURL} className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm truncate">{u.displayName}</h4>
                          <p className="text-xs text-slate-500 truncate">{u.email}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedParticipants.find(p => p.id === u.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'
                        }`}>
                          {selectedParticipants.find(p => p.id === u.id) && <Plus className="w-3 h-3 text-white rotate-45" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || selectedParticipants.length === 0}
                  className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                >
                  Create Group
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

import { Send, Paperclip, Smile, MoreVertical, Search, MessageCircle, Users as UsersIcon, Hash, ChevronLeft, Plus, Info, Image as ImageIcon, File as FileIcon, X, Compass, Pencil, Save, Trash2, Reply, AtSign, SearchX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, Chat } from '../types';
import { User } from 'firebase/auth';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import SlideButton from '../components/SlideButton';
import { useStudy } from '../contexts/StudyContext';
import { updateGroupPresence, useGroupOnlineStatus } from '../services/presenceService';
import { subscribeToChats, subscribeToMessages, sendMessage, getOrCreateDirectChat, searchUsers, initializeCourseChats, getAllCourseChats, joinChat, createGroupChat, getUserProfiles, updateChatNickname, updateChatAvatar, updateChatName, leaveChat, uploadFile, hideChat, deleteMessage, markAsRead, setTyping } from '../services/chatService';
import { courses } from '../data';

interface MessagesProps {
  user: User;
  profile: any;
  initialChatId?: string;
  onChatChange?: (id: string | undefined) => void;
  key?: string;
}

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  onClick: () => void;
  userId: string;
  key?: string;
}

interface EditModalState {
  show: boolean;
  title: string;
  label: string;
  value: string;
  placeholder: string;
  isSaving?: boolean;
  onSave: (val: string) => Promise<void> | void;
}

function ChatListItem({ chat, isActive, onClick, userId }: ChatListItemProps) {
  const { isOnline } = useGroupOnlineStatus(chat.id);
  
  // For direct chats, find the other participant's info
  let chatName = chat.name;
  let chatAvatar = chat.avatar;
  
  if (chat.type === 'direct' && chat.participantsInfo) {
    const otherId = chat.participants.find(id => id !== userId);
    if (otherId && chat.participantsInfo[otherId]) {
      chatName = chat.participantsInfo[otherId].displayName;
      chatAvatar = chat.participantsInfo[otherId].photoURL;
    }
  }

  const lastActiveDate = chat.lastActive && (typeof chat.lastActive === 'string' ? null : (chat.lastActive as any).toDate());
  const lastReadDate = chat.lastRead?.[userId] && (chat.lastRead[userId] as any).toDate();
  const isUnread = lastActiveDate && (!lastReadDate || lastReadDate < lastActiveDate);
  
  const typingUsers = chat.typing ? Object.entries(chat.typing)
    .filter(([id, isTyping]) => isTyping && id !== userId)
    .map(([id]) => chat.participantsInfo?.[id]?.displayName || 'Someone') : [];

  return (
    <div 
      onClick={onClick}
      className={`p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-all relative ${
        isActive ? 'bg-indigo-50/80 dark:bg-indigo-900/30' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r-full" />}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          {chat.type === 'course' ? (
            <div className={`w-12 h-12 rounded-2xl ${chat.color || 'bg-indigo-500'} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
              {chatName.split(' ').map((w: string) => w[0]).join('').substring(0, 2)}
            </div>
          ) : chatAvatar ? (
            <img src={chatAvatar} alt={chatName} className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-slate-200 dark:border-slate-700" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm">
              <UsersIcon className="w-6 h-6" />
            </div>
          )}
          {isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-white dark:border-slate-900 rounded-full bg-emerald-500 shadow-sm"></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-0.5">
            <h4 className={`font-bold truncate text-sm sm:text-base ${isActive ? 'text-indigo-900 dark:text-indigo-100' : isUnread ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
              {chatName}
            </h4>
            <span className={`text-[10px] font-medium shrink-0 ml-2 ${isUnread ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {chat.lastActive ? (typeof chat.lastActive === 'string' ? chat.lastActive : 'Just now') : ''}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs truncate flex-1 ${isUnread ? 'text-slate-900 dark:text-white font-bold' : isActive ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
              {typingUsers.length > 0 ? (
                <span className="text-indigo-600 dark:text-indigo-400 animate-pulse font-bold">
                  {typingUsers.length === 1 ? `${typingUsers[0]} is typing...` : `${typingUsers.length} people typing...`}
                </span>
              ) : (
                chat.lastMessage === 'Message unsent' ? (
                  <span className="italic text-slate-400 dark:text-slate-500">Message unsent</span>
                ) : (
                  chat.lastMessage || (chat.type === 'course' ? 'Course Group' : 'Direct Message')
                )
              )}
            </p>
            {isUnread && (
              <div className="w-2 h-2 bg-indigo-600 rounded-full shrink-0"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatHeader({ chat, onBack, onInfo, userId }: { chat: Chat, onBack?: () => void, onInfo?: () => void, userId: string }) {
  const { isOnline, activeCount } = useGroupOnlineStatus(chat.id);
  
  // For direct chats, find the other participant's info
  let chatName = chat.name;
  let chatAvatar = chat.avatar;
  
  if (chat.type === 'direct' && chat.participantsInfo) {
    const otherId = chat.participants.find(id => id !== userId);
    if (otherId && chat.participantsInfo[otherId]) {
      chatName = chat.participantsInfo[otherId].displayName;
      chatAvatar = chat.participantsInfo[otherId].photoURL;
    }
  }
  
  const typingUsers = chat.typing ? Object.entries(chat.typing)
    .filter(([id, isTyping]) => isTyping && id !== userId)
    .map(([id]) => chat.participantsInfo?.[id]?.displayName || 'Someone') : [];

  return (
    <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-slate-900 shrink-0 z-10">
      <div className="flex items-center gap-2 sm:gap-3">
        {onBack && (
          <button onClick={onBack} className="md:hidden p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <div className="relative">
          {chat.type === 'course' ? (
            <div className={`w-10 h-10 rounded-xl ${chat.color || 'bg-indigo-500'} flex items-center justify-center text-white font-bold text-sm`}>
              {chatName.split(' ').map((w: string) => w[0]).join('').substring(0, 2)}
            </div>
          ) : chatAvatar ? (
            <img src={chatAvatar} alt={chatName} className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <UsersIcon className="w-5 h-5" />
            </div>
          )}
          {isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white dark:border-slate-900 rounded-full bg-emerald-500"></div>
          )}
        </div>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base leading-tight">{chatName}</h3>
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            {typingUsers.length > 0 ? (
              <span className="text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">
                {typingUsers.length === 1 ? `${typingUsers[0]} is typing...` : `${typingUsers.length} people are typing...`}
              </span>
            ) : isOnline ? (
              <>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Active now</span>
                {chat.type === 'course' && <span className="text-slate-300 dark:text-slate-600">•</span>}
                {chat.type === 'course' && <span>{activeCount} online</span>}
              </>
            ) : (
              <span>{chat.type === 'course' ? 'Course Group' : 'Offline'}</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 text-indigo-600 dark:text-indigo-400">
        <button onClick={onInfo} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors"><Info className="w-5 h-5" /></button>
      </div>
    </div>
  );
}

export default function Messages({ user, profile, initialChatId, onChatChange }: MessagesProps) {
  const { isStudyMode, toggleStudyMode } = useStudy();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | undefined>(initialChatId);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(!!initialChatId);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState<any[]>([]);
  const [isGroupSearching, setIsGroupSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showJoinGroups, setShowJoinGroups] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [chatMembers, setChatMembers] = useState<any[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editModal, setEditModal] = useState<EditModalState>({
    show: false,
    title: '',
    label: '',
    value: '',
    placeholder: '',
    onSave: () => {}
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<any[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Chat[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeChatIdRef = useRef(activeChatId);
  const initialChatIdRef = useRef(initialChatId);
  const onChatChangeRef = useRef(onChatChange);

  // Keep refs in sync
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    initialChatIdRef.current = initialChatId;
  }, [initialChatId]);

  useEffect(() => {
    onChatChangeRef.current = onChatChange;
  }, [onChatChange]);

  // Notify parent of chat change
  useEffect(() => {
    if (onChatChangeRef.current && activeChatId !== initialChatId) {
      onChatChangeRef.current(activeChatId);
    }
  }, [activeChatId, initialChatId]);

  const activeChat = chats.find(c => c.id === activeChatId);

  const displayName = profile?.displayName || user.displayName || 'You';
  const photoURL = profile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${displayName}`;

  // Subscribe to chats
  useEffect(() => {
    const unsubscribe = subscribeToChats(user.uid, (data) => {
      setChats(data);
      // Use ref to avoid stale closure issues and unnecessary resubscriptions
      if (activeChatIdRef.current === undefined && data.length > 0 && initialChatIdRef.current === undefined) {
        if (window.innerWidth >= 768) {
          setActiveChatId(data[0].id);
        }
      }
    });
    return () => unsubscribe();
  }, [user.uid]); // Removed initialChatId from dependencies

  useEffect(() => {
    if (initialChatId !== undefined && initialChatId !== activeChatId) {
      setActiveChatId(initialChatId);
      setShowMobileChat(true);
    }
  }, [initialChatId]);

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
      
      // Mark as read when new messages arrive and chat is active
      markAsRead(activeChatId, user.uid);
    });

    // Mark as read when chat is opened
    markAsRead(activeChatId, user.uid);

    return () => {
      unsubscribe();
      // Clear typing status on unmount or chat change
      if (activeChatId) {
        setTyping(activeChatId, user.uid, false);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [activeChatId, user.uid]);

  // Presence tracking
  useEffect(() => {
    if (activeChatId) {
      updateGroupPresence(activeChatId);
      const interval = setInterval(() => updateGroupPresence(activeChatId), 60000);
      return () => clearInterval(interval);
    }
  }, [activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const mentionRef = useRef<HTMLDivElement>(null);

  // Fetch chat members when active chat changes
  useEffect(() => {
    if (activeChat) {
      const fetchMembers = async () => {
        const profiles = await getUserProfiles(activeChat.participants);
        setChatMembers(profiles);
      };
      fetchMembers();
    } else {
      setChatMembers([]);
    }
  }, [activeChatId]);

  const onEmojiClick = (emojiObject: any) => {
    setInput(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleSendMessage = async (e?: React.FormEvent, contentOverride?: string) => {
    e?.preventDefault();
    const content = contentOverride || input.trim();
    if (!content || !activeChatId) return;

    const replyContext = replyingTo ? {
      id: replyingTo.id,
      senderName: replyingTo.senderName,
      content: replyingTo.content,
      type: replyingTo.type
    } : undefined;

    // Extract mentions (uids)
    const mentions: string[] = [];
    chatMembers.forEach(member => {
      const nickname = activeChat?.nicknames?.[member.id];
      const mentionText = nickname || member.displayName;
      if (!mentionText) return;
      
      // Escape special characters for regex
      const escapedMention = mentionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`@${escapedMention}(\\s|$)`, 'i');
      if (regex.test(content)) {
        mentions.push(member.id);
      }
    });

    try {
      await sendMessage(
        activeChatId, 
        user.uid, 
        displayName, 
        photoURL, 
        content, 
        'text', 
        undefined, 
        undefined, 
        replyContext,
        mentions.length > 0 ? mentions : undefined
      );
      
      // Clear input only on success
      setInput('');
      setShowEmojiPicker(false);
      setReplyingTo(null);
      setShowMentionList(false);
      
      // Clear typing status
      if (activeChatId) {
        setTyping(activeChatId, user.uid, false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeChatId) return;
    try {
      const { deleteMessage } = await import('../services/chatService');
      await deleteMessage(activeChatId, messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleReplyTo = (message: Message) => {
    setReplyingTo(message);
    setShowEmojiPicker(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    // Handle typing status
    if (activeChatId) {
      if (!activeChat?.typing?.[user.uid]) {
        setTyping(activeChatId, user.uid, true);
      }
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(activeChatId, user.uid, false);
      }, 3000);
    }

    // Mention detection
    const cursorPosition = e.target.selectionStart;
    if (cursorPosition === null) return;
    
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const searchPart = textBeforeCursor.substring(lastAtSymbol + 1);
      // Check if there's a space between @ and cursor
      if (!searchPart.includes(' ')) {
        setMentionSearch(searchPart);
        setShowMentionList(true);
        
        const filtered = chatMembers.filter(member => {
          const nickname = activeChat?.nicknames?.[member.id];
          const matchesDisplayName = member.displayName?.toLowerCase().includes(searchPart.toLowerCase());
          const matchesNickname = nickname?.toLowerCase().includes(searchPart.toLowerCase());
          return (matchesDisplayName || matchesNickname) && member.id !== user?.uid;
        });
        setMentionResults(filtered);
        setMentionIndex(0);
        return;
      }
    }
    
    setShowMentionList(false);
  };

  const insertMention = (member: any) => {
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = input.substring(0, cursorPosition);
    const textAfterCursor = input.substring(cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const mentionName = activeChat?.nicknames?.[member.id] || member.displayName;
      const newText = input.substring(0, lastAtSymbol) + `@${mentionName} ` + textAfterCursor;
      setInput(newText);
      setShowMentionList(false);
      // Focus back to input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newCursorPos = lastAtSymbol + mentionName.length + 2;
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentionList && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % mentionResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + mentionResults.length) % mentionResults.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionResults[mentionIndex]);
      } else if (e.key === 'Escape') {
        setShowMentionList(false);
      }
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

  const handleGroupSearch = async (val: string) => {
    setGroupSearchQuery(val);
    if (val.trim().length > 1) {
      setIsGroupSearching(true);
      const results = await searchUsers(val, user.uid);
      setGroupSearchResults(results);
    } else {
      setGroupSearchResults([]);
      setIsGroupSearching(false);
    }
  };

  const startDirectChat = async (otherUser: any) => {
    try {
      const chatId = await getOrCreateDirectChat(
        user.uid, 
        profile?.displayName || user.displayName || 'User',
        profile?.photoURL || user.photoURL || '',
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
      const chatId = await createGroupChat(
        newGroupName, 
        selectedParticipants, 
        user.uid,
        profile?.displayName || user.displayName || 'User',
        profile?.photoURL || user.photoURL || ''
      );
      if (chatId) {
        setShowCreateGroup(false);
        setNewGroupName('');
        setSelectedParticipants([]);
        setGroupSearchQuery('');
        setGroupSearchResults([]);
        setIsGroupSearching(false);
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

    // Limit PDF files to 750KB as requested
    if (file.type === 'application/pdf' && file.size > 750 * 1024) {
      alert('PDF file size exceeds 750KB limit.');
      return;
    }

    setUploading(true);
    
    try {
      const fileUrl = await uploadFile(file);
      
      await sendMessage(
        activeChatId, 
        user.uid, 
        displayName, 
        photoURL, 
        type === 'image' ? 'Sent an image' : `Sent a file: ${file.name}`,
        type,
        fileUrl,
        file.name,
        replyingTo ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          content: replyingTo.content,
          type: replyingTo.type
        } : undefined
      );
      setReplyingTo(null);
    } catch (error) {
      console.error('Error uploading:', error);
      alert(error instanceof Error ? error.message : 'Error uploading file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const selectChat = async (id: string) => {
    setActiveChatId(id);
    setShowMobileChat(true);
    setShowChatInfo(false);
  };

  const handleUpdateNickname = async (memberId: string, nickname: string) => {
    if (!activeChatId) return;
    try {
      await updateChatNickname(activeChatId, memberId, nickname);
    } catch (error) {
      console.error('Error updating nickname:', error);
      alert('Failed to update nickname. Please try again.');
    }
  };

  const handleUpdateChatAvatar = async (url: string) => {
    if (!activeChatId) return;
    try {
      await updateChatAvatar(activeChatId, url);
    } catch (error) {
      console.error('Error updating avatar:', error);
      alert('Failed to update avatar. Please try again.');
    }
  };

  const handleUpdateChatName = async (name: string) => {
    if (!activeChatId) return;
    try {
      await updateChatName(activeChatId, name);
    } catch (error) {
      console.error('Error updating chat name:', error);
      alert('Failed to update chat name. Please try again.');
    }
  };

  const handleLeaveChat = async () => {
    if (!activeChatId) return;
    await leaveChat(activeChatId, user.uid);
    setActiveChatId(undefined);
    setShowMobileChat(false);
    setShowChatInfo(false);
    setShowLeaveConfirm(false);
  };

  const handleHideChat = async () => {
    if (!activeChatId) return;
    await hideChat(activeChatId, user.uid);
    setActiveChatId(undefined);
    setShowMobileChat(false);
    setShowChatInfo(false);
    setShowDeleteConfirm(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] flex flex-col overflow-hidden bg-white dark:bg-slate-900 transition-colors duration-300"
    >
      <div className="flex-1 flex overflow-hidden bg-white dark:bg-slate-900">
        {/* Sidebar */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 shrink-0 transition-transform duration-300 ${showMobileChat ? '-translate-x-full md:translate-x-0 hidden md:flex' : 'flex'}`}>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Messages</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowJoinGroups(true)}
                  className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl hover:bg-indigo-100 transition-all active:scale-95"
                  title="Join Groups"
                >
                  <Compass className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowCreateGroup(true)}
                  className="p-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl hover:scale-105 transition-all active:scale-95 shadow-lg"
                  title="Create Group"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search students or groups..."
                className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white dark:focus:bg-slate-800 rounded-2xl transition-all outline-none text-sm font-medium placeholder-slate-500 dark:text-white"
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

          <div className="flex-1 overflow-y-auto scrollbar-hide px-2 pb-4">
            {isSearching ? (
              <div className="space-y-1">
                <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Search Results</p>
                {searchResults.length > 0 ? (
                  searchResults.map(u => (
                    <div 
                      key={u.id}
                      onClick={() => startDirectChat(u)}
                      className="flex items-center gap-3 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-11 h-11 rounded-xl object-cover border-2 border-white dark:border-slate-800 shadow-sm" referrerPolicy="no-referrer" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{u.displayName}</h4>
                        <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider font-bold">Student</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <SearchX className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-bold">No students found</p>
                  </div>
                )}
              </div>
            ) : (
              chats.length > 0 ? (
                <div className="space-y-1">
                  {chats.map(chat => (
                    <ChatListItem 
                      key={chat.id} 
                      chat={chat} 
                      isActive={activeChatId === chat.id} 
                      onClick={() => selectChat(chat.id)} 
                      userId={user.uid}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">No chats yet</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Join a course group or search for classmates to start collaborating.</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0 transition-transform duration-300 ${!showMobileChat ? 'translate-x-full md:translate-x-0 hidden md:flex' : 'flex'}`}>
          {activeChat ? (
            <>
              <ChatHeader 
                chat={activeChat} 
                onBack={() => setShowMobileChat(false)} 
                onInfo={() => setShowChatInfo(!showChatInfo)}
                userId={user.uid}
              />

              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 bg-white dark:bg-slate-900 scrollbar-hide">
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
                    <h4 className="font-bold text-slate-800 dark:text-white text-lg">{activeChat.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold mt-1">
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
                        
                        <div className={`max-w-[75%] sm:max-w-[60%] flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} group/msg relative`}>
                          {!msg.isMe && isLastInGroup && (
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 px-1">
                              {activeChat.nicknames?.[msg.senderId] || msg.senderName}
                            </span>
                          )}

                          {/* Reply Context */}
                          {msg.replyTo && (
                            <div className={`mb-1 px-3 py-1.5 rounded-xl border-l-4 text-[10px] max-w-full truncate ${
                              msg.isMe ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-400 text-indigo-700 dark:text-indigo-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                            }`}>
                              <p className="font-bold mb-0.5">{msg.replyTo.senderName}</p>
                              <p className="truncate italic">
                                {msg.replyTo.type === 'image' ? '📷 Photo' : msg.replyTo.type === 'file' ? '📁 File' : msg.replyTo.content}
                              </p>
                            </div>
                          )}

                          <div className="relative group/actions">
                            {msg.isDeleted ? (
                              <div className="px-4 py-2 rounded-2xl text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 italic border border-slate-100 dark:border-slate-700">
                                Message unsent
                              </div>
                            ) : msg.type === 'image' ? (
                              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
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
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <div className={`p-2 rounded-lg ${msg.isMe ? 'bg-white/20' : 'bg-white dark:bg-slate-700'}`}>
                                  <FileIcon className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold truncate">{msg.fileName}</p>
                                  <p className={`text-[10px] ${msg.isMe ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>Click to open file</p>
                                </div>
                              </a>
                            ) : (
                              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all hover:shadow-md ${
                                msg.isMe 
                                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                                  : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                              }`}>
                                {msg.content.split(/(@\w+(?:\s\w+)*)/g).map((part, i) => {
                                  if (part.startsWith('@')) {
                                    return (
                                      <span key={i} className={`font-bold ${msg.isMe ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'} px-1 rounded`}>
                                        {part}
                                      </span>
                                    );
                                  }
                                  return part;
                                })}
                              </div>
                            )}

                            {/* Message Actions */}
                            {!msg.isDeleted && (
                              <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/actions:opacity-100 transition-opacity ${
                                msg.isMe ? 'right-full mr-2' : 'left-full ml-2'
                              }`}>
                                <button 
                                  onClick={() => handleReplyTo(msg)}
                                  className="p-1.5 bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-full text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                                  title="Reply"
                                >
                                  <Reply className="w-3 h-3" />
                                </button>
                                {msg.isMe && (
                                  <button 
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="p-1.5 bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-900/30 transition-all"
                                    title="Unsend"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          {isLastInGroup && (
                            <div className="flex items-center justify-between mt-1 px-1">
                              <span className="text-[9px] text-slate-400 dark:text-slate-500">{msg.timestamp}</span>
                              {msg.isMe && activeChat && (
                                <div className="flex -space-x-1">
                                  {Object.entries(activeChat.lastRead || {})
                                    .filter(([uid, time]) => {
                                      if (uid === user.uid) return false;
                                      const readTime = (time as any)?.toDate();
                                      const msgTime = msg.rawTimestamp?.toDate();
                                      return readTime && msgTime && readTime >= msgTime;
                                    })
                                    .map(([uid]) => (
                                      <img 
                                        key={uid}
                                        src={activeChat.participantsInfo?.[uid]?.photoURL || `https://ui-avatars.com/api/?name=${activeChat.participantsInfo?.[uid]?.displayName}`}
                                        className="w-3 h-3 rounded-full border border-white dark:border-slate-900 object-cover"
                                        title={`Seen by ${activeChat.participantsInfo?.[uid]?.displayName}`}
                                        referrerPolicy="no-referrer"
                                      />
                                    ))}
                                </div>
                              )}
                            </div>
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

                {/* Chat Info Sidebar */}
                <AnimatePresence>
                  {showChatInfo && (
                    <motion.div
                      initial={{ width: 0, opacity: 0, x: 20 }}
                      animate={{ width: '100%', opacity: 1, x: 0 }}
                      exit={{ width: 0, opacity: 0, x: 20 }}
                      className="fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-0 lg:w-80 lg:border-l border-slate-200 bg-white lg:bg-slate-50 overflow-y-auto"
                    >
                      <div className="p-6 space-y-8">
                        <div className="flex items-center justify-between lg:hidden mb-4">
                          <button 
                            onClick={() => setShowChatInfo(false)}
                            className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
                          >
                            <ChevronLeft className="w-6 h-6" />
                          </button>
                          <h3 className="font-bold text-slate-800">Chat Info</h3>
                          <div className="w-10" />
                        </div>

                        <div className="flex flex-col items-center text-center space-y-4">
                          <div className="relative group">
                            {activeChat.type === 'course' ? (
                              <div className={`w-24 h-24 rounded-3xl ${activeChat.color || 'bg-indigo-500'} flex items-center justify-center text-white font-bold text-4xl shadow-lg`}>
                                {activeChat.name.split(' ').map((w: string) => w[0]).join('').substring(0, 2)}
                              </div>
                            ) : activeChat.avatar ? (
                              <img src={activeChat.avatar} alt={activeChat.name} className="w-24 h-24 rounded-3xl object-cover shadow-lg border-4 border-white" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center text-slate-300 shadow-lg">
                                <UsersIcon className="w-12 h-12" />
                              </div>
                            )}
                            <button 
                              onClick={() => {
                                setEditModal({
                                  show: true,
                                  title: 'Group Avatar',
                                  label: 'Avatar URL',
                                  value: activeChat.avatar || '',
                                  placeholder: 'https://example.com/image.png',
                                  onSave: (url) => handleUpdateChatAvatar(url)
                                });
                              }}
                              className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="w-full px-4">
                            <div className="flex items-center justify-center gap-2 group/title">
                              <h3 className="font-black text-slate-800 text-xl tracking-tight truncate max-w-[200px]">{activeChat.name}</h3>
                              <button 
                                onClick={() => {
                                  setEditModal({
                                    show: true,
                                    title: 'Group Name',
                                    label: 'New Name',
                                    value: activeChat.name,
                                    placeholder: 'Enter group name...',
                                    onSave: (name) => handleUpdateChatName(name)
                                  });
                                }}
                                className="p-1 text-slate-400 hover:text-indigo-600 transition-colors lg:opacity-0 group-hover/title:opacity-100"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">
                              {activeChat.type === 'course' ? 'Official Course Group' : 'Group Chat'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between px-1">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Members</h4>
                            <span className="text-[10px] font-bold text-indigo-600">{activeChat.participants.length}</span>
                          </div>
                          <div className="space-y-3">
                            {chatMembers.map(member => (
                              <div key={member.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-colors group/member">
                                <img src={member.photoURL} className="w-8 h-8 rounded-full object-cover border border-slate-200" referrerPolicy="no-referrer" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p 
                                      className="text-sm font-bold text-slate-800 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                                      onClick={() => {
                                        setEditModal({
                                          show: true,
                                          title: 'Set Nickname',
                                          label: `Nickname for ${member.displayName}`,
                                          value: activeChat.nicknames?.[member.id] || '',
                                          placeholder: 'Enter nickname...',
                                          onSave: (nick) => handleUpdateNickname(member.id, nick)
                                        });
                                      }}
                                    >
                                      {activeChat.nicknames?.[member.id] || member.displayName}
                                    </p>
                                    <div className="flex items-center gap-1">
                                      {member.id !== user.uid && (
                                        <button 
                                          onClick={() => {
                                            const mentionName = activeChat.nicknames?.[member.id] || member.displayName;
                                            setInput(prev => prev + `@${mentionName} `);
                                            inputRef.current?.focus();
                                          }}
                                          className="p-1 text-slate-400 hover:text-indigo-600 transition-colors lg:opacity-0 group-hover/member:opacity-100"
                                          title="Mention"
                                        >
                                          <AtSign className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => {
                                          setEditModal({
                                            show: true,
                                            title: 'Set Nickname',
                                            label: `Nickname for ${member.displayName}`,
                                            value: activeChat.nicknames?.[member.id] || '',
                                            placeholder: 'Enter nickname...',
                                            onSave: (nick) => handleUpdateNickname(member.id, nick)
                                          });
                                        }}
                                        className="lg:opacity-0 group-hover/member:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-all"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  {activeChat.nicknames?.[member.id] && (
                                    <p className="text-[10px] text-slate-400 truncate">{member.displayName}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-8 border-t border-slate-200 space-y-3">
                          {showDeleteConfirm ? (
                            <div className="space-y-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                              <p className="text-xs font-bold text-red-800 text-center">Delete this conversation? It will be hidden from your inbox.</p>
                              <div className="flex gap-2">
                                <button 
                                  onClick={handleHideChat}
                                  className="flex-1 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors"
                                >
                                  Yes, Delete
                                </button>
                                <button 
                                  onClick={() => setShowDeleteConfirm(false)}
                                  className="flex-1 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setShowDeleteConfirm(true)}
                              className="w-full py-3 px-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Chat
                            </button>
                          )}

                          {activeChat.type !== 'direct' && (
                            showLeaveConfirm ? (
                              <div className="space-y-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                                <p className="text-xs font-bold text-orange-800 text-center">Are you sure you want to leave this group?</p>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={handleLeaveChat}
                                    className="flex-1 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors"
                                  >
                                    Yes, Leave
                                  </button>
                                  <button 
                                    onClick={() => setShowLeaveConfirm(false)}
                                    className="flex-1 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setShowLeaveConfirm(true)}
                                className="w-full py-3 px-4 bg-orange-50 text-orange-600 rounded-2xl text-sm font-bold hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
                              >
                                <X className="w-4 h-4" />
                                Leave Group
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              </div>

              <div className="p-3 sm:p-4 bg-white shrink-0 border-t border-slate-100">
                {/* Reply Preview */}
                <AnimatePresence>
                  {replyingTo && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mb-2 bg-slate-50 rounded-2xl p-3 flex items-start gap-3 border border-slate-100 relative overflow-hidden"
                    >
                      <div className="w-1 h-full bg-indigo-500 absolute left-0 top-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-0.5">Replying to {replyingTo.senderName}</p>
                        <p className="text-xs text-slate-600 truncate italic">
                          {replyingTo.type === 'image' ? '📷 Photo' : replyingTo.type === 'file' ? '📁 File' : replyingTo.content}
                        </p>
                      </div>
                      <button 
                        onClick={() => setReplyingTo(null)}
                        className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                      title="Upload File (PDF max 750KB)"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => imageInputRef.current?.click()}
                      className="p-2 hover:bg-indigo-50 rounded-full transition-colors"
                      title="Upload Image"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <div className="relative">
                      <button 
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-indigo-50'}`}
                      >
                        <Smile className="w-5 h-5" />
                      </button>
                      {showEmojiPicker && (
                        <div className="absolute bottom-full left-0 mb-2 z-50">
                          <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                          <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-slate-200">
                            <EmojiPicker 
                              onEmojiClick={onEmojiClick}
                              theme={Theme.LIGHT}
                              width={300}
                              height={400}
                              lazyLoadEmojis={true}
                              skinTonesDisabled={true}
                              searchDisabled={false}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all relative">
                    {showMentionList && mentionResults.length > 0 && (
                      <div 
                        ref={mentionRef}
                        className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
                      >
                        <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs font-medium text-slate-500">
                          Mention someone...
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {mentionResults.map((member, index) => {
                            const nickname = activeChat?.nicknames?.[member.id];
                            return (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => insertMention(member)}
                                className={`w-full flex items-center gap-3 p-2 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors ${
                                  index === mentionIndex ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                                }`}
                              >
                                <img 
                                  src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName || 'U')}&background=random`} 
                                  alt="" 
                                  className="w-8 h-8 rounded-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                    {nickname || member.displayName}
                                  </div>
                                  <div className="text-xs text-slate-500 truncate">
                                    {nickname ? `aka ${member.displayName}` : `@${member.displayName?.toLowerCase().replace(/\s+/g, '')}`}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Aa"
                      className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-sm text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 py-1"
                    />
                    {input.trim() ? (
                      <button 
                        type="submit"
                        className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => handleSendMessage(undefined, '👍')}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors text-xl"
                      >
                        👍
                      </button>
                    )}
                  </form>
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
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Join Course Groups</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Find your classmates and start collaborating</p>
                </div>
                <button 
                  onClick={() => setShowJoinGroups(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {availableGroups.length > 0 ? (
                  availableGroups.map(group => (
                    <div 
                      key={group.id}
                      className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
                    >
                      <div className={`w-12 h-12 rounded-2xl ${group.color || 'bg-indigo-500'} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
                        {group.name.split(' ').map((w: string) => w[0]).join('').substring(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 dark:text-white truncate">{group.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Official Course Group</p>
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
                    <Compass className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">You've joined all available groups!</p>
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
                      value={groupSearchQuery}
                      onChange={(e) => handleGroupSearch(e.target.value)}
                      placeholder="Search users..."
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm"
                    />
                  </div>

                  {selectedParticipants.length > 0 && (
                    <div className="flex flex-wrap gap-2 py-2">
                      {selectedParticipants.map(p => (
                        <div key={p.id} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full text-[10px] font-bold">
                          <img src={p.photoURL || `https://ui-avatars.com/api/?name=${p.displayName}`} className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" />
                          {p.displayName}
                          <button onClick={() => toggleParticipant(p)} className="hover:text-indigo-900">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
                    {groupSearchResults.map(u => (
                      <div 
                        key={u.id}
                        onClick={() => toggleParticipant(u)}
                        className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors ${
                          selectedParticipants.find(p => p.id === u.id) ? 'bg-indigo-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-10 h-10 rounded-full object-cover border border-slate-100" referrerPolicy="no-referrer" />
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
                    {isGroupSearching && groupSearchResults.length === 0 && (
                      <p className="text-center py-4 text-xs text-slate-400">No users found</p>
                    )}
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

      {/* Edit Modal */}
      <AnimatePresence>
        {editModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditModal({ ...editModal, show: false })}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6"
            >
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">{editModal.title}</h3>
                <p className="text-xs text-slate-500 font-medium">Update the information below</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{editModal.label}</label>
                <input
                  type="text"
                  autoFocus
                  disabled={isSavingEdit}
                  value={editModal.value}
                  onChange={(e) => setEditModal({ ...editModal, value: e.target.value })}
                  placeholder={editModal.placeholder}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm disabled:opacity-50"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && !isSavingEdit) {
                      setIsSavingEdit(true);
                      try {
                        await editModal.onSave(editModal.value);
                        setEditModal({ ...editModal, show: false });
                      } finally {
                        setIsSavingEdit(false);
                      }
                    }
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setEditModal({ ...editModal, show: false })}
                  disabled={isSavingEdit}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    setIsSavingEdit(true);
                    try {
                      await editModal.onSave(editModal.value);
                      setEditModal({ ...editModal, show: false });
                    } finally {
                      setIsSavingEdit(false);
                    }
                  }}
                  disabled={isSavingEdit}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingEdit ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

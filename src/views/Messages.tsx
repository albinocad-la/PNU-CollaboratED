import { messages as initialMessages, chats } from '../data';
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, Search, MessageCircle, Users as UsersIcon, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { User } from 'firebase/auth';
import { updateGroupPresence, useGroupOnlineStatus } from '../services/presenceService';

interface MessagesProps {
  user: User;
  profile: any;
  initialChatId?: string;
  key?: string;
}

interface ChatListItemProps {
  chat: any;
  isActive: boolean;
  onClick: () => void;
  key?: string;
}

function ChatListItem({ chat, isActive, onClick }: ChatListItemProps) {
  const { isOnline } = useGroupOnlineStatus(chat.id);
  
  return (
    <div 
      onClick={onClick}
      className={`p-4 border-b border-slate-100 cursor-pointer transition-all ${
        isActive ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'bg-white hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          {chat.type === 'course' ? (
            <div className={`w-12 h-12 rounded-2xl ${chat.color || 'bg-indigo-500'} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
              {chat.name.split(' ').map((w: string) => w[0]).join('').substring(0, 2)}
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
              <UsersIcon className="w-6 h-6" />
            </div>
          )}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-300'}`}></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-1">
            <h4 className={`font-semibold truncate ${isActive ? 'text-indigo-900' : 'text-slate-800'}`}>
              {chat.name}
            </h4>
          </div>
          <p className="text-xs text-slate-500 truncate font-medium">
            {chat.type === 'course' ? 'Course Group' : 'Study Group'} • {isOnline ? <span className="text-emerald-600 font-bold">Online</span> : chat.lastActive}
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatHeader({ chat }: { chat: any }) {
  const { isOnline, activeCount } = useGroupOnlineStatus(chat.id);
  
  return (
    <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0">
      <div className="flex items-center gap-3">
        {chat.type === 'course' ? (
          <div className={`w-10 h-10 rounded-xl ${chat.color || 'bg-indigo-500'} flex items-center justify-center text-white font-bold text-sm`}>
            {chat.name.split(' ').map((w: string) => w[0]).join('').substring(0, 2)}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            <UsersIcon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h3 className="font-bold text-slate-800 text-sm sm:text-base">{chat.name}</h3>
          <p className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-300'}`}></span>
            {isOnline ? (
              <span className="text-emerald-600 font-bold">{activeCount} Online</span>
            ) : (
              <span>{chat.type === 'course' ? 'Official Course Chat' : 'Study Group Chat'}</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 text-slate-400">
        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><Phone className="w-5 h-5" /></button>
        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><Video className="w-5 h-5" /></button>
        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><MoreVertical className="w-5 h-5" /></button>
      </div>
    </div>
  );
}

export default function Messages({ user, profile, initialChatId }: MessagesProps) {
  const [activeChatId, setActiveChatId] = useState<string>(initialChatId || chats[0]?.id || '');
  const [allMessages, setAllMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find(c => c.id === activeChatId);
  const currentMessages = allMessages.filter(m => m.chatId === activeChatId);

  const displayName = profile?.displayName || user.displayName || 'You';
  const photoURL = profile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${displayName}`;

  useEffect(() => {
    if (activeChatId) {
      // Initial update
      updateGroupPresence(activeChatId);
      
      // Heartbeat every 30 seconds
      const interval = setInterval(() => {
        updateGroupPresence(activeChatId);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [activeChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, activeChatId]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: `m${Date.now()}`,
      chatId: activeChatId,
      sender: displayName,
      avatar: photoURL,
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };

    setAllMessages(prev => [...prev, newMessage]);
    setInput('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 sm:p-8 max-w-7xl mx-auto h-[calc(100vh-5rem)] flex flex-col"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight mb-2">Messages</h2>
          <p className="text-slate-500 text-sm sm:text-base">Connect with your peers and study groups.</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-0">
        {/* Sidebar */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col bg-slate-50 h-64 md:h-auto shrink-0">
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search chats..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chats.map(chat => (
              <ChatListItem 
                key={chat.id} 
                chat={chat} 
                isActive={activeChatId === chat.id} 
                onClick={() => setActiveChatId(chat.id)} 
              />
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white min-h-0">
          {activeChat ? (
            <>
              {/* Chat Header */}
              <ChatHeader chat={activeChat} />

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-slate-50/50">
                <AnimatePresence initial={false}>
                  {currentMessages.length > 0 ? (
                    currentMessages.map((msg) => (
                      <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={`flex gap-3 sm:gap-4 max-w-[90%] sm:max-w-[80%] ${msg.isMe ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        <img src={msg.avatar} alt={msg.sender} className="w-8 h-8 rounded-full object-cover mt-1 border border-slate-200 shrink-0" referrerPolicy="no-referrer" />
                        <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-700">{msg.isMe ? 'You' : msg.sender}</span>
                            <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                          </div>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                            msg.isMe 
                              ? 'bg-indigo-600 text-white rounded-tr-sm' 
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                      <Hash className="w-12 h-12 opacity-20" />
                      <p className="text-sm font-medium">No messages yet. Start the conversation!</p>
                    </div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all">
                  <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Message ${activeChat.name}...`}
                    className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-sm text-slate-800 placeholder-slate-400 py-1"
                  />
                  <button type="button" className="hidden sm:block text-slate-400 hover:text-slate-600 transition-colors p-1">
                    <Smile className="w-5 h-5" />
                  </button>
                  <button 
                    type="submit"
                    className={`p-2 rounded-xl transition-all ${input.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md scale-105' : 'bg-slate-200 text-slate-400'}`}
                    disabled={!input.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
              <MessageCircle className="w-16 h-16 opacity-10 mb-4" />
              <p className="text-lg font-medium">Select a chat to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

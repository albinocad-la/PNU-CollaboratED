import React, { useMemo, useState, useEffect } from 'react';
import { Search, Book, MessageSquare, FileText, ArrowRight, User, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { courses, messages, chats, reviewDecks } from '../data';
import { useSearch } from '../contexts/SearchContext';
import { View, UserProfile } from '../types';
import { searchUsers } from '../services/socialService';

interface SearchResultsProps {
  onNavigate: (view: View, id?: string) => void;
  key?: string;
}

export default function SearchResults({ onNavigate }: SearchResultsProps) {
  const { searchQuery } = useSearch();
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearchingUsers(true);
        try {
          const results = await searchUsers(searchQuery);
          setUserResults(results);
        } catch (error) {
          console.error('Error searching users:', error);
        } finally {
          setIsSearchingUsers(false);
        }
      } else {
        setUserResults([]);
      }
    };

    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const results = useMemo(() => {
    if (!searchQuery.trim()) return { courses: [], messages: [], decks: [], chats: [] };

    const query = searchQuery.toLowerCase();

    const filteredCourses = courses.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.code.toLowerCase().includes(query)
    );

    const filteredMessages = messages.filter(m => 
      m.content.toLowerCase().includes(query) || 
      m.senderName.toLowerCase().includes(query)
    );

    const filteredDecks = reviewDecks.filter(d => 
      d.title.toLowerCase().includes(query)
    );

    const filteredChats = chats.filter(c => 
      c.name.toLowerCase().includes(query) || 
      (c.lastMessage && c.lastMessage.toLowerCase().includes(query))
    );

    return {
      courses: filteredCourses,
      messages: filteredMessages,
      decks: filteredDecks,
      chats: filteredChats
    };
  }, [searchQuery]);

  const hasResults = results.courses.length > 0 || 
                     results.messages.length > 0 || 
                     results.decks.length > 0 || 
                     results.chats.length > 0 ||
                     userResults.length > 0;

  if (!searchQuery.trim()) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Search className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">Type something to search...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Search Results for "{searchQuery}"
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Found {results.courses.length + results.messages.length + results.decks.length + results.chats.length + userResults.length} matches
        </p>
      </div>

      {!hasResults && !isSearchingUsers ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <Search className="w-16 h-16 mx-auto mb-4 text-slate-200 dark:text-slate-700" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">No results found</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Try searching for something else</p>
        </div>
      ) : (
        <div className="space-y-8 pb-20">
          {/* Courses */}
          {results.courses.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Book className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">Courses</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.courses.map(course => (
                  <motion.div
                    key={course.id}
                    whileHover={{ y: -2 }}
                    onClick={() => onNavigate('course-detail', course.id)}
                    className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${course.color} flex items-center justify-center text-white font-bold`}>
                          {course.code[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">{course.name}</h4>
                          <p className="text-xs text-slate-500">{course.code}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Students */}
          {(userResults.length > 0 || isSearchingUsers) && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">Students</h3>
              </div>
              {isSearchingUsers ? (
                <div className="flex items-center gap-3 p-4 text-slate-400">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Searching students...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userResults.map(user => (
                    <motion.div
                      key={user.uid}
                      whileHover={{ y: -2 }}
                      onClick={() => onNavigate('profile', user.uid)}
                      className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">{user.displayName}</h4>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                          {user.ugNumber && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                                {user.ugNumber}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Chats & Messages */}
          {(results.chats.length > 0 || results.messages.length > 0) && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">Messages & Chats</h3>
              </div>
              <div className="space-y-3">
                {results.chats.map(chat => (
                  <motion.div
                    key={chat.id}
                    whileHover={{ x: 4 }}
                    onClick={() => onNavigate('messages', chat.id)}
                    className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                      {chat.avatar ? (
                        <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors">{chat.name}</h4>
                      <p className="text-sm text-slate-500 truncate">{chat.lastMessage}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </motion.div>
                ))}
                {results.messages.map(message => (
                  <motion.div
                    key={message.id}
                    whileHover={{ x: 4 }}
                    onClick={() => onNavigate('messages', message.chatId)}
                    className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 transition-all cursor-pointer group flex items-center gap-4"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                      <img src={message.senderAvatar} alt={message.senderName} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{message.senderName}</span>
                        <span className="text-[10px] text-slate-400">{message.timestamp}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 italic truncate">"{message.content}"</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Flashcard Decks */}
          {results.decks.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">Review Decks</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.decks.map(deck => (
                  <motion.div
                    key={deck.id}
                    whileHover={{ y: -2 }}
                    onClick={() => onNavigate('decks', deck.id)}
                    className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-amber-600 transition-colors">{deck.title}</h4>
                        <p className="text-xs text-slate-500">{deck.cardsCount} cards • {deck.progress}% complete</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-amber-500 transition-colors" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

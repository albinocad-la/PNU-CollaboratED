import { Course, Assignment, Message, ReviewDeck, Flashcard, Chat } from './types';

export const courses: Course[] = [
  { 
    id: 'uts', 
    name: 'Understanding the Self', 
    code: 'GEC-UTS', 
    color: 'bg-blue-500',
    materials: []
  },
  { 
    id: 'rph', 
    name: 'Readings in Philippine History', 
    code: 'GEC-RPH', 
    color: 'bg-emerald-500',
    materials: []
  },
  { 
    id: 'tcw', 
    name: 'The Contemporary World', 
    code: 'GEC-TCW', 
    color: 'bg-amber-500',
    materials: []
  },
  { 
    id: 'mmw', 
    name: 'Mathematics in the Modern World', 
    code: 'GEC-MMW', 
    color: 'bg-purple-500',
    materials: []
  },
  { id: 'pc', name: 'Purposive Communication', code: 'GEC-PC', color: 'bg-rose-500', materials: [] },
  { id: 'sts', name: 'Science, Technology, and Society', code: 'GEC-STS', color: 'bg-cyan-500', materials: [] },
  { id: 'eth', name: 'Ethics', code: 'GEC-ETH', color: 'bg-indigo-500', materials: [] },
  { id: 'lwr', name: 'Life and Works of Rizal', code: 'GEC-LWR', color: 'bg-orange-500', materials: [] },
  { id: 'aa', name: 'Art Appreciation', code: 'GEC-AA', color: 'bg-teal-500', materials: [] },
];

export const assignments: Assignment[] = [];

export const messages: Message[] = [
  { id: 'm1', chatId: 'uts', senderId: 'u1', senderName: 'Alice', senderAvatar: 'https://i.pravatar.cc/150?u=alice', content: 'Has anyone finished the essay for Understanding the Self?', timestamp: '10:30 AM' },
  { id: 'm2', chatId: 'uts', senderId: 'u2', senderName: 'Bob', senderAvatar: 'https://i.pravatar.cc/150?u=bob', content: 'I\'m halfway through. The reflection part is quite deep.', timestamp: '10:32 AM' },
  { id: 'm3', chatId: 'uts', senderId: 'me', senderName: 'You', senderAvatar: 'https://i.pravatar.cc/150?u=me', content: 'I found a good resource for the psychological perspective if anyone needs it.', timestamp: '10:35 AM' },
  { id: 'm4', chatId: 'uts', senderId: 'u2', senderName: 'Bob', senderAvatar: 'https://i.pravatar.cc/150?u=bob', content: 'That would be great! Please share.', timestamp: '10:36 AM' },
  { id: 'm5', chatId: 'rph', senderId: 'u3', senderName: 'Charlie', senderAvatar: 'https://i.pravatar.cc/150?u=charlie', content: 'Don\'t forget our quiz on Philippine History tomorrow!', timestamp: '09:15 AM' },
  { id: 'm6', chatId: 'mmw', senderId: 'u4', senderName: 'Diana', senderAvatar: 'https://i.pravatar.cc/150?u=diana', content: 'Does anyone understand the Golden Ratio part?', timestamp: '02:45 PM' },
];

export const chats: Chat[] = [
  ...courses.map(course => ({
    id: course.id,
    name: course.name,
    type: 'course' as const,
    participants: [],
    lastMessage: 'Welcome to the ' + course.code + ' group chat!',
    lastActive: 'Just now',
    color: course.color
  })),
  {
    id: 'dm1',
    name: 'Alice Johnson',
    type: 'direct',
    participants: [],
    lastMessage: 'Hey, did you see the notes?',
    lastActive: '2m ago',
    avatar: 'https://i.pravatar.cc/150?u=alice'
  },
  {
    id: 'dm2',
    name: 'Bob Smith',
    type: 'direct',
    participants: [],
    lastMessage: 'Thanks for the help!',
    lastActive: '1h ago',
    avatar: 'https://i.pravatar.cc/150?u=bob'
  },
  {
    id: 'dm3',
    name: 'Charlie Davis',
    type: 'direct',
    participants: [],
    lastMessage: 'See you tomorrow!',
    lastActive: 'Yesterday',
    avatar: 'https://i.pravatar.cc/150?u=charlie'
  }
];

export const reviewDecks: ReviewDeck[] = [
  { id: 'd1', userId: 'system', title: 'UTS Midterm Review', courseId: 'uts', cardsCount: 45, lastReviewed: '2 days ago', progress: 60 },
  { id: 'd2', userId: 'system', title: 'RPH Key Dates', courseId: 'rph', cardsCount: 20, lastReviewed: 'Today', progress: 85 },
  { id: 'd3', userId: 'system', title: 'MMW Formulas', courseId: 'mmw', cardsCount: 35, lastReviewed: '1 week ago', progress: 20 },
];

export const flashcards: Flashcard[] = [
  { id: 'f1', deckId: 'd1', front: 'Who is the father of modern philosophy?', back: 'Rene Descartes', mastery: 60, isMastered: false },
  { id: 'f2', deckId: 'd1', front: 'What is the "Looking Glass Self"?', back: 'Charles Horton Cooley\'s concept that our self-image comes from how we think others see us.', mastery: 40, isMastered: false },
  { id: 'f3', deckId: 'd2', front: 'When was the Proclamation of Philippine Independence?', back: 'June 12, 1898', mastery: 100, isMastered: true },
  { id: 'f4', deckId: 'd3', front: 'What is the Fibonacci sequence?', back: 'A series of numbers where each number is the sum of the two preceding ones.', mastery: 20, isMastered: false },
];

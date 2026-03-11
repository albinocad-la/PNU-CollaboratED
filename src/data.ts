import { Course, Assignment, StudyGroup, Message, ReviewDeck, Flashcard, Chat } from './types';

export const courses: Course[] = [
  { id: 'uts', name: 'Understanding the Self', code: 'GEC-UTS', color: 'bg-blue-500' },
  { id: 'rph', name: 'Readings in Philippine History', code: 'GEC-RPH', color: 'bg-emerald-500' },
  { id: 'tcw', name: 'The Contemporary World', code: 'GEC-TCW', color: 'bg-amber-500' },
  { id: 'mmw', name: 'Mathematics in the Modern World', code: 'GEC-MMW', color: 'bg-purple-500' },
  { id: 'pc', name: 'Purposive Communication', code: 'GEC-PC', color: 'bg-rose-500' },
  { id: 'sts', name: 'Science, Technology, and Society', code: 'GEC-STS', color: 'bg-cyan-500' },
  { id: 'eth', name: 'Ethics', code: 'GEC-ETH', color: 'bg-indigo-500' },
  { id: 'lwr', name: 'Life and Works of Rizal', code: 'GEC-LWR', color: 'bg-orange-500' },
  { id: 'aa', name: 'Art Appreciation', code: 'GEC-AA', color: 'bg-teal-500' },
];

export const assignments: Assignment[] = [];

export const studyGroups: StudyGroup[] = [
  { id: 'g1', name: 'UTS Discussion Circle', courseId: 'uts', membersCount: 5, lastActive: '2 hours ago' },
  { id: 'g2', name: 'RPH History Buffs', courseId: 'rph', membersCount: 8, lastActive: '1 day ago' },
  { id: 'g3', name: 'MMW Problem Solvers', courseId: 'mmw', membersCount: 12, lastActive: '5 mins ago' },
  { id: 'g4', name: 'Art Enthusiasts', courseId: 'aa', membersCount: 6, lastActive: '1 hour ago' },
];

export const messages: Message[] = [
  { id: 'm1', chatId: 'uts', sender: 'Alice', avatar: 'https://i.pravatar.cc/150?u=alice', content: 'Has anyone finished the essay for Understanding the Self?', timestamp: '10:30 AM', isMe: false },
  { id: 'm2', chatId: 'uts', sender: 'Bob', avatar: 'https://i.pravatar.cc/150?u=bob', content: 'I\'m halfway through. The reflection part is quite deep.', timestamp: '10:32 AM', isMe: false },
  { id: 'm3', chatId: 'uts', sender: 'You', avatar: 'https://i.pravatar.cc/150?u=me', content: 'I found a good resource for the psychological perspective if anyone needs it.', timestamp: '10:35 AM', isMe: true },
  { id: 'm4', chatId: 'uts', sender: 'Bob', avatar: 'https://i.pravatar.cc/150?u=bob', content: 'That would be great! Please share.', timestamp: '10:36 AM', isMe: false },
  { id: 'm5', chatId: 'rph', sender: 'Charlie', avatar: 'https://i.pravatar.cc/150?u=charlie', content: 'Don\'t forget our quiz on Philippine History tomorrow!', timestamp: '09:15 AM', isMe: false },
  { id: 'm6', chatId: 'mmw', sender: 'Diana', avatar: 'https://i.pravatar.cc/150?u=diana', content: 'Does anyone understand the Golden Ratio part?', timestamp: '02:45 PM', isMe: false },
];

export const chats: Chat[] = [
  ...courses.map(course => ({
    id: course.id,
    name: course.name,
    type: 'course' as const,
    lastMessage: 'Welcome to the ' + course.code + ' group chat!',
    lastActive: 'Just now',
    color: course.color
  })),
  ...studyGroups.map(group => ({
    id: group.id,
    name: group.name,
    type: 'group' as const,
    lastMessage: 'Active discussion in progress...',
    lastActive: group.lastActive
  }))
];

export const reviewDecks: ReviewDeck[] = [
  { id: 'd1', title: 'UTS Midterm Review', courseId: 'uts', cardsCount: 45, lastReviewed: '2 days ago', progress: 60 },
  { id: 'd2', title: 'RPH Key Dates', courseId: 'rph', cardsCount: 20, lastReviewed: 'Today', progress: 85 },
  { id: 'd3', title: 'MMW Formulas', courseId: 'mmw', cardsCount: 35, lastReviewed: '1 week ago', progress: 20 },
];

export const flashcards: Flashcard[] = [
  { id: 'f1', deckId: 'd1', front: 'Who is the father of modern philosophy?', back: 'Rene Descartes' },
  { id: 'f2', deckId: 'd1', front: 'What is the "Looking Glass Self"?', back: 'Charles Horton Cooley\'s concept that our self-image comes from how we think others see us.' },
  { id: 'f3', deckId: 'd2', front: 'When was the Proclamation of Philippine Independence?', back: 'June 12, 1898' },
  { id: 'f4', deckId: 'd3', front: 'What is the Fibonacci sequence?', back: 'A series of numbers where each number is the sum of the two preceding ones.' },
];

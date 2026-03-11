export type View = 'dashboard' | 'courses' | 'groups' | 'messages' | 'decks' | 'course-detail' | 'profile' | 'calendar';

export interface Course {
  id: string;
  name: string;
  code: string;
  color: string;
}

export interface Assignment {
  id: string;
  title: string;
  courseId: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
}

export interface StudyGroup {
  id: string;
  name: string;
  courseId: string;
  membersCount: number;
  lastActive: string;
}

export interface Message {
  id: string;
  chatId: string;
  sender: string;
  avatar: string;
  content: string;
  timestamp: string;
  isMe: boolean;
}

export interface Chat {
  id: string;
  name: string;
  type: 'course' | 'group' | 'direct';
  lastMessage?: string;
  lastActive: string;
  avatar?: string;
  color?: string;
}

export interface ReviewDeck {
  id: string;
  title: string;
  courseId: string;
  cardsCount: number;
  lastReviewed: string;
  progress: number;
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
}

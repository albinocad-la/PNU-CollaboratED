export type View = 'dashboard' | 'courses' | 'messages' | 'decks' | 'course-detail' | 'profile' | 'calendar';

export interface LearningMaterial {
  id: string;
  courseId?: string;
  title: string;
  type: 'pdf' | 'study-guide' | 'video' | 'link';
  url: string;
  createdAt?: string;
  addedBy?: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  color: string;
  materials?: LearningMaterial[];
}

export interface Assignment {
  id: string;
  title: string;
  courseId: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  isMe?: boolean;
  type?: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
}

export interface Chat {
  id: string;
  name: string;
  type: 'course' | 'group' | 'direct';
  participants: string[];
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

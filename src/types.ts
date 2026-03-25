export type View = 'dashboard' | 'courses' | 'messages' | 'decks' | 'course-detail' | 'profile' | 'calendar' | 'settings' | 'community' | 'search';

export interface UserProfile {
  uid: string;
  displayName: string;
  displayNameLowercase?: string;
  email?: string;
  photoURL?: string;
  ugNumber?: string;
  bio?: string;
  lastSeen?: any;
  updatedAt?: any;
}

export interface SocialRelation {
  uid: string;
  displayName: string;
  photoURL?: string;
  createdAt: any;
}

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
  isDeleted?: boolean;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
    type?: 'text' | 'image' | 'file';
  };
}

export interface Chat {
  id: string;
  name: string;
  type: 'course' | 'group' | 'direct';
  participants: string[];
  participantsInfo?: { 
    [userId: string]: { 
      displayName: string; 
      photoURL: string; 
    } 
  };
  lastMessage?: string;
  lastActive: string;
  avatar?: string;
  color?: string;
  nicknames?: { [userId: string]: string };
  deletedBy?: string[];
}

export interface ReviewDeck {
  id: string;
  userId: string;
  title: string;
  courseId: string;
  cardsCount: number;
  lastReviewed: string;
  progress: number;
  createdAt?: any;
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  createdAt?: any;
}

export interface StudySession {
  id: string;
  userId: string;
  startTime: any;
  endTime: any;
  durationMinutes: number;
  cardsReviewed: number;
  createdAt: any;
}

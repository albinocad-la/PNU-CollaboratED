import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  getDocs,
  limit,
  Timestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Chat, Message } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const subscribeToChats = (userId: string, callback: (chats: Chat[]) => void) => {
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', userId),
    orderBy('lastActive', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Chat));
    callback(chats);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'chats');
  });
};

export const subscribeToMessages = (chatId: string, callback: (messages: Message[]) => void) => {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp instanceof Timestamp 
          ? data.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Just now'
      } as Message;
    });
    callback(messages);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
  });
};

export const sendMessage = async (
  chatId: string, 
  senderId: string, 
  senderName: string, 
  senderAvatar: string, 
  content: string,
  type: 'text' | 'image' | 'file' = 'text',
  fileUrl?: string,
  fileName?: string,
  replyTo?: Message['replyTo']
) => {
  const messageData: any = {
    chatId,
    senderId,
    senderName,
    senderAvatar,
    content,
    timestamp: serverTimestamp(),
    type,
    fileUrl,
    fileName
  };

  if (replyTo) {
    messageData.replyTo = replyTo;
  }

  try {
    await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
    
    // Update last message in chat
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: type === 'text' ? content : `Sent a ${type}`,
      lastActive: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}/messages`);
  }
};

export const getOrCreateDirectChat = async (user1Id: string, user1Name: string, user1Avatar: string, user2Id: string, user2Name: string, user2Avatar: string) => {
  try {
    // Check if direct chat already exists
    const q = query(
      collection(db, 'chats'),
      where('type', '==', 'direct'),
      where('participants', 'array-contains', user1Id)
    );

    const snapshot = await getDocs(q);
    const existingChat = snapshot.docs.find(doc => {
      const participants = doc.data().participants as string[];
      return participants.includes(user2Id);
    });

    if (existingChat) {
      return existingChat.id;
    }

    // Create new direct chat
    const newChatRef = await addDoc(collection(db, 'chats'), {
      name: user2Name, // Default name, will be overridden on client for user2
      type: 'direct',
      participants: [user1Id, user2Id],
      participantsInfo: {
        [user1Id]: { displayName: user1Name, photoURL: user1Avatar },
        [user2Id]: { displayName: user2Name, photoURL: user2Avatar }
      },
      lastMessage: 'Started a new conversation',
      lastActive: serverTimestamp(),
      avatar: user2Avatar // Default avatar
    });

    return newChatRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'chats');
    return ''; // Should not reach here
  }
};

export const searchUsers = async (searchTerm: string, currentUserId: string) => {
  if (!searchTerm.trim()) return [];
  
  try {
    const q = query(
      collection(db, 'users'),
      where('displayName', '>=', searchTerm),
      where('displayName', '<=', searchTerm + '\uf8ff'),
      limit(10)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => user.id !== currentUserId);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
};

export const initializeCourseChats = async (courses: any[]) => {
  for (const course of courses) {
    try {
      const chatRef = doc(db, 'chats', course.id);
      const chatSnap = await getDoc(chatRef);
      
      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          name: course.name,
          type: 'course',
          participants: [],
          lastMessage: `Welcome to the ${course.code} group chat!`,
          lastActive: serverTimestamp(),
          color: course.color,
          code: course.code
        });
      }
    } catch (error) {
      console.warn(`Failed to initialize course chat for ${course.id}:`, error);
    }
  }
};

export const getAllCourseChats = async () => {
  try {
    const q = query(collection(db, 'chats'), where('type', '==', 'course'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'chats');
    return [];
  }
};

export const uploadFile = async (file: File): Promise<string> => {
  // If file is small enough (< 800KB to be safe with base64 overhead in 1MB Firestore doc), use data URL
  if (file.size < 800 * 1024) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  // For larger files, use a public temporary file upload service
  // Note: This is a fallback since we don't have Firebase Storage provisioned
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Using tmpfiles.org as a public temporary storage
    const response = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Upload failed');
    
    const data = await response.json();
    // The API returns a URL like https://tmpfiles.org/12345/filename
    // We need the direct link which is usually https://tmpfiles.org/dl/12345/filename
    const url = data.data.url;
    return url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
  } catch (error) {
    console.error('Error uploading to public service:', error);
    // Fallback to data URL even if it might fail Firestore limit, 
    // or throw error if we want to be strict
    throw new Error('File too large for Firestore and public upload failed');
  }
};

export const joinChat = async (chatId: string, userId: string) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (chatSnap.exists()) {
      const participants = chatSnap.data().participants || [];
      if (!participants.includes(userId)) {
        await updateDoc(chatRef, {
          participants: [...participants, userId]
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`);
  }
};

export const createGroupChat = async (name: string, participants: { id: string, displayName: string, photoURL: string }[], creatorId: string, creatorName: string, creatorAvatar: string) => {
  try {
    const participantsInfo: { [userId: string]: { displayName: string, photoURL: string } } = {
      [creatorId]: { displayName: creatorName, photoURL: creatorAvatar }
    };
    
    participants.forEach(p => {
      participantsInfo[p.id] = { displayName: p.displayName, photoURL: p.photoURL };
    });

    const chatData = {
      name,
      type: 'group',
      participants: [creatorId, ...participants.map(p => p.id)],
      participantsInfo,
      lastMessage: 'Created a new group chat',
      lastActive: serverTimestamp(),
      color: 'bg-indigo-500' // Default color for custom groups
    };

    const docRef = await addDoc(collection(db, 'chats'), chatData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'chats');
    return '';
  }
};

export const getUserProfiles = async (uids: string[]) => {
  if (uids.length === 0) return [];
  
  try {
    // Firestore 'in' query supports up to 30 elements
    const results = [];
    for (let i = 0; i < uids.length; i += 30) {
      const chunk = uids.slice(i, i + 30);
      const q = query(collection(db, 'users'), where('__name__', 'in', chunk));
      const snapshot = await getDocs(q);
      results.push(...snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
};

export const updateChatNickname = async (chatId: string, userId: string, nickname: string) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      [`nicknames.${userId}`]: nickname
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`);
  }
};

export const updateChatAvatar = async (chatId: string, avatarUrl: string) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      avatar: avatarUrl
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`);
  }
};

export const updateChatName = async (chatId: string, name: string) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      name
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`);
  }
};

export const deleteMessage = async (chatId: string, messageId: string) => {
  try {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    await updateDoc(messageRef, {
      content: 'Message unsent',
      isDeleted: true,
      fileUrl: null,
      fileName: null
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}/messages/${messageId}`);
  }
};

export const leaveChat = async (chatId: string, userId: string) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (chatSnap.exists()) {
      const participants = chatSnap.data().participants || [];
      const newParticipants = participants.filter((id: string) => id !== userId);
      
      if (newParticipants.length === 0) {
        // If no participants left, maybe delete the chat? 
        // For now, just remove the user.
        await updateDoc(chatRef, {
          participants: []
        });
      } else {
        await updateDoc(chatRef, {
          participants: newParticipants
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`);
  }
};

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
  getDoc,
  arrayUnion
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, isQuotaExceeded } from '../firebase';
import { Chat, Message } from '../types';
import imageCompression from 'browser-image-compression';

export const subscribeToChats = (userId: string, callback: (chats: Chat[]) => void) => {
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', userId),
    orderBy('lastActive', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Chat))
      .filter(chat => !chat.deletedBy?.includes(userId));
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
        rawTimestamp: data.timestamp,
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
  senderAvatar: string | null | undefined, 
  content: string,
  type: 'text' | 'image' | 'file' = 'text',
  fileUrl?: string | null,
  fileName?: string | null,
  replyTo?: Message['replyTo'],
  mentions?: string[]
) => {
  const messageData: any = {
    chatId,
    senderId,
    senderName: senderName || 'Anonymous',
    senderAvatar: senderAvatar || '',
    content: content || '',
    timestamp: serverTimestamp(),
    type,
  };

  if (fileUrl) messageData.fileUrl = fileUrl;
  if (fileName) messageData.fileName = fileName;
  if (mentions && mentions.length > 0) messageData.mentions = mentions;

  if (replyTo) {
    messageData.replyTo = replyTo;
  }

  // Check if quota was previously exceeded
  if (isQuotaExceeded()) {
    throw new Error('Firestore quota exceeded. Please try again later.');
  }

  try {
    await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
    
    // Update last message in chat and clear deletedBy so it reappears for everyone
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: type === 'text' ? content : `Sent a ${type}`,
      lastActive: serverTimestamp(),
      deletedBy: [] // Clear deletedBy so the chat reappears for users who "deleted" it
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

    // Check if quota was previously exceeded
    if (isQuotaExceeded()) {
      throw new Error('Firestore quota exceeded. Please try again later.');
    }

    // Create new direct chat
    const newChatRef = await addDoc(collection(db, 'chats'), {
      name: user2Name, // Default name, will be overridden on client for user2
      type: 'direct',
      participants: [user1Id, user2Id],
      participantsInfo: {
        [user1Id]: { displayName: user1Name, photoURL: user1Avatar || "" },
        [user2Id]: { displayName: user2Name, photoURL: user2Avatar || "" }
      },
      lastMessage: 'Started a new conversation',
      lastActive: serverTimestamp(),
      avatar: user2Avatar || "" // Default avatar
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

export const initializeCourseChats = async (courses: any[], userId?: string, userName?: string, userPhoto?: string) => {
  // Check if quota was previously exceeded
  if (isQuotaExceeded()) return;

  for (const course of courses) {
    try {
      const chatRef = doc(db, 'chats', course.id);
      const chatSnap = await getDoc(chatRef);
      
      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          id: course.id,
          name: course.name,
          type: 'course',
          participants: userId ? [userId] : [],
          participantsInfo: (userId && userName) ? {
            [userId]: { displayName: userName, photoURL: userPhoto || '' }
          } : {},
          lastMessage: `Welcome to the ${course.code} group chat!`,
          lastActive: serverTimestamp(),
          color: course.color,
          code: course.code,
          createdAt: serverTimestamp()
        });
      } else if (userId) {
        const data = chatSnap.data();
        const participants = data.participants || [];
        const participantsInfo = data.participantsInfo || {};
        
        const updates: any = {};
        let needsUpdate = false;

        if (!participants.includes(userId)) {
          updates.participants = arrayUnion(userId);
          needsUpdate = true;
        }

        const currentInfo = participantsInfo[userId];
        if (userName && (!currentInfo || currentInfo.displayName !== userName || currentInfo.photoURL !== (userPhoto || ''))) {
          updates[`participantsInfo.${userId}`] = {
            displayName: userName,
            photoURL: userPhoto || ''
          };
          needsUpdate = true;
        }

        if (needsUpdate) {
          await updateDoc(chatRef, updates);
        }
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
  let fileToUpload = file;

  // Try to compress images if they are too large (> 750KB)
  if (file.type.startsWith('image/') && file.size > 750 * 1024) {
    try {
      const options = {
        maxSizeMB: 0.6, // Target even smaller to ensure it fits
        maxWidthOrHeight: 1280, // Slightly smaller dimensions for better compression
        useWebWorker: true,
        initialQuality: 0.6
      };
      fileToUpload = await imageCompression(file, options);
    } catch (error) {
      console.warn('Image compression failed, proceeding with original file...', error);
    }
  }

  // If file is small enough (< 750KB to be safe with base64 overhead in 1MB Firestore doc), use data URL
  if (fileToUpload.size < 750 * 1024) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(fileToUpload);
    });
  }

  // For larger files, use the server-side proxy to bypass CORS and ensure reliability
  try {
    const formData = new FormData();
    formData.append('file', fileToUpload);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.url) {
        return data.url;
      }
    } else {
      const errorData = await response.json();
      console.warn('Server upload proxy failed:', errorData.error);
    }
  } catch (error) {
    console.warn('Upload to server proxy failed, trying direct fallbacks...', error);
  }

  // Direct fallbacks (in case the server proxy is unavailable or fails)
  // Service 1: uguu.se (Very reliable for direct links, 100MB limit)
  try {
    const formData = new FormData();
    formData.append('files[]', fileToUpload);
    const response = await fetch('https://uguu.se/upload.php', {
      method: 'POST',
      body: formData
    });
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return data.files[0].url;
      }
    }
  } catch (error) {
    console.warn('Direct upload to uguu.se failed:', error);
  }

  // Service 2: catbox.moe (Excellent for direct links, 200MB limit)
  try {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', fileToUpload);
    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData
    });
    if (response.ok) {
      const url = await response.text();
      if (url.startsWith('http')) {
        return url.trim();
      }
    }
  } catch (error) {
    console.warn('Direct upload to catbox.moe failed:', error);
  }

  throw new Error('File too large for Firestore and all upload services failed. Please try a smaller file (< 750KB) or an image that can be compressed further.');
};

export const joinChat = async (chatId: string, userId: string) => {
  // Check if quota was previously exceeded
  if (isQuotaExceeded()) {
    throw new Error('Firestore quota exceeded. Please try again later.');
  }

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
  // Check if quota was previously exceeded
  if (isQuotaExceeded()) {
    throw new Error('Firestore quota exceeded. Please try again later.');
  }

  try {
    const participantsInfo: { [userId: string]: { displayName: string, photoURL: string } } = {
      [creatorId]: { displayName: creatorName, photoURL: creatorAvatar || "" }
    };
    
    participants.forEach(p => {
      participantsInfo[p.id] = { displayName: p.displayName, photoURL: p.photoURL || "" };
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
  // Check if quota was previously exceeded
  if (isQuotaExceeded()) {
    throw new Error('Firestore quota exceeded. Please try again later.');
  }

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
  // Check if quota was previously exceeded
  if (isQuotaExceeded()) {
    throw new Error('Firestore quota exceeded. Please try again later.');
  }

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
  // Check if quota was previously exceeded
  if (isQuotaExceeded()) {
    throw new Error('Firestore quota exceeded. Please try again later.');
  }

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
  // Check if quota was previously exceeded
  if (isQuotaExceeded()) {
    throw new Error('Firestore quota exceeded. Please try again later.');
  }

  try {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    await updateDoc(messageRef, {
      content: 'Message unsent',
      isDeleted: true,
      fileUrl: null,
      fileName: null
    });

    // Update lastMessage if it was the one deleted
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      const chatData = chatSnap.data();
      // If the lastMessage matches the deleted message's content (or if we want to be safe, just update it)
      // Since we don't store the lastMessageId, we can only check content or just always update it to "Message unsent" if it was the last one.
      // A better way would be to fetch the new last message, but for now, let's just mark it as unsent in the chat list too.
      await updateDoc(chatRef, {
        lastMessage: 'Message unsent'
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}/messages/${messageId}`);
  }
};

export const markAsRead = async (chatId: string, userId: string) => {
  // Check if quota was previously exceeded
  if (isQuotaExceeded()) return;

  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      [`lastRead.${userId}`]: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`);
  }
};

export const setTyping = async (chatId: string, userId: string, isTyping: boolean) => {
  // Check if quota was previously exceeded
  if (isQuotaExceeded()) return;

  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      [`typing.${userId}`]: isTyping
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`);
  }
};

export const leaveChat = async (chatId: string, userId: string) => {
  // Check if quota was previously exceeded
  if (isQuotaExceeded()) {
    throw new Error('Firestore quota exceeded. Please try again later.');
  }

  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (chatSnap.exists()) {
      const participants = chatSnap.data().participants || [];
      const newParticipants = participants.filter((id: string) => id !== userId);
      
      const updateData: any = {
        participants: newParticipants
      };

      // Also remove from participantsInfo if it exists
      if (chatSnap.data().participantsInfo) {
        const newParticipantsInfo = { ...chatSnap.data().participantsInfo };
        delete newParticipantsInfo[userId];
        updateData.participantsInfo = newParticipantsInfo;
      }

      await updateDoc(chatRef, updateData);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`);
  }
};

export const hideChat = async (chatId: string, userId: string) => {
  // Check if quota was previously exceeded
  if (isQuotaExceeded()) {
    throw new Error('Firestore quota exceeded. Please try again later.');
  }

  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      const deletedBy = chatSnap.data().deletedBy || [];
      if (!deletedBy.includes(userId)) {
        await updateDoc(chatRef, {
          deletedBy: [...deletedBy, userId]
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`);
  }
};

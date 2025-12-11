import React, { createContext } from 'react';
import type { Message } from './chat-types';

export interface ChatContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  totalTokens: number;
  setTotalTokens: React.Dispatch<React.SetStateAction<number>>;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

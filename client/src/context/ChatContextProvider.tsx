import React, { useRef, useEffect } from 'react';
import { useTemplate } from './TemplateContext';
import type { Message } from './chat-types';
import { ChatContext } from './chat-context';
import { usePersistentState } from '../hooks/usePersistentState';

interface ChatProviderProps { children: React.ReactNode }

const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { currentTemplate } = useTemplate();
  const initRef = useRef(false);

  // Load persisted messages and token count or start fresh
  const [messages, setMessages] = usePersistentState<Message[]>(
    'chatMessages',
    [],
    {
      version: 1,
      migrate: (oldValue: any) => {
        // If oldValue is an array, return as-is (legacy format)
        if (Array.isArray(oldValue)) return oldValue;
        // If oldValue is undefined/null, return empty array
        if (!oldValue) return [];
        // If oldValue is an object with data, return data
        if (Array.isArray(oldValue.data)) return oldValue.data;
        return [];
      }
    }
  );
  const [totalTokens, setTotalTokens] = usePersistentState<number>(
    'totalTokens',
    0,
    {
      version: 1,
      migrate: (oldValue: any) => {
        if (typeof oldValue === 'number') return oldValue;
        if (!oldValue) return 0;
        if (typeof oldValue.data === 'number') return oldValue.data;
        return 0;
      }
    }
  );

  // Seed initial system prompt once when template is first available
  useEffect(() => {
    if (!currentTemplate || initRef.current) return;
    if (messages.length === 0) {
      setMessages([{ role: 'system', content: currentTemplate.prompt, timestamp: Date.now() }]);
    }
    initRef.current = true;
  }, [currentTemplate, messages.length, setMessages]);

  return (
    <ChatContext.Provider value={{ messages, setMessages, totalTokens, setTotalTokens }}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatProvider;

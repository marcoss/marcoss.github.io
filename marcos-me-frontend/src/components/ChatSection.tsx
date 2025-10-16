import { useState, useEffect, useRef } from 'preact/hooks';
import Linkify from 'linkify-react';
import type { JSX } from 'preact';
import type { Message, StreamChunk } from '../types/chat';
import { PLACEHOLDERS, INITIAL_MESSAGE } from '../constants/chatConstants';
import { sendChatRequest } from '../services/chatService';
import { sanitizeQuestion, formatErrorMessage } from '../utils/textUtils';

interface MessageProps {
  message: Message;
}

function MessageComponent({ message }: MessageProps) {
  const linkifyOptions = {
    target: '_blank' as const,
    rel: 'noopener noreferrer',
    className: 'underline hover:text-blue-600 dark:hover:text-blue-400',
  };

  if (message.type === 'user') {
    return (
      <div class="message text-base sm:text-base leading-relaxed font-medium text-gray-900 dark:text-gray-100">
        <strong>You:</strong> {message.text}
      </div>
    );
  }

  if (message.type === 'ai') {
    return (
      <div class="message text-base sm:text-base leading-relaxed text-gray-700 dark:text-gray-300">
        <strong>Marcos's AI:</strong>{' '}
        <span class="answer-text">
          <Linkify options={linkifyOptions}>{message.text}</Linkify>
        </span>
      </div>
    );
  }

  if (message.type === 'loading') {
    return (
      <div
        class="message text-base sm:text-base leading-relaxed text-gray-500 dark:text-gray-500 italic"
        role="status"
        aria-live="polite"
      >
        {message.text}
      </div>
    );
  }

  if (message.type === 'error') {
    return (
      <div class="message text-base sm:text-base leading-relaxed text-red-600 dark:text-red-400">
        <strong>Error:</strong> {message.text}
      </div>
    );
  }

  return null;
}

export function ChatSection() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [placeholder, setPlaceholder] = useState<string>(PLACEHOLDERS[0]);
  const [placeholderIndex, setPlaceholderIndex] = useState<number>(0);
  const [placeholderFade, setPlaceholderFade] = useState<string>('');
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (input.length === 0 && !isLoading) {
        setPlaceholderFade('placeholder-fade-out');
        setTimeout(() => {
          const nextIndex = (placeholderIndex + 1) % PLACEHOLDERS.length;
          setPlaceholderIndex(nextIndex);
          setPlaceholder(PLACEHOLDERS[nextIndex]);
          setPlaceholderFade('placeholder-fade-in');
          setTimeout(() => setPlaceholderFade(''), 600);
        }, 600);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [input, isLoading, placeholderIndex]);

  const handleStreamingResponse = async (response: Response): Promise<void> => {
    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let answer = '';
    let messageIndex: number | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data) {
              try {
                const parsed: StreamChunk = JSON.parse(data);
                if (parsed.content) {
                  if (messageIndex === null) {
                    setMessages(prev => {
                      const newMessages = prev.filter(m => m.type !== 'loading');
                      return [...newMessages, { type: 'ai', text: parsed.content || '' }];
                    });
                    messageIndex = 0;
                    answer = parsed.content;
                  } else {
                    answer += parsed.content;
                    setMessages(prev => {
                      const newMessages = [...prev];
                      newMessages[newMessages.length - 1] = {
                        type: 'ai',
                        text: answer,
                      };
                      return newMessages;
                    });
                  }
                }
                if (parsed.chunks !== undefined) {
                  console.log(`Retrieved ${parsed.chunks} chunks in ${parsed.retrievalTime}ms`);
                }
              } catch {
                // Ignore
              }
            }
          } else if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            if (eventType === 'done') {
              console.log('Stream completed');
            } else if (eventType === 'error') {
              throw new Error('Server error during streaming');
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  const sendMessage = async (): Promise<void> => {
    const rawQuestion = input.trim();
    if (!rawQuestion || isLoading) return;

    const question = sanitizeQuestion(rawQuestion);
    if (!question) {
      setMessages(prev => [...prev, { type: 'error', text: 'Please enter a valid question.' }]);
      return;
    }

    setMessages(prev => [...prev, { type: 'user', text: question }]);
    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, { type: 'loading', text: 'Thinking...' }]);

    try {
      const response = await sendChatRequest(question);

      if (!response.ok) {
        const data = await response.json();
        setMessages(prev => {
          const filtered = prev.filter(m => m.type !== 'loading');
          return [...filtered, { type: 'error', text: formatErrorMessage(data) }];
        });
        return;
      }

      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('text/event-stream')) {
        await handleStreamingResponse(response);
      } else {
        const data = await response.json();
        setMessages(prev => {
          const filtered = prev.filter(m => m.type !== 'loading');
          return [...filtered, { type: 'ai', text: data.answer }];
        });
      }
    } catch (error) {
      setMessages(prev => {
        const filtered = prev.filter(m => m.type !== 'loading');
        return [
          ...filtered,
          {
            type: 'error',
            text: 'Connection error. Please check your internet and try again.',
          },
        ];
      });
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyPress = (e: JSX.TargetedKeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !isLoading) {
      sendMessage();
    }
  };

  const handleInput = (e: JSX.TargetedEvent<HTMLInputElement>): void => {
    setInput(e.currentTarget.value);
  };

  return (
    <section>
      <h2 class="text-xl sm:text-2xl font-semibold mb-5">✨ Ask Marcos's AI</h2>

      <div
        ref={messagesRef}
        class="space-y-4 mb-5 max-h-[500px] overflow-y-auto p-4 border border-gray-200 dark:border-gray-800 rounded"
      >
        {messages.map((message, index) => (
          <MessageComponent key={index} message={message} />
        ))}
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onInput={handleInput}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          minLength={3}
          maxLength={200}
          class={`chat-input flex-1 px-4 py-2.5 text-sm sm:text-base border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-black text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 ${placeholderFade}`}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading}
          class="px-6 py-2.5 text-sm sm:text-base font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-black rounded hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          Chat
        </button>
      </div>

      <p class="text-xs sm:text-sm text-gray-400 dark:text-gray-600 mt-5 text-center">
        AI may provide inaccurate information.
      </p>
    </section>
  );
}

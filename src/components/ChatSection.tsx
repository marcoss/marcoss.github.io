import { useState, useEffect, useRef } from 'preact/hooks';
import Linkify from 'linkify-react';
import type { TargetedInputEvent, TargetedKeyboardEvent } from 'preact';
import type { ChatResponse, ChatStats, Message, StreamChunk } from '../types/chat';
import { PLACEHOLDERS, INITIAL_MESSAGE } from '../constants/chatConstants';
import { sendChatRequest } from '../services/chatService';
import { sanitizeQuestion, formatErrorMessage } from '../utils/textUtils';

interface MessageProps {
  message: Message;
}

function formatStats(stats: ChatStats): string {
  const seconds = (stats.duration / 1000).toFixed(1);
  return `${stats.modelLabel} · ${seconds}s${stats.cached ? ' · cached' : ''}`;
}

function MessageComponent({ message }: MessageProps) {
  const linkifyOptions = {
    target: '_blank' as const,
    rel: 'noopener noreferrer',
    className: 'underline hover:text-blue-600 dark:hover:text-blue-400',
  };

  if (message.type === 'user') {
    return (
      <div class="message flex justify-end">
        <div class="max-w-[92%] overflow-hidden rounded-2xl bg-gray-900 px-3.5 py-2.5 text-sm leading-relaxed font-medium whitespace-pre-wrap text-white [overflow-wrap:anywhere] dark:bg-gray-100 dark:text-gray-950 sm:max-w-[85%] sm:px-4 sm:text-base">
          {message.text}
        </div>
      </div>
    );
  }

  if (message.type === 'ai') {
    return (
      <div class="message flex flex-col items-start">
        <div class="max-w-[94%] overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-gray-700 [overflow-wrap:anywhere] dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 sm:max-w-[90%] sm:px-4 sm:text-base">
          <span class="answer-text">
            <Linkify options={linkifyOptions}>{message.text}</Linkify>
          </span>
        </div>
        {message.stats && (
          <div class="mt-1 ml-1 inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5 text-[11px] leading-4 text-gray-500 dark:border-gray-800 dark:text-gray-500">
            {formatStats(message.stats)}
          </div>
        )}
      </div>
    );
  }

  if (message.type === 'loading') {
    return (
      <div class="message flex items-start" role="status" aria-live="polite">
        <div class="inline-flex items-center gap-1 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm leading-relaxed text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-500 sm:px-4 sm:text-base">
          <span>Thinking</span>
          <span class="flex gap-1" aria-hidden="true">
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
          </span>
        </div>
      </div>
    );
  }

  if (message.type === 'error') {
    return (
      <div class="message flex items-start">
        <div class="max-w-[94%] overflow-hidden rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-red-700 [overflow-wrap:anywhere] dark:border-red-900 dark:bg-red-950/40 dark:text-red-400 sm:max-w-[90%] sm:px-4 sm:text-base">
          <strong>Error:</strong> {message.text}
        </div>
      </div>
    );
  }

  return null;
}

export function ChatSection() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [placeholder, setPlaceholder] = useState<string>(PLACEHOLDERS[0]);
  const [placeholderIndex, setPlaceholderIndex] = useState<number>(0);
  const [placeholderFade, setPlaceholderFade] = useState<string>('');
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInputIfDesktop = (): void => {
    if (!inputRef.current) return;

    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (canHover) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    focusInputIfDesktop();

    const timeout = window.setTimeout(() => {
      setMessages(prev => (prev.length === 0 ? [INITIAL_MESSAGE] : prev));
    }, 250);

    return () => window.clearTimeout(timeout);
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
    let currentEvent = 'message';

    const updateLatestAiStats = (stats: ChatStats): void => {
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (lastIndex >= 0 && newMessages[lastIndex].type === 'ai') {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            stats,
          };
        }
        return newMessages;
      });
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
            if (currentEvent === 'done') {
              console.log('Stream completed');
            }
            continue;
          }

          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6);
          if (!data) {
            currentEvent = 'message';
            continue;
          }

          try {
            if (currentEvent === 'stats') {
              updateLatestAiStats(JSON.parse(data) as ChatStats);
              currentEvent = 'message';
              continue;
            }

            if (currentEvent === 'error') {
              throw new Error('Server error during streaming');
            }

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
                    ...newMessages[newMessages.length - 1],
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
          } catch (error) {
            if (currentEvent === 'error') throw error;
          } finally {
            currentEvent = 'message';
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
        const data = (await response.json()) as ChatResponse;
        const stats =
          data.stats ||
          (data.model && data.modelLabel && data.duration !== undefined
            ? {
                model: data.model,
                modelLabel: data.modelLabel,
                duration: data.duration,
                cached: false,
              }
            : undefined);
        setMessages(prev => {
          const filtered = prev.filter(m => m.type !== 'loading');
          return [...filtered, { type: 'ai', text: data.answer, stats }];
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
      focusInputIfDesktop();
    }
  };

  const handleKeyDown = (e: TargetedKeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e: TargetedInputEvent<HTMLInputElement>): void => {
    setInput(e.currentTarget.value);
  };

  return (
    <section class="min-w-0">
      <div
        ref={messagesRef}
        class="mb-4 max-h-[52dvh] space-y-3 overflow-y-auto overscroll-contain py-2 pr-1 sm:mb-5 sm:max-h-[500px] sm:space-y-4"
      >
        {messages.map((message, index) => (
          <MessageComponent key={index} message={message} />
        ))}
      </div>

      <div class="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 bg-neutral-50 px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] dark:bg-neutral-900 sm:static sm:z-auto sm:mx-0 sm:flex-row sm:items-end sm:bg-transparent sm:p-0 sm:dark:bg-transparent">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          minLength={3}
          maxLength={200}
          class={`chat-input min-h-12 flex-1 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-base leading-6 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-gray-900 focus:outline-none dark:border-gray-700 dark:bg-black dark:text-gray-100 dark:placeholder-gray-500 dark:focus:ring-gray-100 sm:min-h-11 sm:py-2.5 ${placeholderFade}`}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading}
          class="min-h-12 rounded-full bg-gray-900 px-6 py-3 text-base font-medium whitespace-nowrap text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-black dark:hover:bg-gray-200 sm:min-h-11 sm:py-2.5"
        >
          Chat
        </button>
      </div>

      <p class="mt-8 pt-2 text-center text-xs text-gray-300 dark:text-gray-700 sm:text-sm">
        {__BUILD_TAG__}
      </p>
    </section>
  );
}

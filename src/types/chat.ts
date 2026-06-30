export interface ChatStats {
  model: string;
  modelLabel: string;
  duration: number;
  retrievalTime?: number;
  llmTime?: number;
  cached?: boolean;
}

export interface Message {
  type: 'user' | 'ai' | 'loading' | 'error';
  text: string;
  stats?: ChatStats;
}

export interface SignatureResponse {
  signature: string;
  timestamp: string;
  nonce: string;
}

export interface ChatRequest {
  question: string;
  stream: boolean;
}

export interface ChatResponse {
  answer: string;
  model?: string;
  modelLabel?: string;
  duration?: number;
  stats?: ChatStats;
}

export interface StreamChunk {
  content?: string;
  chunks?: number;
  retrievalTime?: number;
  model?: string;
  modelLabel?: string;
}

export interface ErrorData {
  errors?: Array<{
    title?: string;
    detail?: string;
  }>;
}

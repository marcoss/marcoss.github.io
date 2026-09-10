export interface ChatStats {
  conversation_id?: string;
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
  conversation_id?: string;
}

export interface ChatResponse {
  conversation_id: string;
  answer: string;
  model?: string;
  modelLabel?: string;
  duration?: number;
  stats?: ChatStats;
}

export interface StreamChunk {
  conversation_id?: string;
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

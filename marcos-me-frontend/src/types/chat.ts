export interface Message {
  type: 'user' | 'ai' | 'loading' | 'error';
  text: string;
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
}

export interface StreamChunk {
  content?: string;
  chunks?: number;
  retrievalTime?: string;
}

export interface ErrorData {
  errors?: Array<{
    title?: string;
    detail?: string;
  }>;
}

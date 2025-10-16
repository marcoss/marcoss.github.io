import type { SignatureResponse, ChatRequest } from '../types/chat';
import { API_CONFIG } from '../constants/chatConstants';

export async function signRequest(data: { question: string }): Promise<SignatureResponse> {
  const timestamp = Date.now().toString();
  const nonce = Math.random().toString(36).substring(7);
  const canonicalString = `${data.question}|${timestamp}|${nonce}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(API_CONFIG.appId);
  const messageData = encoder.encode(canonicalString);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return { signature: signatureHex, timestamp, nonce };
}

export async function sendChatRequest(question: string): Promise<Response> {
  const { signature, timestamp, nonce } = await signRequest({ question });

  return fetch(API_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
    },
    body: JSON.stringify({
      question,
      stream: API_CONFIG.supportsSSE,
    } as ChatRequest),
  });
}

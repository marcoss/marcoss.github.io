import type { Message } from '../types/chat';

export const PLACEHOLDERS: string[] = [
  'Do you have experience with JavaScript?',
  'What projects have you worked on?',
  'Tell me about your technical skills',
  'What frameworks do you know?',
  'Have you worked with SQL databases?',
  "What's your experience with AWS?",
  'Do you know React or Vue?',
  'Tell me about your recent work',
  'How do you approach debugging complex systems?',
  "What's your experience with microservices architecture?",
  'Have you worked with any cloud platforms?',
  'Can you describe your experience with backend development?',
  'What mobile development have you done?',
  'Tell me about a challenging technical problem you solved',
  'Do you have experience with A/B testing?',
  "What's your experience with distributed systems?",
  'Have you worked with any NoSQL databases?',
  'What version control systems do you use?',
  'Can you describe your experience with API design?',
  "What's your experience with containerization?",
  'Have you mentored junior engineers before?',
  'What testing frameworks are you familiar with?',
  'Do you have experience with CI/CD pipelines?',
  'Tell me about your experience working in agile teams',
  "What's your approach to code reviews?",
  'Have you worked with real-time systems?',
  "What's your experience with performance optimization?",
  'Do you have experience with serverless architecture?',
  'Can you describe a time you improved developer productivity?',
  "What's your experience with frontend frameworks?",
  'Have you worked with message queuing systems?',
  'What monitoring and logging tools have you used?',
  'Do you have experience with iOS development?',
  "What's your experience with machine learning?",
  'Have you led any technical initiatives?',
  'What networking protocols are you familiar with?',
  'Do you have experience with infrastructure as code?',
  'Can you tell me about cross-functional collaboration?',
  'What database optimization techniques do you know?',
];

export const INITIAL_MESSAGE: Message = {
  type: 'ai',
  text: "👋 Hi! I'm a RAG-based AI assistant trained on Marcos's technical experience and work history. Ask me anything about his skills, projects, or background.",
};

export const API_CONFIG = {
  endpoint: 'https://api.marcos.me/v1/chat',
  apiKey: 'e49cf0dc-35da-4eb6-abd0-6d81ef9ae5c8',
  supportsSSE: typeof EventSource !== 'undefined',
} as const;

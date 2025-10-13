const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const supportsSSE = typeof EventSource !== 'undefined';

let isLoading = false;

async function signRequest(data) {
    const timestamp = Date.now().toString();
    const nonce = Math.random().toString(36).substring(7);
    const canonicalString = `${data.question}|${timestamp}|${nonce}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode('e49cf0dc-35da-4eb6-abd0-6d81ef9ae5c8');
    const messageData = encoder.encode(canonicalString);
    const key = await crypto.subtle.importKey(
        'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    return { signature: signatureHex, timestamp, nonce };
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isLoading) sendMessage();
});

function sanitizeQuestion(text) {
    return text
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function sendMessage() {
    const rawQuestion = chatInput.value.trim();
    if (!rawQuestion || isLoading) return;

    const question = sanitizeQuestion(rawQuestion);

    if (!question) {
        addMessage('Please enter a valid question.', 'error');
        return;
    }

    addMessage(question, 'user');
    chatInput.value = '';

    isLoading = true;
    sendBtn.disabled = true;

    const loadingMsg = addMessage('Thinking...', 'loading');
    let aiMessageDiv = null;

    try {
        const { signature, timestamp, nonce } = await signRequest({ question });

        const response = await fetch('https://api.marcos.me/v1/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Signature': signature,
                'X-Timestamp': timestamp,
                'X-Nonce': nonce,
            },
            body: JSON.stringify({
                question,
                stream: supportsSSE
            })
        });

        if (!response.ok) {
            const data = await response.json();
            loadingMsg.remove();
            addMessage(formatErrorMessage(data), 'error');
            return;
        }

        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('text/event-stream')) {
            await handleStreamingResponse(response, loadingMsg, (answer, messageDiv) => {
                aiMessageDiv = messageDiv;
            });
        } else {
            // Fallback to non-streaming response
            const data = await response.json();
            loadingMsg.remove();
            addMessage(data.answer, 'ai');
        }

    } catch (error) {
        loadingMsg.remove();
        addMessage('Connection error. Please check your internet and try again.', 'error');
        console.error('Chat error:', error);
    } finally {
        isLoading = false;
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

async function handleStreamingResponse(response, loadingMsg, onAnswer) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let answer = '';
    let aiMessageDiv = null;
    let firstChunkReceived = false;

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
                            const parsed = JSON.parse(data);

                            if (parsed.content) {
                                if (!firstChunkReceived) {
                                    loadingMsg.remove();
                                    aiMessageDiv = addMessage('', 'ai');
                                    aiMessageDiv.classList.add('streaming');
                                    firstChunkReceived = true;
                                }

                                answer += parsed.content;
                                updateMessage(aiMessageDiv, answer, 'ai');
                                onAnswer(answer, aiMessageDiv);
                            }

                            if (parsed.chunks !== undefined) {
                                console.log(`Retrieved ${parsed.chunks} chunks in ${parsed.retrievalTime}ms`);
                            }
                        } catch (e) {
                            // Ignore
                        }
                    }
                } else if (line.startsWith('event: ')) {
                    const eventType = line.slice(7);

                    if (eventType === 'done') {
                        console.log('Stream completed');
                        if (aiMessageDiv) {
                            aiMessageDiv.classList.remove('streaming');
                        }
                    } else if (eventType === 'error') {
                        throw new Error('Server error during streaming');
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
        if (aiMessageDiv) {
            aiMessageDiv.classList.remove('streaming');
        }
        if (!firstChunkReceived && loadingMsg && loadingMsg.parentNode) {
            loadingMsg.remove();
        }
    }
}

function formatErrorMessage(errorData) {
    if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        const error = errorData.errors[0];
        return error.detail || error.title || 'An error occurred';
    }

    return 'Something went wrong. Please try again.';
}

function addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message text-base sm:text-base leading-relaxed';

    if (type === 'user') {
        messageDiv.className += ' font-medium text-gray-900 dark:text-gray-100';
        messageDiv.innerHTML = `<strong>You:</strong> ${escapeHtml(text)}`;
    } else if (type === 'ai') {
        messageDiv.className += ' text-gray-700 dark:text-gray-300';
        messageDiv.innerHTML = `<strong>Assistant:</strong> <span class="answer-text">${escapeHtml(text)}</span>`;
    } else if (type === 'loading') {
        messageDiv.className += ' text-gray-500 dark:text-gray-500 italic';
        messageDiv.textContent = text;
    } else if (type === 'error') {
        messageDiv.className += ' text-red-600 dark:text-red-400';
        messageDiv.innerHTML = `<strong>Error:</strong> ${escapeHtml(text)}`;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

function updateMessage(messageDiv, text, type) {
    const answerSpan = messageDiv.querySelector('.answer-text');
    if (answerSpan) {
        answerSpan.textContent = text;
    } else {
        messageDiv.innerHTML = `<strong>Assistant:</strong> <span class="answer-text">${escapeHtml(text)}</span>`;
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const placeholders = [
    "Do you have experience with JavaScript?",
    "What projects have you worked on?",
    "Tell me about your technical skills",
    "What frameworks do you know?",
    "Have you worked with SQL databases?",
    "What's your experience with AWS?",
    "Do you know React or Vue?",
    "Tell me about your recent work",
    "How do you approach debugging complex systems?",
    "What's your experience with microservices architecture?",
    "Have you worked with any cloud platforms?",
    "Can you describe your experience with backend development?",
    "What mobile development have you done?",
    "Tell me about a challenging technical problem you solved",
    "Do you have experience with A/B testing?",
    "What's your experience with distributed systems?",
    "Have you worked with any NoSQL databases?",
    "What version control systems do you use?",
    "Can you describe your experience with API design?",
    "What's your experience with containerization?",
    "Have you mentored junior engineers before?",
    "What testing frameworks are you familiar with?",
    "Do you have experience with CI/CD pipelines?",
    "Tell me about your experience working in agile teams",
    "What's your approach to code reviews?",
    "Have you worked with real-time systems?",
    "What's your experience with performance optimization?",
    "Do you have experience with serverless architecture?",
    "Can you describe a time you improved developer productivity?",
    "What's your experience with frontend frameworks?",
    "Have you worked with message queuing systems?",
    "What monitoring and logging tools have you used?",
    "Do you have experience with iOS development?",
    "What's your experience with machine learning?",
    "Have you led any technical initiatives?",
    "What networking protocols are you familiar with?",
    "Do you have experience with infrastructure as code?",
    "Can you tell me about cross-functional collaboration?",
    "What database optimization techniques do you know?"
];

let currentPlaceholderIndex = 0;
let isTyping = false;

chatInput.placeholder = placeholders[currentPlaceholderIndex];

function rotatePlaceholder() {
    if (chatInput.value.length > 0 || isTyping) {
        return;
    }

    chatInput.classList.add('placeholder-fade-out');
    setTimeout(() => {
        currentPlaceholderIndex = (currentPlaceholderIndex + 1) % placeholders.length;
        chatInput.placeholder = placeholders[currentPlaceholderIndex];

        chatInput.classList.remove('placeholder-fade-out');
        chatInput.classList.add('placeholder-fade-in');
        setTimeout(() => {
            chatInput.classList.remove('placeholder-fade-in');
        }, 600);
    }, 600);
}

chatInput.addEventListener('input', () => {
    isTyping = chatInput.value.length > 0;
});

setInterval(rotatePlaceholder, 5000);

chatInput.focus();

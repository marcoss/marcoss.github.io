const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

let isLoading = false;

// Send message on button click
sendBtn.addEventListener('click', sendMessage);

// Send message on Enter key
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isLoading) {
        sendMessage();
    }
});

async function sendMessage() {
    const question = chatInput.value.trim();

    if (!question || isLoading) return;

    // Clear welcome message if it exists
    const welcome = chatMessages.querySelector('.chat-welcome');
    if (welcome) {
        welcome.remove();
    }

    // Add question to chat
    addMessage(question, 'question');

    // Clear input
    chatInput.value = '';

    // Show loading state
    isLoading = true;
    sendBtn.disabled = true;
    const loadingMsg = addMessage('Thinking... (This may take a few seconds)', 'loading');

    try {
        const response = await fetch('https://api.marcos.me/v1/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question }),
        });

        const data = await response.json();

        // Remove loading message
        loadingMsg.remove();

        // Handle error responses
        if (!response.ok) {
            const errorMessage = formatErrorMessage(data);
            addMessage(errorMessage, 'error');
            return;
        }

        // Add answer to chat
        addMessage(data.answer, 'answer');

    } catch (error) {
        // Remove loading message
        loadingMsg.remove();

        // Show error message
        addMessage('Connection error. Please check your internet and try again.', 'error');

        console.error('Chat error:', error);
    } finally {
        isLoading = false;
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

function formatErrorMessage(errorData) {
    // Check if we have a structured error response
    if (errorData.error && errorData.details && errorData.details.length > 0) {
        const detail = errorData.details[0];

        // Extract the user-friendly message
        if (detail.msg) {
            return `${detail.msg}`;
        }
    }

    // Fallback to generic error
    if (errorData.error) {
        return `Error: ${errorData.error}`;
    }

    return 'Something went wrong. Please try again.';
}

function addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;

    chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageDiv;
}

// Animated placeholder rotation
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

// Set initial placeholder immediately
chatInput.placeholder = placeholders[currentPlaceholderIndex];

function rotatePlaceholder() {
    // Don't change placeholder while user is typing
    if (chatInput.value.length > 0 || isTyping) {
        return;
    }

    // Fade out
    chatInput.classList.add('placeholder-fade-out');

    setTimeout(() => {
        // Change placeholder text
        currentPlaceholderIndex = (currentPlaceholderIndex + 1) % placeholders.length;
        chatInput.placeholder = placeholders[currentPlaceholderIndex];

        // Fade in
        chatInput.classList.remove('placeholder-fade-out');
        chatInput.classList.add('placeholder-fade-in');

        setTimeout(() => {
            chatInput.classList.remove('placeholder-fade-in');
        }, 600);

    }, 600);
}

// Track if user is typing
chatInput.addEventListener('input', () => {
    isTyping = chatInput.value.length > 0;
});

// Rotate placeholder every 4 seconds
setInterval(rotatePlaceholder, 4000);

// Focus input on load
chatInput.focus();
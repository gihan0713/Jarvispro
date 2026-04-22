/**
 * JARVIS AI Chat - Powered by Google Gemini API
 * API Key: AIzaSyBYE4HGXvTCQvVC-0rfra5Z-tca45UgtzQ
 */

// ===== Configuration =====
const CONFIG = {
    API_KEY: 'AIzaSyBYE4HGXvTCQvVC-0rfra5Z-tca45UgtzQ',
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent' \
  -H 'Content-Type: application/json' \
  -H 'X-goog-api-key: AIzaSyBYE4HGXvTCQvVC-0rfra5Z-tca45UgtzQ' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Explain how AI works in a few words"
          }
        ]
      }
    ]
  }'',
    MAX_HISTORY: 50,
    TYPING_SPEED: 15, // ms per character
};

// ===== State Management =====
const state = {
    chatHistory: [],
    isGenerating: false,
    isVoiceMode: false,
    currentController: null,
    typingInterval: null,
    theme: localStorage.getItem('jarvis-theme') || 'dark',
    fileAttachment: null,
};

// ===== DOM Elements =====
const elements = {
    chatForm: document.getElementById('chat-form'),
    userInput: document.getElementById('user-input'),
    sendBtn: document.getElementById('send-btn'),
    stopBtn: document.getElementById('stop-btn'),
    messagesArea: document.getElementById('messages-area'),
    welcomeScreen: document.getElementById('welcome-screen'),
    chatContainer: document.getElementById('chat-container'),
    sidebar: document.querySelector('.sidebar'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    newChatBtn: document.getElementById('new-chat-btn'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    voiceToggle: document.getElementById('voice-toggle'),
    voiceOverlay: document.getElementById('voice-overlay'),
    fileInput: document.getElementById('file-input'),
    attachBtn: document.getElementById('attach-btn'),
    filePreview: document.getElementById('file-preview'),
    exportBtn: document.getElementById('export-btn'),
    historyList: document.getElementById('history-list'),
    loadingOverlay: document.getElementById('loading-overlay'),
};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Apply saved theme
    applyTheme(state.theme);
    
    // Load chat history from localStorage
    loadChatHistory();
    
    // Setup event listeners
    setupEventListeners();
    
    // Auto-resize textarea
    setupAutoResize();
    
    // Hide loading overlay
    setTimeout(() => {
        elements.loadingOverlay.classList.add('hidden');
    }, 1000);
    
    // Welcome message
    console.log('🤖 JARVIS initialized. Systems online.');
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Form submission
    elements.chatForm.addEventListener('submit', handleSubmit);
    
    // Sidebar toggle
    elements.sidebarToggle.addEventListener('click', toggleSidebar);
    
    // New chat
    elements.newChatBtn.addEventListener('click', startNewChat);
    
    // Clear history
    elements.clearHistoryBtn.addEventListener('click', clearAllHistory);
    
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Voice toggle
    elements.voiceToggle.addEventListener('click', toggleVoiceMode);
    
    // File attachment
    elements.attachBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Export chat
    elements.exportBtn.addEventListener('click', exportChat);
    
    // Stop generation
    elements.stopBtn.addEventListener('click', stopGeneration);
    
    // Suggestion cards
    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.dataset.prompt;
            elements.userInput.value = prompt;
            elements.chatForm.dispatchEvent(new Event('submit'));
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

// ===== Auto-resize Textarea =====
function setupAutoResize() {
    elements.userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 150) + 'px';
    });
}

// ===== Handle Form Submission =====
async function handleSubmit(e) {
    e.preventDefault();
    
    const message = elements.userInput.value.trim();
    if (!message || state.isGenerating) return;
    
    // Hide welcome screen
    elements.welcomeScreen.style.display = 'none';
    
    // Add user message
    addMessage('user', message);
    
    // Clear input
    elements.userInput.value = '';
    elements.userInput.style.height = 'auto';
    
    // Clear file attachment
    if (state.fileAttachment) {
        state.fileAttachment = null;
        elements.filePreview.classList.remove('active');
        elements.filePreview.textContent = '';
    }
    
    // Show loading message
    const loadingMsg = addLoadingMessage();
    
    // Generate response
    await generateResponse(message, loadingMsg);
}

// ===== Generate Response using Gemini API =====
async function generateResponse(userMessage, loadingElement) {
    state.isGenerating = true;
    updateUIState();
    
    // Create abort controller for cancellation
    state.currentController = new AbortController();
    
    try {
        // Prepare request body
        const requestBody = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: userMessage }]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
                topP: 0.9,
            }
        };
        
        // Add file if attached
        if (state.fileAttachment) {
            requestBody.contents[0].parts.push({
                inline_data: {
                    mime_type: state.fileAttachment.mimeType,
                    data: state.fileAttachment.data
                }
            });
        }
        
        // Add chat history for context
        if (state.chatHistory.length > 0) {
            const historyParts = state.chatHistory.slice(-10).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));
            requestBody.contents = [...historyParts, ...requestBody.contents];
        }
        
        // Make API call
        const response = await fetch(`${CONFIG.API_URL}?key=${CONFIG.API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: state.currentController.signal,
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Extract response text
        const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                           "I apologize, sir. I couldn't process that request.";
        
        // Remove loading message
        loadingElement.remove();
        
        // Add bot message with typing effect
        await addBotMessageWithTyping(botResponse);
        
        // Save to history
        saveToHistory(userMessage, botResponse);
        
        // Speak response if voice mode is on
        if (state.isVoiceMode) {
            speakText(botResponse);
        }
        
    } catch (error) {
        console.error('API Error:', error);
        
        // Remove loading message
        loadingElement.remove();
        
        // Show error message
        const errorMsg = error.name === 'AbortError' 
            ? 'Response generation cancelled.' 
            : `Error: ${error.message}. Please check your API key and try again.`;
        
        addMessage('bot', errorMsg, true);
    } finally {
        state.isGenerating = false;
        state.currentController = null;
        updateUIState();
    }
}

// ===== Add Message to Chat =====
function addMessage(role, content, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = role === 'user' 
        ? '<i class="fas fa-user"></i>' 
        : '<i class="fas fa-robot"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (isError) {
        contentDiv.style.color = 'var(--error-color)';
    }
    
    // Parse markdown-like formatting
    contentDiv.innerHTML = formatMessage(content);
    
    // Add action buttons for bot messages
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';
    
    if (role === 'bot') {
        actionsDiv.innerHTML = `
            <button class="message-action-btn" onclick="copyMessage(this)" title="Copy">
                <i class="fas fa-copy"></i> Copy
            </button>
            <button class="message-action-btn" onclick="speakText('${escapeHtml(content)}')" title="Read aloud">
                <i class="fas fa-volume-up"></i> Speak
            </button>
            <button class="message-action-btn" onclick="regenerateResponse(this)" title="Regenerate">
                <i class="fas fa-redo"></i> Retry
            </button>
        `;
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    if (role === 'bot') {
        const wrapper = document.createElement('div');
        wrapper.appendChild(contentDiv);
        wrapper.appendChild(actionsDiv);
        messageDiv.appendChild(wrapper);
    }
    
    elements.messagesArea.appendChild(messageDiv);
    scrollToBottom();
    
    return messageDiv;
}

// ===== Add Loading Message =====
function addLoadingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message loading';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    
    elements.messagesArea.appendChild(messageDiv);
    scrollToBottom();
    
    return messageDiv;
}

// ===== Add Bot Message with Typing Effect =====
function addBotMessageWithTyping(text) {
    return new Promise((resolve) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = '';
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        elements.messagesArea.appendChild(messageDiv);
        
        // Typing effect
        let index = 0;
        const chars = text.split('');
        
        state.typingInterval = setInterval(() => {
            if (index < chars.length) {
                contentDiv.textContent += chars[index];
                index++;
                scrollToBottom();
            } else {
                clearInterval(state.typingInterval);
                
                // Format final content
                contentDiv.innerHTML = formatMessage(text);
                
                // Add actions
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'message-actions';
                actionsDiv.innerHTML = `
                    <button class="message-action-btn" onclick="copyMessage(this)" title="Copy">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                    <button class="message-action-btn" onclick="speakText('${escapeHtml(text)}')" title="Read aloud">
                        <i class="fas fa-volume-up"></i> Speak
                    </button>
                `;
                
                const wrapper = document.createElement('div');
                wrapper.appendChild(contentDiv.cloneNode(true));
                wrapper.appendChild(actionsDiv);
                messageDiv.replaceChild(wrapper, contentDiv);
                
                resolve(messageDiv);
            }
        }, CONFIG.TYPING_SPEED);
    });
}

// ===== Format Message Content =====
function formatMessage(text) {
    // Escape HTML
    let formatted = escapeHtml(text);
    
    // Code blocks
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
    });
    
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Links
    formatted = formatted.replace(
        /(https?:\/\/[^\s]+)/g, 
        '<a href="$1" target="_blank" style="color: var(--accent-color);">$1</a>'
    );
    
    return formatted;
}

// ===== Escape HTML =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Scroll to Bottom =====
function scrollToBottom() {
    elements.chatContainer.scrollTo({
        top: elements.chatContainer.scrollHeight,
        behavior: 'smooth'
    });
}

// ===== Update UI State =====
function updateUIState() {
    elements.sendBtn.disabled = state.isGenerating;
    elements.stopBtn.classList.toggle('hidden', !state.isGenerating);
    elements.attachBtn.disabled = state.isGenerating;
}

// ===== Stop Generation =====
function stopGeneration() {
    if (state.currentController) {
        state.currentController.abort();
    }
    if (state.typingInterval) {
        clearInterval(state.typingInterval);
    }
    state.isGenerating = false;
    updateUIState();
}

// ===== Voice Mode =====
function toggleVoiceMode() {
    state.isVoiceMode = !state.isVoiceMode;
    elements.voiceToggle.style.color = state.isVoiceMode ? 'var(--accent-color)' : '';
    
    if (state.isVoiceMode) {
        startVoiceRecognition();
    }
}

function startVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
        alert('Speech recognition not supported in this browser.');
        return;
    }
    
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
        elements.voiceOverlay.classList.remove('hidden');
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        elements.userInput.value = transcript;
        elements.chatForm.dispatchEvent(new Event('submit'));
    };
    
    recognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        elements.voiceOverlay.classList.add('hidden');
    };
    
    recognition.onend = () => {
        elements.voiceOverlay.classList.add('hidden');
    };
    
    recognition.start();
}

// ===== Text-to-Speech =====
function speakText(text) {
    if (!window.speechSynthesis) return;
    
    // Remove markdown for speech
    const cleanText = text
        .replace(/```[\s\S]*?```/g, 'Code block omitted.')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/https?:\/\/[^\s]+/g, 'link');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9;
    utterance.pitch = 0.8;
    utterance.volume = 1;
    
    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
        v.name.includes('Google US English') || 
        v.name.includes('Samantha') ||
        v.name.includes('Daniel')
    );
    if (preferredVoice) utterance.voice = preferredVoice;
    
    window.speechSynthesis.speak(utterance);
}

// ===== File Handling =====
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const base64 = event.target.result.split(',')[1];
        state.fileAttachment = {
            data: base64,
            mimeType: file.type,
            name: file.name
        };
        
        elements.filePreview.textContent = `📎 ${file.name}`;
        elements.filePreview.classList.add('active');
    };
    reader.readAsDataURL(file);
}

// ===== Theme Management =====
function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(state.theme);
    localStorage.setItem('jarvis-theme', state.theme);
}

function applyTheme(theme) {
    document.body.classList.toggle('light-theme', theme === 'light');
    const icon = elements.themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

// ===== Sidebar =====
function toggleSidebar() {
    elements.sidebar.classList.toggle('open');
}

// ===== Chat History =====
function saveToHistory(userMsg, botMsg) {
    state.chatHistory.push(
        { role: 'user', content: userMsg, timestamp: Date.now() },
        { role: 'bot', content: botMsg, timestamp: Date.now() }
    );
    
    // Trim history
    if (state.chatHistory.length > CONFIG.MAX_HISTORY * 2) {
        state.chatHistory = state.chatHistory.slice(-CONFIG.MAX_HISTORY * 2);
    }
    
    // Save to localStorage
    localStorage.setItem('jarvis-chat-history', JSON.stringify(state.chatHistory));
    
    // Update sidebar
    updateHistorySidebar();
}

function loadChatHistory() {
    const saved = localStorage.getItem('jarvis-chat-history');
    if (saved) {
        state.chatHistory = JSON.parse(saved);
        updateHistorySidebar();
    }
}

function updateHistorySidebar() {
    elements.historyList.innerHTML = '';
    
    // Group by date
    const grouped = {};
    state.chatHistory.filter((_, i) => i % 2 === 0).forEach((msg, index) => {
        const date = new Date(msg.timestamp).toLocaleDateString();
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push({ ...msg, index });
    });
    
    Object.entries(grouped).slice(-5).forEach(([date, messages]) => {
        const li = document.createElement('li');
        li.textContent = messages[messages.length - 1].content.substring(0, 30) + '...';
        li.title = new Date(date).toLocaleDateString();
        li.addEventListener('click', () => loadChatSession(messages[0].index));
        elements.historyList.appendChild(li);
    });
}

function loadChatSession(startIndex) {
    elements.messagesArea.innerHTML = '';
    elements.welcomeScreen.style.display = 'none';
    
    for (let i = startIndex; i < startIndex + 20 && i < state.chatHistory.length; i += 2) {
        const userMsg = state.chatHistory[i];
        const botMsg = state.chatHistory[i + 1];
        
        if (userMsg && botMsg) {
            addMessage('user', userMsg.content);
            addMessage('bot', botMsg.content);
        }
    }
}

function startNewChat() {
    elements.messagesArea.innerHTML = '';
    elements.welcomeScreen.style.display = 'flex';
    state.chatHistory = [];
    localStorage.removeItem('jarvis-chat-history');
    updateHistorySidebar();
}

function clearAllHistory() {
    if (confirm('Are you sure you want to clear all chat history?')) {
        startNewChat();
    }
}

// ===== Export Chat =====
function exportChat() {
    const chatText = state.chatHistory.map(msg => 
        `${msg.role.toUpperCase()} (${new Date(msg.timestamp).toLocaleString()}):\n${msg.content}\n`
    ).join('\n---\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// ===== Copy Message =====
function copyMessage(btn) {
    const messageDiv = btn.closest('.message').querySelector('.message-content');
    const text = messageDiv.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => btn.innerHTML = original, 2000);
    });
}

// ===== Regenerate Response =====
function regenerateResponse(btn) {
    const messageDiv = btn.closest('.message');
    const prevMessage = messageDiv.previousElementSibling;
    
    if (prevMessage && prevMessage.classList.contains('user-message')) {
        const userText = prevMessage.querySelector('.message-content').textContent;
        messageDiv.remove();
        const loadingMsg = addLoadingMessage();
        generateResponse(userText, loadingMsg);
    }
}

// ===== Keyboard Shortcuts =====
function handleKeyboard(e) {
    // Ctrl/Cmd + Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        elements.chatForm.dispatchEvent(new Event('submit'));
    }
    
    // Escape to stop generation
    if (e.key === 'Escape' && state.isGenerating) {
        stopGeneration();
    }
    
    // Ctrl/Cmd + Shift + N for new chat
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        startNewChat();
    }
}

// ===== Expose functions to global scope for HTML onclick handlers =====
window.copyMessage = copyMessage;
window.speakText = speakText;
window.regenerateResponse = regenerateResponse;

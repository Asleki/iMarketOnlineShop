document.addEventListener('DOMContentLoaded', () => {
    const chatIcon = document.getElementById('chat-icon');
    const chatBox = document.getElementById('chat-box');
    const closeChatBtn = document.getElementById('close-chat-btn');
    const chatMessages = document.getElementById('chat-messages');
    const chatInputField = document.getElementById('chat-input-field');
    const sendBtn = document.getElementById('send-btn');
    let agentResponses = {};
    // Fetch agent responses from JSON file
    const fetchResponses = async () => {
        try {
            const response = await fetch('data/online-agent.json');
            agentResponses = await response.json();
        } catch (error) {
            console.error('Error fetching online agent data:', error);
        }
    };
    // Toggle chat widget visibility
    if (chatIcon) {
        chatIcon.addEventListener('click', () => {
            chatBox.classList.toggle('active');
        });
    }
    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', () => {
            chatBox.classList.remove('active');
        });
    }
    // Append a message to the chat
    const appendMessage = (message, sender) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to the bottom
    };
    // Simulate agent response
    const getAgentResponse = (userMessage) => {
        const lowerCaseMessage = userMessage.toLowerCase();
        let response = agentResponses.default_response;
        // Check for keywords and provide a relevant response
        for (const keyword in agentResponses.responses) {
            if (lowerCaseMessage.includes(keyword)) {
                response = agentResponses.responses[keyword];
                break;
            }
        }
        return response;
    };
    // Handle sending a message
    const sendMessage = () => {
        const userMessage = chatInputField.value.trim();
        if (userMessage === '') return;
        appendMessage(userMessage, 'user');
        chatInputField.value = '';
        // Simulate a slight delay for the agent's response
        setTimeout(() => {
            const agentReply = getAgentResponse(userMessage);
            appendMessage(agentReply, 'agent');
        }, 1000);
    };
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    if (chatInputField) {
        chatInputField.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                sendMessage();
            }
        });
    }
    // Initial fetch of responses when the page loads
    fetchResponses();
});
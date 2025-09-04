// autogiant-motors-chat-agent.js

document.addEventListener('DOMContentLoaded', () => {

    /* ============================================== */
    /* Dynamic Category Page Content                  */
    /* ============================================== */
    const categoryTitleEl = document.getElementById('category-title');
    const pageTitleEl = document.querySelector('title');
    const pageMetaDescEl = document.querySelector('meta[name="description"]');
    const pageCanonicalEl = document.querySelector('link[rel="canonical"]');
    
    function updatePageContent(category) {
        if (categoryTitleEl && pageTitleEl) {
            const decodedCategory = decodeURIComponent(category);
            categoryTitleEl.textContent = decodedCategory;
            pageTitleEl.textContent = `${decodedCategory} | AutoGiant Motors`;
            
            if (pageMetaDescEl) {
                pageMetaDescEl.content = `Browse our selection of ${decodedCategory.toLowerCase()} for sale at AutoGiant Motors. Find competitive prices and high-quality vehicles and parts.`;
            }
            if (pageCanonicalEl) {
                pageCanonicalEl.href = `https://www.imarket.co.ke/autogiant-motors-categories.html?category=${category}`;
            }
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const categoryFromUrl = urlParams.get('category');

    if (categoryFromUrl) {
        updatePageContent(categoryFromUrl);
    } else {
        updatePageContent('All Products');
    }


    /* ============================================== */
    /* Chat Agent Functionality                       */
    /* ============================================== */
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const chatWidget = document.getElementById('chat-widget');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatMessagesContainer = document.getElementById('chat-messages-container');
    
    let chatData;
    let currentConversationState;

    chatToggleBtn.addEventListener('click', () => {
        chatWidget.classList.toggle('active');
        if (chatWidget.classList.contains('active')) {
            chatInput.focus();
            if (!currentConversationState) {
                startChat();
            }
        }
    });

    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    async function startChat() {
        try {
            const response = await fetch('data/autogiant-motors-chat-agent.json');
            chatData = await response.json();
            currentConversationState = 'main';
            displayBotMessage(chatData.menu[0].prompt);
            displayMainMenuOptions();
        } catch (error) {
            console.error('Error loading chat data:', error);
            displayBotMessage('Sorry, the chat agent is unavailable right now. Please try again later.');
        }
    }

    function displayMessage(message, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.textContent = message;
        msgDiv.classList.add('chat-message', `message-${sender}`);
        chatMessagesContainer.appendChild(msgDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    function displayBotMessage(message) {
        displayMessage(message, 'bot');
    }

    function displayUserMessage(message) {
        displayMessage(message, 'user');
    }

    function displayMainMenuOptions() {
        const menu = chatData.menu[0].options;
        const optionsList = document.createElement('ul');
        optionsList.classList.add('chat-options');

        menu.forEach(option => {
            const optionItem = document.createElement('li');
            optionItem.textContent = `${option.number}. ${option.text}`;
            optionsList.appendChild(optionItem);
        });

        chatMessagesContainer.appendChild(optionsList);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    function sendMessage() {
        const userQuery = chatInput.value.trim().toLowerCase();
        if (userQuery === '') return;

        displayUserMessage(chatInput.value);
        chatInput.value = '';

        if (userQuery === 'back') {
            currentConversationState = 'main';
            displayBotMessage(chatData.menu[0].prompt);
            displayMainMenuOptions();
            return;
        }

        if (currentConversationState === 'main') {
            handleMainMenu(userQuery);
        } else {
            handleSubMenu(userQuery);
        }
    }

    function handleMainMenu(query) {
        const menuOptions = chatData.menu[0].options;
        const selectedOption = menuOptions.find(option => option.number.toString() === query);

        if (selectedOption) {
            if (selectedOption.nextId) {
                currentConversationState = selectedOption.nextId;
                displayBotMessage(chatData.responses[currentConversationState].prompt);
            } else {
                displayBotMessage('Please call or email our representative for direct assistance.');
            }
        } else {
            displayBotMessage(chatData.fallback);
        }
    }

    function handleSubMenu(query) {
        const subMenu = chatData.responses[currentConversationState];
        const matchedQuery = subMenu.queries.find(q =>
            q.keywords.some(keyword => query.includes(keyword))
        );

        if (matchedQuery) {
            displayBotMessage(matchedQuery.reply);
        } else {
            displayBotMessage(chatData.fallback);
        }
    }

    /* ============================================== */
    /* Scroll-to-Top Button Functionality             */
    /* ============================================== */
    const scrollTopBtn = document.getElementById('scroll-to-top-btn');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollTopBtn.classList.add('show');
        } else {
            scrollTopBtn.classList.remove('show');
        }
    });

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

});
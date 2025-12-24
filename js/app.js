// DOM Elements
// Panels
const homePanel = document.getElementById('home-panel');
const classicPanel = document.getElementById('classic-panel');
const customPanel = document.getElementById('custom-panel');
const gamePanel = document.getElementById('game-panel');

// Navigation
const navClassic = document.getElementById('nav-classic');
const navCustom = document.getElementById('nav-custom');
const backFromClassic = document.getElementById('back-from-classic');
const backFromCustom = document.getElementById('back-from-custom');
const mainHeader = document.getElementById('main-header');

// Game Elements
const storyList = document.getElementById('story-list');
const storyTitle = document.getElementById('story-title');
const storyPuzzle = document.getElementById('story-puzzle');
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const statusIndicator = document.getElementById('status-indicator');
const giveUpBtn = document.getElementById('give-up-btn');
const restartBtn = document.getElementById('restart-btn');

// Generation Elements
const generateBtn = document.getElementById('generate-btn');
const genLoading = document.getElementById('gen-loading');
const genreOptions = document.getElementById('genre-options');
const soupOptions = document.getElementById('soup-options');

// State for generation - default to "Full" or specific keyword
let selectedGenre = '全部';
let selectedSoup = '全部';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initStoryList();
    initFilterLogic();

    // Initialize AI Client
    window.aiClient.init();
});

// Navigation Functions
function showPanel(panel) {
    // Hide all panels
    const panels = [homePanel, classicPanel, customPanel, gamePanel];
    panels.forEach(p => {
        if (p) p.classList.add('hidden');
    });

    // Show target panel
    if (panel) panel.classList.remove('hidden');

    // Header Logic: Show only on Home
    if (mainHeader) { // Ensure mainHeader exists before manipulating
        if (panel === homePanel) {
            mainHeader.classList.remove('hidden');
            document.body.classList.remove('layout-top');
        } else {
            mainHeader.classList.add('hidden');
            document.body.classList.add('layout-top');
        }
    }
}

// Nav Event Listeners
if (navClassic) navClassic.addEventListener('click', () => showPanel(classicPanel));
if (navCustom) navCustom.addEventListener('click', () => showPanel(customPanel));
if (backFromClassic) backFromClassic.addEventListener('click', () => showPanel(homePanel));
if (backFromCustom) backFromCustom.addEventListener('click', () => showPanel(homePanel));

function initFilterLogic() {
    // Helper to handle selection
    const setupSelection = (container, callback) => {
        if (!container) return; // Guard against missing elements
        const buttons = container.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active from all siblings
                buttons.forEach(b => b.classList.remove('active'));
                // Add active to clicked
                btn.classList.add('active');
                // Update state
                callback(btn.dataset.value);
            });
        });
    };

    setupSelection(genreOptions, (val) => selectedGenre = val);
    setupSelection(soupOptions, (val) => selectedSoup = val);
}

function initStoryList() {
    if (!storyList) return;
    storyList.innerHTML = '';
    window.STORIES.forEach(story => {
        const btn = document.createElement('div');
        btn.className = 'story-btn';
        const puzzleText = story.puzzle.length > 50 ? story.puzzle.substring(0, 50) + '...' : story.puzzle;
        btn.innerHTML = `<h3>${story.title}</h3><p>${puzzleText}</p>`;
        btn.onclick = () => startGame(story);
        storyList.appendChild(btn);
    });
}

function startGame(story) {
    showPanel(gamePanel);

    // UI Update
    storyTitle.textContent = story.title;
    storyPuzzle.textContent = story.puzzle;
    chatHistory.innerHTML = `
        <div class="message system">
            <p>我是你的AI主持人。请提问，我只能回答“是”、“不是”、“是也不是”或“与此无关”。</p>
        </div>
    `;

    // Logic Update
    window.gameLogic.start(story);
}

function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    msgDiv.textContent = text;
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function handleUserSubmit() {
    const text = userInput.value.trim();
    if (!text) return;

    if (window.gameLogic.isSolved) {
        return;
    }

    // UI
    userInput.value = '';
    appendMessage('user', text);
    statusIndicator.classList.remove('hidden');
    userInput.disabled = true;

    // AI Request
    const response = await window.aiClient.ask(text);

    // Update UI
    statusIndicator.classList.add('hidden');
    userInput.disabled = false;
    appendMessage('ai', response);
    userInput.focus();

    // Check Win
    if (window.gameLogic.checkWinCondition(response)) {
        document.body.classList.add('solved');
        appendMessage('system', '🎉 游戏胜利！你已经还原了真相。');
    }
}

// Event Listeners
if (sendBtn) sendBtn.addEventListener('click', handleUserSubmit);
if (userInput) userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleUserSubmit();
});

if (restartBtn) restartBtn.addEventListener('click', () => {
    document.body.classList.remove('solved');
    window.gameLogic.reset();
    showPanel(homePanel); // Return to home on "Return to Homepage"
});

if (giveUpBtn) giveUpBtn.addEventListener('click', () => {
    if (confirm('确定要查看真相吗？游戏将结束。')) {
        const truth = window.gameLogic.currentStory.truth;
        appendMessage('system', `【真相揭秘】\n${truth}`);
        document.body.classList.add('solved');
        window.gameLogic.isSolved = true;
    }
});

// Generation Logic
if (generateBtn) generateBtn.addEventListener('click', async () => {
    // UI Loading
    generateBtn.disabled = true;
    genLoading.classList.remove('hidden');

    // Call AI with current state
    const story = await window.aiClient.generateStory(selectedGenre, selectedSoup);

    // Reset UI
    generateBtn.disabled = false;
    genLoading.classList.add('hidden');

    if (story && story.puzzle) {
        startGame(story);
    } else {
        alert('生成失败，AI 开小差了，请重试！');
    }
});

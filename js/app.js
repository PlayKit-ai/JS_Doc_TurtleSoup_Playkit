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

// Balance Elements
const balanceContainer = document.getElementById('balance-container');
const balanceText = document.getElementById('balance-text');
const rechargeBtn = document.getElementById('recharge-btn');

// Ghost Text State
const ghostTextElement = document.getElementById('ghost-text');
let currentPrediction = '';

let selectedGenre = '全部';
let selectedSoup = '全部';

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    initStoryList();
    initFilterLogic();

    // Initialize AI Client
    const ready = await window.aiClient.init();
    if (ready) {
        updateBalanceDisplay();

        // Listen for AI predictions
        window.aiClient.onPredictionsReceived = (predictions) => {
            if (predictions && predictions.length > 0) {
                currentPrediction = predictions[0];
                updateGhostText();
            }
        };
    }
});

function updateGhostText() {
    if (!ghostTextElement || !userInput) return;
    const inputVal = userInput.value;

    // Only show ghost text if input matches the start of the prediction
    if (inputVal && currentPrediction.startsWith(inputVal)) {
        ghostTextElement.textContent = currentPrediction;
    } else {
        ghostTextElement.textContent = '';
    }
}

async function updateBalanceDisplay() {
    if (balanceContainer && balanceText) {
        const info = await window.aiClient.getPlayerInfo();
        balanceText.textContent = `积分: ${info.credits || 0}`;
        balanceContainer.classList.remove('hidden');
    }
}

if (rechargeBtn) rechargeBtn.addEventListener('click', () => {
    window.aiClient.openRechargePage();
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
    if (mainHeader) {
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
    const setupSelection = (container, callback) => {
        if (!container) return;
        const buttons = container.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
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

    storyTitle.textContent = story.title;
    storyPuzzle.textContent = story.puzzle;

    // Reset Input State
    if (userInput) {
        userInput.disabled = false;
        userInput.placeholder = "输入你的问题...";
        userInput.value = '';
    }
    if (sendBtn) sendBtn.disabled = false;
    chatHistory.innerHTML = `
        <div class="message system">
            <p>我是你的AI主持人。请提问，我只能回答“是”、“不是”、“是也不是”或“与此无关”。</p>
        </div>
    `;

    const gamePlayArea = document.getElementById('game-play-area');
    if (gamePlayArea) {
        gamePlayArea.style.backgroundImage = 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6))';
        window.aiClient.generateSceneImage(story).then(imageUrl => {
            if (imageUrl) {
                gamePlayArea.style.backgroundImage = `
                    linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)),
                    url('${imageUrl}')
                `;
                gamePlayArea.style.backgroundSize = 'cover';
                gamePlayArea.style.backgroundPosition = 'center';
                updateBalanceDisplay();
            }
        });
    }

    window.gameLogic.start(story);

    const hintPanel = document.getElementById('hint-panel');
    const hintList = document.getElementById('hint-list');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    if (hintPanel) hintPanel.classList.add('hidden');
    if (hintList) hintList.innerHTML = '';
    if (progressFill) {
        progressFill.style.width = '0%';
        progressFill.classList.remove('full');
    }
    if (progressText) {
        progressText.textContent = '0%';
    }
}

function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    msgDiv.textContent = text;
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Event Listeners
if (userInput) {
    userInput.addEventListener('input', updateGhostText);

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' || e.key === 'ArrowRight') {
            if (ghostText && ghostText.textContent) {
                e.preventDefault();
                userInput.value = ghostText.textContent;
                ghostText.textContent = '';
                currentPrediction = '';
            }
        }
    });

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserSubmit();
    });
}
if (sendBtn) sendBtn.addEventListener('click', handleUserSubmit);

async function handleUserSubmit() {
    const text = userInput.value.trim();
    if (!text) return;

    if (window.gameLogic.isSolved) {
        return;
    }

    // UI
    userInput.value = '';
    if (ghostTextElement) ghostTextElement.textContent = '';
    currentPrediction = '';

    appendMessage('user', text);
    statusIndicator.classList.remove('hidden');
    userInput.disabled = true;

    // AI Request
    const response = await window.aiClient.ask(text);

    // Update Progress (Async)
    await window.gameLogic.updateProgress(text, response);
    renderHints();

    // Update UI
    statusIndicator.classList.add('hidden');
    userInput.disabled = false;
    appendMessage('ai', response);
    userInput.focus();
    updateBalanceDisplay(); // Refresh balance after chat response

    // Check Win
    if (window.gameLogic.checkWinCondition(response)) {
        document.body.classList.add('solved');
        appendMessage('system', '🎉 游戏胜利！你已经还原了真相。');
        renderHints(); // Re-render to show 100% progress

        // Disable input
        if (userInput) {
            userInput.disabled = true;
            userInput.placeholder = "游戏胜利";
        }
        if (sendBtn) sendBtn.disabled = true;
    }
}

function renderHints() {
    const hintPanel = document.getElementById('hint-panel');
    const hintList = document.getElementById('hint-list');

    if (!hintPanel || !hintList) return;

    const spec = window.gameLogic.currentStory && window.gameLogic.currentStory.solutionSpec;
    const progress = window.gameLogic.progress;

    if (!spec) {
        hintPanel.classList.add('hidden');
        return;
    }

    // Show panel if we have hints OR progress
    // Even if no hints yet, showing "Progress: 1/4" is feedback.

    // Calculate progress
    const totalMilestones = spec.milestones.length;
    const foundCount = progress.foundMilestones.size;

    // Logic: Milestones contribute to max 99%. Only solving gives 100%.
    const isSolved = window.gameLogic.isSolved;
    let percent = 0;

    if (isSolved) {
        percent = 100;
    } else {
        // Cap at 99% based on milestones
        const rawPercent = (foundCount / totalMilestones) * 99;
        percent = Math.min(99, Math.round(rawPercent));
    }

    hintPanel.classList.remove('hidden');

    // Update Progress Bar UI
    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');

    if (progressText && progressFill) {
        progressText.textContent = `${percent}%`;
        progressFill.style.width = `${percent}%`;

        if (percent === 100) {
            progressFill.classList.add('full');
            progressText.textContent = "100% (推理成功)";
            progressText.style.color = 'var(--success-color)';
        } else {
            progressFill.classList.remove('full');
            progressText.style.color = 'var(--text-secondary)';
        }
    }

    hintList.innerHTML = '';

    if (progress.unlockedHints.size === 0) {
        const placeholder = document.createElement('li');
        placeholder.style.color = 'var(--text-secondary)';
        placeholder.style.fontStyle = 'italic';
        placeholder.textContent = '暂无解锁线索，请继续提问...';
        hintList.appendChild(placeholder);
    } else {
        spec.hints.forEach(h => {
            if (progress.unlockedHints.has(h.id)) {
                // ... (existing hint rendering)
                const li = document.createElement('li');
                li.className = 'hint-item';
                li.textContent = h.text;
                hintList.appendChild(li);
            }
        });
    }

    // Scroll to bottom of chat history to keep focus? 
    // Maybe checking hints doesn't need to scroll.
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

        // Disable input
        if (userInput) {
            userInput.disabled = true;
            userInput.placeholder = "游戏结束";
        }
        if (sendBtn) sendBtn.disabled = true;
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
        updateBalanceDisplay(); // Refresh balance after generation
    } else {
        alert('生成失败，AI 开小差了，请重试！');
        updateBalanceDisplay(); // Refresh in case of credit error
    }
});

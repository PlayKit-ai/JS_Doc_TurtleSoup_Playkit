class GameLogic {
    constructor() {
        this.currentStory = null;
        this.history = [];
        this.isSolved = false;
    }

    reset() {
        this.currentStory = null;
        this.history = [];
        this.isSolved = false;
    }

    start(story) {
        this.currentStory = story;
        this.history = []; // Clear history
        this.isSolved = false;

        // Initialize AI Host with the story
        window.aiClient.createHost(story).then(success => {
            if (success) {
                console.log("Game Started: " + story.title);
            } else {
                alert("AI初始化失败，请检查网络或配置。");
            }
        });
    }

    addToHistory(role, text) {
        this.history.push({ role, text });
    }

    checkWinCondition(response) {
        // Simple check: if AI says "恭喜" (Congratulations), we assume win.
        if (response.includes("恭喜") || response.includes("真相")) {
            this.isSolved = true;
            return true;
        }
        return false;
    }
}

window.gameLogic = new GameLogic();

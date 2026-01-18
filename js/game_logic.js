class GameLogic {
    constructor() {
        this.currentStory = null;
        this.history = [];
        this.isSolved = false;

        // Progress State
        this.progress = {
            foundMilestones: new Set(),
            unlockedHints: new Set()
        };
    }

    reset() {
        this.currentStory = null;
        this.history = [];
        this.isSolved = false;
        this.progress.foundMilestones.clear();
        this.progress.unlockedHints.clear();
    }

    start(story) {
        this.currentStory = story;
        this.history = []; // Clear history
        this.isSolved = false;

        // Reset Progress
        this.progress.foundMilestones.clear();
        this.progress.unlockedHints.clear();

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

    async updateProgress(question, answer) {
        if (!this.currentStory || !this.currentStory.solutionSpec) return;

        const spec = this.currentStory.solutionSpec;

        // Only run judge if AI answered "Yes" or similar positive
        // We assume "Irrelevant" or "No" means the player is off-track.
        // But "Yes and No" (是也不是) implies a partial hit, so we SHOULD checks milestones.
        const isYesAndNo = answer.includes('是也不是');
        const isNo = answer.includes('不是') && !isYesAndNo; // "不是" but excluding "是也不是"
        const isIrrelevant = answer.includes('无关');

        if (isIrrelevant || isNo) {
            return;
        }

        console.log("Creating Progress Judgment for:", question);

        // 1. Check Milestones using AI
        try {
            const foundIds = await window.aiClient.judgeProgress(question, answer, spec.milestones);
            console.log("AI Judge Result:", foundIds);

            foundIds.forEach(id => {
                if (!this.progress.foundMilestones.has(id)) {
                    this.progress.foundMilestones.add(id);
                    console.log(`Milestone Reached: ${id}`);
                }
            });
        } catch (e) {
            console.warn("Progress check skipped due to error", e);
        }

        // 2. Unlock Hints
        spec.hints.forEach(h => {
            if (this.progress.unlockedHints.has(h.id)) return;
            if (this.progress.foundMilestones.size >= h.unlockAfter) {
                this.progress.unlockedHints.add(h.id);
                console.log(`Hint Unlocked: ${h.id}`);
            }
        });
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

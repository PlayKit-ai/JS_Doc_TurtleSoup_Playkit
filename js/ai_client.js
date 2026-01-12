// AI Client Wrapper for PlayKit SDK

class AIClient {
    constructor() {
        this.sdk = null;
        this.npc = null;
        this.gameId = '1251d171-b5b5-4811-8f37-bddcf9f5cc2f'; // Provided by user
        this.isReady = false;
        this.currentStory = null;
    }

    async init() {
        if (!window.PlayKitSDK) {
            console.error('PlayKit SDK not loaded!');
            return false;
        }

        try {
            console.log('Initializing PlayKit SDK (Player-Paid Mode)...');
            const config = {
                gameId: this.gameId,
                baseURL: 'https://playkit.ai',
                debug: false
            };

            this.sdk = new PlayKitSDK.PlayKitSDK(config);
            await this.sdk.initialize();

            this.isReady = true;
            console.log('PlayKit SDK Initialized successfully.');
            return true;
        } catch (error) {
            console.error('Failed to initialize PlayKit SDK:', error);
            return false;
        }
    }

    async getPlayerInfo() {
        if (!this.isReady) return { credits: 0 };
        try {
            return await this.sdk.getPlayerInfo();
        } catch (error) {
            console.error("Failed to get player info:", error);
            return { credits: 0 };
        }
    }

    openRechargePage() {
        const rechargeURL = 'https://playkit.agentlandlab.com/recharge';
        window.open(rechargeURL, 'recharge', 'width=600,height=800');
    }

    async handleCreditError(error) {
        if (error && (error.code === 'INSUFFICIENT_CREDITS' || (error.message && error.message.includes('credits')))) {
            alert('您的积分不足，请充值后继续游戏。');
            this.openRechargePage();
            return true;
        }
        return false;
    }

    async createHost(story) {
        if (!this.isReady) {
            const success = await this.init();
            if (!success) return false;
        }

        this.currentStory = story;

        this.systemPrompt = `
        你是一个专业的海龟汤（情景推理游戏）主持人。
        
        【核心原则】
        1. **绝对一致性**：你的回答必须100%基于下方的【故事真相】。
        2. **逻辑判定优先级**：
           - **第一步：判断是否矛盾**。
           - **第二步：判断是否有关**。
           - **第三步：判断确认为真**。
           - **例外**：如果部分正确，回复“是也不是”。

        【谜面】: "${story.puzzle}"
        【真相】: "${story.truth}"
        
        【回复词库】: “是”、“不是”、“是也不是”、“与此无关”。不要有解释。
        `;

        try {
            this.chatClient = this.sdk.createChatClient('gemini-2.5-flash');
            return true;
        } catch (error) {
            console.error('Failed to create host:', error);
            return false;
        }
    }

    async ask(question) {
        if (!this.chatClient) return "AI主持人尚未就绪。";
        try {
            return await this.chatClient.chat(question, this.systemPrompt);
        } catch (error) {
            if (await this.handleCreditError(error)) return "积分不足，请充值。";
            console.error('Error asking AI:', error);
            return "连接断开，请重试。";
        }
    }

    async judgeProgress(question, milestones) {
        if (!this.chatClient || !milestones || milestones.length === 0) return [];
        const prompt = `判断玩家提问是否触及剧情点: ${JSON.stringify(milestones)}. 玩家: "${question}". 返回JSON数组ID.`;
        try {
            const response = await this.chatClient.chat(prompt);
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(jsonStr);
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error("Progress judgment failed:", error);
            return [];
        }
    }

    async generateStory(genre, soupType) {
        if (!this.isReady) await this.init();
        const prompt = `创作一个海龟汤故事。类型: ${genre}, 恐怖度: ${soupType}. 返回指定格式JSON.`;
        try {
            const genClient = this.sdk.createChatClient('claude-opus-4.5');
            const response = await genClient.chat(prompt);
            let jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (error) {
            await this.handleCreditError(error);
            console.error("Story generation failed:", error);
            return null;
        }
    }

    async generateSceneImage(story) {
        if (!this.isReady) await this.init();
        const prompt = `Create horror HD background for: "${story.puzzle}". 8k resolution, cinematic, NO TEXT.`;
        try {
            const imageClient = this.sdk.createImageClient('flux-1-schnell');
            const image = await imageClient.generate(prompt, '1024x1024');
            return image.toDataURL();
        } catch (error) {
            await this.handleCreditError(error);
            console.error("Image generation failed:", error);
            return null;
        }
    }

}

// Export
window.aiClient = new AIClient();

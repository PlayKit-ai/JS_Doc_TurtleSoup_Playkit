// AI Client Wrapper for PlayKit SDK

class AIClient {
    constructor() {
        this.sdk = null;
        this.npc = null;
        this.gameId = 'c89b33fa-0669-451f-bfb1-0fc979844e81'; // Provided by user
        this.developerToken = 'dev-fba687f1-337a-49cd-ad85-75eb5f436013'; // Provided by user
        this.isReady = false;
        this.currentStory = null;
    }

    async init() {
        if (!window.PlayKitSDK) {
            console.error('PlayKit SDK not loaded!');
            return false;
        }

        try {
            console.log('Initializing PlayKit SDK...');
            // Initialize SDK
            const config = {
                gameId: this.gameId,
                baseURL: 'https://lab-staging.playkit.ai' // Try root domain
            };

            // If we had a token, we would add it here
            if (this.developerToken) {
                config.developerToken = this.developerToken;
            }

            this.sdk = new PlayKitSDK.PlayKitSDK(config);
            await this.sdk.initialize();

            this.isReady = true;
            console.log('PlayKit SDK Initialized successfully.');
            return true;
        } catch (error) {
            console.error('Failed to initialize PlayKit SDK:', error);
            // If initialization fails (e.g. auth required), we might need to handle it.
            // But SDK might handle auth UI.
            return false;
        }
    }

    async createHost(story) {
        if (!this.isReady) {
            console.warn('SDK not ready, attempting re-init...');
            const success = await this.init();
            if (!success) return false;
        }

        this.currentStory = story;

        this.systemPrompt = `
        你是一个专业的海龟汤（情景推理游戏）主持人。
        
        【游戏目标】
        引导玩家通过提问还原【故事真相】。你的回答必须严谨、公正，不能直接透题。

        【当前谜题（汤面）】
        "${story.puzzle}"
        
        【故事真相（汤底）】
        "${story.truth}"
        
        【回复规则】
        1. 你只能用以下几种回答之一，不要有多余的解释：
           - “是”：玩家猜对了关键点。
           - “不是”：玩家猜错了。
           - “是也不是”：问题部分正确，部分错误，或者角度刁钻难以简单回答。
           - “与此无关”：问题跟解开谜题没有关系。
        2.例外情况：如果玩家完全还原了真相（或猜中了核心诡计），你可以说：“恭喜你！确实是这样……（并简要复述真相）”。
        
        【注意事项】
        - 你的性格是高冷、神秘的。
        - 绝对不要在玩家没猜中前泄漏真相。
        - 如果玩家问的问题很偏，尽量引导回主线。
        `;

        try {
            // Logic Change: Use ChatClient instead of NPCClient
            // The user report suggests "NPC" usage might be causing issues (404).
            // Vibe Coding docs use createChatClient.
            this.chatClient = this.sdk.createChatClient('claude-3-7-sonnet');
            return true;
        } catch (error) {
            console.error('Failed to create host:', error);
            return false;
        }
    }

    async ask(question) {
        if (!this.chatClient) {
            return "AI主持人尚未就绪。";
        }

        try {
            // Pass system prompt as context or second argument depending on API
            // Based on docs: chat.chat(message, systemPrompt)
            const response = await this.chatClient.chat(question, this.systemPrompt);
            return response;
        } catch (error) {
            console.error('Error asking AI:', error);
            return "连接断开，请重试。";
        }
    }

    async generateStory(genre, soupType) {
        if (!this.isReady) {
            await this.init();
        }

        // Prepare Examples
        let examplesText = "";
        if (window.STORIES && window.STORIES.length > 0) {
            // Pick up to 2 random examples
            const examples = window.STORIES.sort(() => 0.5 - Math.random()).slice(0, 2);
            examplesText = `
        【参考范例（风格参考）】
        ${examples.map((s, i) => `
        范例 ${i + 1} (${s.genre} / ${s.soup_type}):
        - 汤面: ${s.puzzle}
        - 汤底: ${s.truth}
        `).join('\n')}
            `;
        }

        const prompt = `
        你是一个资深的海龟汤（Lateral Thinking Puzzle）出题人。请根据以下要求创作一个新的谜题。
        ${examplesText}

        【核心要求】
        1. **故事类型**：${genre}
           - 本格：逻辑必须严密，符合现实物理法则，无鬼怪。
           - 变格：必须包含超自然元素（鬼怪、魔法、科幻），但逻辑自洽。
           - 新本格：谜面看似超自然（密室、消失），由于人为诡计或特殊心理/梦境造成，本质符合现实。
        
        2. **恐怖程度（汤底风格）**：${soupType}
           - 清汤：**无尸体、无血腥**。温和有趣，通常是误会、巧合或生活冷知识。重点在于思维盲区。
           - 红汤：**惊悚、刺激**。包含尸体、谋杀或血腥描写。氛围紧张，需要一定胆量。
           - 黑汤：**极为致郁、黑暗**。涉及人性之恶、伦理崩坏、复杂的犯罪心理。令人细思极恐，后劲大。
           - 王八汤（搞笑汤）：**逻辑崩坏、无厘头**。这是一个搞笑分类！不涉及真正的乌龟。利用谐音梗、双关语、常识反转或弱智吧风格。目的是让人会心一笑或大呼“离谱”。

        【输出格式】
        请直接返回一个标准的 JSON 对象（不要Markdown格式），包含以下字段：
        {
            "id": "gen_${Date.now()}",
            "title": "简短有吸引力的标题",
            "puzzle": "汤面（这是给玩家看的谜题。要求：设置强烈的悬念或矛盾，让人忍不住想问为什么。不要把真相写进去！）",
            "truth": "汤底（这是完整的真相。包含：起因、经过、核心诡计、结果。逻辑必须闭环，解释汤面中的所有疑点。）",
            "hint": "给主持人的关键词提示（3-5个关键线索）"
        }
        `;

        try {
            // Temporary ChatClient for generation
            const genClient = this.sdk.createChatClient('deepseek-chat');
            const response = await genClient.chat(prompt);

            // Clean response in case of markdown blocks
            let jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const story = JSON.parse(jsonStr);
            return story;
        } catch (error) {
            console.error("Story generation failed:", error);
            return null;
        }
    }
}

// Export
window.aiClient = new AIClient();

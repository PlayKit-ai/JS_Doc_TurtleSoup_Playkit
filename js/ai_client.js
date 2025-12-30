// AI Client Wrapper for PlayKit SDK

class AIClient {
    constructor() {
        this.sdk = null;
        this.npc = null;
        this.gameId = '1251d171-b5b5-4811-8f37-bddcf9f5cc2f'; // Provided by user
        this.developerToken = 'dev-563dd935-e55a-496f-95a9-3900ac43b16f'; // Provided by user
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
        
        【核心原则】
        1. **绝对一致性**：你的回答必须100%基于下方的【故事真相】。
        2. **逻辑判定优先级**（请严格按顺序执行）：
           - **第一步：判断是否矛盾**。如果玩家猜测与真相事实相反，直接回复“不是”。
           - **第二步：判断是否有关（Crucial Step）**。即使玩家提问是**事实正确**的（例如“他是男的吗？”或者“发生在白天吗？”），但如果这个细节对于推导出核心诡计（真相的逻辑链）**毫无帮助**，属于无关紧要的背景或常识，**必须**回复“与此无关”。不能回复“是”。
           - **第三步：判断确认为真**。只有当问题**同时满足**“事实正确” AND “对解谜有帮助（涉及核心线索/因果/动机/手法）”时，才回复“是”。
           - **例外**：如果问题部分正确部分错误，回复“是也不是”。

        【当前谜题（汤面）】
        "${story.puzzle}"
        
        【故事真相（汤底）- 绝对保密】
        "${story.truth}"
        
        【回复词库】
        你只能使用以下词列出的词语，不要有多余的解释：
        - “是”
        - “不是”
        - “是也不是”
        - “与此无关”
        
        【获胜判定】
        只有当玩家**完整复述**了真相的核心逻辑（动因+手法+结果）时，你才可以说：“恭喜你！确实是这样……（简要复述真相）”。
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

    async judgeProgress(question, milestones) {
        if (!this.chatClient || !milestones || milestones.length === 0) return [];

        const prompt = `
        你需要判断玩家的提问是否“触及”了以下关键剧情点（Milestones）。
        
        【关键剧情点】
        ${JSON.stringify(milestones)}

        【玩家提问】
        "${question}"

        【判断规则】
        1. 如果玩家的问题核心意思与某个剧情点相符（哪怕只是部分猜中），就认为触及了该点。
        2. 请返回一个 JSON 数组，包含所有触及的 milestones id。如果没有触及，返回空数组 []。
        3. 只返回 JSON 数组，不要任何多余文字。
        4. 示例返回：["m1", "m3"]
        `;

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
            "hint": "给主持人的关键词提示（3-5个关键线索）",
            "solutionSpec": {
                "milestones": [
                    { "id": "m1", "text": "关键事实1" },
                    { "id": "m2", "text": "关键事实2" },
                    { "id": "m3", "text": "关键事实3 (共3-5个)" }
                ],
                "hints": [
                     { "id": "h1", "unlockAfter": 1, "text": "💡 提示1：..." },
                     { "id": "h2", "unlockAfter": 2, "text": "💡 提示2：..." }
                ]
            }
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

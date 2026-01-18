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
        你是一个专业的海龟汤主持人。只能回答“是”、“不是”、“是也不是”、“与此无关”。
        【谜面】: "${story.puzzle}"
        【真相】: "${story.truth}"
        `;

        try {
            // Using NPCClient to support reply predictions for ghost text
            this.npc = this.sdk.createNPCClient({
                model: 'gemini-2.5-flash', // Updated to Gemini 2.5 Flash
                systemPrompt: this.systemPrompt,
                generateReplyPrediction: true,
                predictionCount: 1
            });

            this.npc.on('replyPredictions', (predictions) => {
                if (this.onPredictionsReceived) {
                    this.onPredictionsReceived(predictions);
                }
            });

            return true;
        } catch (error) {
            console.error('Failed to create host:', error);
            return false;
        }
    }

    async ask(question) {
        if (!this.npc) return "AI主持人尚未就绪。";
        try {
            return await this.npc.talk(question);
        } catch (error) {
            if (await this.handleCreditError(error)) return "积分不足，请充值。";
            console.error('Error asking AI:', error);
            return "连接断开，请重试。";
        }
    }

    async judgeProgress(question, answer, milestones) {
        // Always use a neutral ChatClient for judgment, never the NPC host (who has a persona)
        const client = this.sdk.createChatClient('gemini-2.5-flash');
        const prompt = `
        判断玩家提问是否触及剧情点: ${JSON.stringify(milestones)}. 
        玩家提问: "${question}". 
        AI回答: "${answer}". (如果AI回答是"是"或"是也不是"，这很重要)
        
        请严格判断：只有当玩家的问题明确猜中或推导出了某个剧情点（Milestone）的核心事实时，才返回该Milestone的ID。
        如果只是擦边球、过于模糊、或者只是在询问相关但不确定的信息，请【不要】返回ID。
        必须非常确信玩家已经“知道”了这个点。
        
        返回JSON数组ID，例如 ["m1"] 或 []。`;
        try {
            const response = await client.chat(prompt);
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

        const prompt = `
        创作一个海龟汤故事。
        类型: ${genre}
        恐怖度: ${soupType}
        
        请严格按照以下JSON格式返回，直接返回JSON字符串，不要包含markdown标记或其他文本：
        {
            "title": "故事标题",
            "puzzle": "谜面（仅包含表面现象）",
            "truth": "真相（包含完整的故事背景和原因）",
            "hint": "关键提示词",
            "solutionSpec": {
                "milestones": [
                    { "id": "m1", "text": "核心剧情点1" },
                    { "id": "m2", "text": "核心剧情点2" }
                ],
                "hints": [
                    { "id": "h1", "unlockAfter": 1, "text": "提示1" },
                    { "id": "h2", "unlockAfter": 2, "text": "提示2" }
                ]
            }
        }`;

        try {
            // Using gemini-2.5-flash for generation
            const genClient = this.sdk.createChatClient('gemini-2.5-flash');
            const response = await genClient.chat(prompt);

            // Clean up the response to ensure valid JSON
            let jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
            }

            const story = JSON.parse(jsonStr);
            console.log("Generated story:", story);
            return story;
        } catch (error) {
            await this.handleCreditError(error);
            console.error("Story generation failed:", error);
            return null;
        }
    }

    async generateSceneImage(story) {
        if (!this.isReady) await this.init();

        // Use both puzzle and truth to ensure accuracy while maintaining mystery
        // The truth often contains the actual setting/elements (like an elevator)
        const prompt = `
        Create a high-quality, cinematic, horizontal wide-shot image for a horror mystery game background.
        
        【Core Subject】: A complete, immersive environmental scene based on: "${story.puzzle}. ${story.truth}".
        
        【Visual Quality】: Extremely clear, 8k resolution, masterpiece, sharp focus, diverse details, photorealistic.
        
        【Atmosphere】: Dark, eerie, suspenseful, psychological horror, dramatic lighting, deep shadows, volumetric fog.
        
        【Composition Rules】: 
        1. Wide angle view. Ensure objects are fully visible (e.g., if a building/sign is shown, show the whole thing, do not cut it off).
        2. Centered composition for key elements to avoid bad cropping.
        3. NO cropped text or partial signs. NO headless figures or distorted bodies. 
        4. Focus on the *scene* and *atmosphere* rather than close-ups of people. If people are present, they should be silhouettes or in the distance to maintain mystery.
        
        【Negative Constraints】: ugly, blurry, low quality, distorted, bad anatomy, headless, cut off objects, text, watermarks.
        `;

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

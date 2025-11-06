import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const MODEL_NAME = "gemini-2.5-flash";

export class GeminiClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.genAI = null;
        this.model = null;
        this.isInitialized = false;
    }

    init() {
        if (!this.apiKey || this.apiKey === 'YOUR_API_KEY') {
            console.warn("Gemini API key is missing or is a placeholder. The AI Strategist feature will be disabled. Please add your VITE_GEMINI_API_KEY to a .env file to enable it.");
            this.isInitialized = false;
            return;
        }

        try {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            this.model = this.genAI.getGenerativeModel({ model: MODEL_NAME });
            this.isInitialized = true;
            console.log(`Gemini Client initialized successfully with model: ${MODEL_NAME}`);
        } catch (error) {
            console.error("Error initializing Gemini Client:", error);
            this.isInitialized = false;
        }
    }

    async getStrategicRecommendations(industry, size, challenges, goals) {
        if (!this.isInitialized) {
            throw new Error("Gemini client is not initialized. Check your API key.");
        }

        const generationConfig = {
            temperature: 0.8,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
        };

        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];

        const prompt = `
You are the Chief Strategy Officer for Lunai, a multi-dimensional ideation agency specializing in strategic consulting. Your services include: Strategic Branding, Research & Intelligence, Strategy Development, Political Campaigns, Digital Web Excellence, and Content Creation.

A potential client has provided the following information:
- Industry: ${industry}
- Business Size: ${size}
- Primary Challenges: ${challenges}
- Main Goals: ${goals}

Analyze this information and provide a strategic recommendation. Your response MUST be a single, valid JSON object. Do not include any text or markdown formatting before or after the JSON object.

The JSON object must follow this exact structure:
{
  "title": "Your Strategic Constellation",
  "summary": "A concise, encouraging summary of the proposed strategy, tailored to the client's input.",
  "recommendations": [
    {
      "icon": "⭐",
      "title": "Strategic Branding Excellence",
      "match_reason": "A detailed paragraph explaining exactly why this service is the top recommendation based on the client's challenges and goals. Be specific and insightful.",
      "benefits": [
        "A clear, compelling benefit statement.",
        "Another distinct benefit.",
        "A third benefit that highlights a key outcome."
      ],
      "timeline": "Provide a realistic timeline estimate based on the business size (e.g., '4-6 weeks')."
    },
    {
      "icon": "🧭",
      "title": "Comprehensive Strategy Development",
      "match_reason": "A detailed paragraph for the second recommendation.",
      "benefits": [
        "Benefit 1.",
        "Benefit 2.",
        "Benefit 3."
      ],
      "timeline": "An estimated timeline."
    },
    {
      "icon": "🌐",
      "title": "Digital Web Excellence",
      "match_reason": "A detailed paragraph for the third recommendation.",
      "benefits": [
        "Benefit 1.",
        "Benefit 2.",
        "Benefit 3."
      ],
      "timeline": "An estimated timeline."
    }
  ]
}

Choose the most relevant services and icons from this list for your recommendations:
- ⭐ Strategic Branding Excellence
- 🔍 Strategic Research & Intelligence
- 🧭 Comprehensive Strategy Development
- 🏛️ Political Campaign Excellence
- 🌐 Digital Web Excellence
- ✨ Content + Creative Excellence

Ensure the content is professional, strategic, and directly addresses the client's provided information.
`;

        const maxRetries = 3;
        let attempt = 0;
        let lastError = null;

        while (attempt < maxRetries) {
            try {
                const result = await this.model.generateContent(prompt, generationConfig, safetySettings);
                const response = result.response;
                const text = response.text();
                // Clean the response to ensure it's valid JSON
                const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleanedText); // Success, exit the loop
            } catch (error) {
                lastError = error;
                // Check if the error is a retryable server error (5xx)
                if (error.message && (error.message.includes('[503') || error.message.includes('[500'))) {
                    attempt++;
                    if (attempt < maxRetries) {
                        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // Exponential backoff with jitter
                        console.warn(`Gemini model is overloaded. Retrying in ${Math.round(delay / 1000)}s... (Attempt ${attempt}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                } else {
                    // Not a retryable error, break the loop and throw
                    break;
                }
            }
        }

        // If all retries failed
        console.error("Error fetching recommendations from Gemini after multiple retries:", lastError);
        if (lastError.message && lastError.message.includes('[503')) {
             throw new Error("The AI strategist is currently experiencing high demand. Please try again in a few moments.");
        }
        throw new Error("Failed to get recommendations from AI. Please try again.");
    }
}

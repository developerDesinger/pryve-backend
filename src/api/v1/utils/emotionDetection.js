const OpenAI = require("openai");

// Initialize OpenAI client for AI-based emotion detection (only if API key is available)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

class EmotionDetectionService {
  constructor() {
    // No need for ML model properties since we're using AI
  }

  async detectEmotionFallback(message) {
    // Enhanced keyword-based emotion detection with sentiment analysis
    const emotions = {
      joy: [
        "happy",
        "excited",
        "great",
        "wonderful",
        "amazing",
        "love",
        "loved",
        "fantastic",
        "awesome",
        "brilliant",
        "excellent",
        "perfect",
        "delighted",
        "thrilled",
        "ecstatic",
        "cheerful",
        "joyful",
        "glad",
        "pleased",
        "elated",
        "blissful",
        "content",
        "satisfied",
        "proud",
        "grateful",
        "blessed",
        "celebration",
        "victory",
        "success",
        "achievement",
        "win",
        "triumph",
        "relieved",
        "relief",
        "calm",
        "peaceful",
        "serene",
        "light",
        "hopeful",
        "optimistic",
      ],
      sadness: [
        "sad",
        "depressed",
        "down",
        "unhappy",
        "miserable",
        "cry",
        "crying",
        "tears",
        "grief",
        "mourn",
        "sorrow",
        "melancholy",
        "blue",
        "gloomy",
        "heartbroken",
        "devastated",
        "disappointed",
        "hurt",
        "pain",
        "suffering",
        "loss",
        "defeat",
        "failure",
        "regret",
        "lonely",
        "empty",
        "hopeless",
        "drained",
        "tired",
        "heavy",
        "exhausted",
        "weary",
        "numb",
      ],
      anger: [
        "angry",
        "mad",
        "furious",
        "rage",
        "hate",
        "annoyed",
        "irritated",
        "frustrated",
        "outraged",
        "livid",
        "enraged",
        "incensed",
        "fuming",
        "seething",
        "upset",
        "disgusted",
        "hostile",
        "aggressive",
        "violent",
        "betrayed",
        "cheated",
        "lied",
        "unfair",
        "injustice",
        "wronged",
        "resentful",
        "boundary",
        "disrespect",
        "ignored",
        "unheard",
      ],
      fear: [
        "scared",
        "afraid",
        "fear",
        "terrified",
        "worried",
        "anxious",
        "nervous",
        "panic",
        "frightened",
        "alarmed",
        "concerned",
        "uneasy",
        "apprehensive",
        "dread",
        "horror",
        "threatened",
        "vulnerable",
        "unsafe",
        "dangerous",
        "risky",
        "uncertain",
        "unknown",
        "future",
        "what if",
        "maybe",
        "doubt",
        "worry",
        "insecure",
        "hesitant",
      ],
      surprise: [
        "surprised",
        "shocked",
        "amazed",
        "wow",
        "incredible",
        "unbelievable",
        "stunned",
        "astonished",
        "bewildered",
        "startled",
        "astounded",
        "flabbergasted",
        "unexpected",
        "sudden",
        "out of nowhere",
        "never saw",
        "unprecedented",
        "remarkable",
        "extraordinary",
        "phenomenal",
        "eye opening",
        "realized",
        "realisation",
        "clarity",
      ],
      disgust: [
        "disgusted",
        "revolted",
        "sick",
        "nauseated",
        "repulsed",
        "gross",
        "yuck",
        "revolting",
        "repugnant",
        "abhorrent",
        "loathsome",
        "vile",
        "nasty",
        "filthy",
        "dirty",
        "contaminated",
        "corrupted",
        "tainted",
      ],
    };

    const text = message.toLowerCase();
    let emotionScores = {};
    let totalScore = 0;

    // Calculate scores for each emotion
    for (const [emotion, keywords] of Object.entries(emotions)) {
      let score = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          // Weight longer keywords more heavily
          score += keyword.length > 5 ? 2 : 1;
        }
      }
      emotionScores[emotion] = score;
      totalScore += score;
    }

    // Find the emotion with the highest score
    let maxScore = 0;
    let detectedEmotion = "neutral";

    for (const [emotion, score] of Object.entries(emotionScores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedEmotion = emotion;
      }
    }

    // Calculate confidence based on score distribution
    let confidence = 0.5;
    if (maxScore > 0) {
      const normalizedScore = Math.min(maxScore / 3, 1);
      const scoreRatio = totalScore > 0 ? maxScore / totalScore : 0;
      confidence = Math.max(normalizedScore, scoreRatio);
    }

    // Check for intensity indicators
    const intensityWords = [
      "very",
      "extremely",
      "incredibly",
      "absolutely",
      "completely",
      "totally",
    ];
    const hasIntensity = intensityWords.some((word) => text.includes(word));
    if (hasIntensity && maxScore > 0) {
      confidence = Math.min(confidence + 0.2, 1);
    }

    // Check for negation (might indicate opposite emotion)
    const negationWords = [
      "not",
      "don't",
      "doesn't",
      "won't",
      "can't",
      "isn't",
      "aren't",
    ];
    const hasNegation = negationWords.some((word) => text.includes(word));
    if (hasNegation && maxScore > 0) {
      confidence = Math.max(confidence - 0.1, 0.3);
    }

    return {
      emotion: detectedEmotion,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  async detectEmotionWithAI(message) {
    if (!openai) {
      throw new Error("OpenAI client not initialized");
    }

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are Pryve's emotion analyst. Classify the dominant feeling in the user text so we can power the Journey cards (Heart-to-hearts, Growth Moments, Breakthrough Days, Goals Achieved).

Return JSON only:
{
  "emotion": "joy | sadness | anger | fear | surprise | disgust | neutral",
  "confidence": 0-1 number,
  "reasoning": "short explanation referencing words or tone"
}

Guidelines:
- joy: pride, gratitude, relief, peace, optimism, connection, clarity.
- sadness: grief, heaviness, exhaustion, vulnerability, loneliness.
- anger: frustration, resentment, boundary-setting, feeling ignored or disrespected.
- fear: anxiety, hesitation, uncertainty, worry about outcomes.
- surprise: new insight, realization, shift in perspective, anything unexpected or eye-opening.
- disgust: revulsion, moral outrage, rejection.
- neutral: factual, calm narration without emotional charge.

Always pick the closest of these seven categories, even if the wording is subtle. Prefer higher confidence when the language is explicit, lower when mixed.`,
          },
          {
            role: "user",
            content: `Analyze the emotion in this text: "${message}"`,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        try {
          const result = JSON.parse(response);
          return {
            emotion: result.emotion,
            confidence: parseFloat(result.confidence) || 0.8,
            reasoning: result.reasoning,
          };
        } catch (parseError) {
          console.log("Failed to parse AI response, using fallback");
          return await this.detectEmotionFallback(message);
        }
      }
    } catch (error) {
      console.error("AI emotion detection failed:", error.message);
    }

    return await this.detectEmotionFallback(message);
  }

  async detectEmotion(message) {
    try {
      if (
        !message ||
        typeof message !== "string" ||
        message.trim().length === 0
      ) {
        return {
          emotion: "neutral",
          confidence: 0.5,
        };
      }

      // Use AI-based emotion detection if OpenAI is available
      if (openai) {
        try {
          return await this.detectEmotionWithAI(message);
        } catch (aiError) {
          console.log("AI emotion detection failed, using keyword fallback...");
        }
      } else {
        console.log("OpenAI not available, using keyword-based detection");
      }

      // Fallback to keyword-based detection
      return await this.detectEmotionFallback(message);
    } catch (error) {
      console.error("Emotion detection error:", error);
      return await this.detectEmotionFallback(message);
    }
  }

  // Check if AI is available
  isAIAvailable() {
    return openai !== null;
  }

  // Batch emotion detection for multiple messages
  async detectEmotionsBatch(messages) {
    try {
      const results = [];

      for (const message of messages) {
        if (
          message &&
          typeof message === "string" &&
          message.trim().length > 0
        ) {
          const result = await this.detectEmotion(message);
          results.push(result);
        } else {
          results.push({
            emotion: "neutral",
            confidence: 0.5,
          });
        }
      }

      return results;
    } catch (error) {
      console.error("Batch emotion detection error:", error);
      // Return neutral emotions for all messages on error
      return messages.map(() => ({
        emotion: "neutral",
        confidence: 0.5,
      }));
    }
  }
}

// Export singleton instance
module.exports = new EmotionDetectionService();

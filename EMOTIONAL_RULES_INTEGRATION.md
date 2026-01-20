# Emotional Rules Integration

## Overview

The emotional rules system has been successfully integrated into the AI chat prompts. This ensures that every AI response follows the configured emotional response guidelines based on user emotions and triggers.

## How It Works

### 1. Database Storage
- **Table**: `emotional_rules` (EmotionalRule model)
- **Fields**:
  - `trigger`: The emotion/keyword that triggers the rule (e.g., "anxiety", "stress")
  - `responseType`: Type of response (e.g., "Empathetic response")
  - `tone`: Response tone (e.g., "Warm & supportive")
  - `description`: Detailed description of the rule
  - `isActive`: Boolean to enable/disable the rule
  - `priority`: Priority level (higher number = higher priority)

### 2. Integration Points

#### A. Chat Creation (`createChat`)
- When creating a new chat, emotional rules are automatically integrated into the system prompt
- The base system prompt is enhanced with active emotional rules

#### B. Message Sending (`sendMessage`)
- Every message sent to AI includes emotional rules in the system prompt
- Rules are dynamically matched against user message content
- Priority rules are highlighted when specific triggers are detected

#### C. Streaming Messages (`sendMessageStream`)
- Streaming responses also include emotional rules
- Same logic as regular messages but optimized for real-time streaming

### 3. Service Architecture

#### EmotionalPromptService
Located: `src/api/v1/services/emotionalPrompt.service.js`

**Key Methods:**
- `getEmotionalRulesForPrompt()`: Fetches active rules and formats them for AI prompt
- `getMatchingEmotionalRules(userMessage)`: Finds rules that match specific user content
- `buildEnhancedSystemPrompt(basePrompt, userMessage)`: Combines base prompt with emotional rules

#### Integration in ChatService
- Import: `const EmotionalPromptService = require("./emotionalPrompt.service");`
- Enhanced prompts are built using `EmotionalPromptService.buildEnhancedSystemPrompt()`

### 4. Prompt Structure

The enhanced system prompt follows this structure:

```
[Base System Prompt]

EMOTIONAL RESPONSE GUIDELINES:
You must follow these emotional response rules when interacting with users:

- When user expresses "anxiety": Use Empathetic response with Warm & supportive tone. [Description]
- When user expresses "stress": Use Calming response with Gentle & reassuring tone. [Description]
[... more rules ...]

IMPORTANT: These rules take priority over general conversation guidelines. Always match your response tone and type to the user's emotional state as defined above.

[If specific triggers detected in user message:]
IMMEDIATE PRIORITY RULES FOR THIS MESSAGE:
- PRIORITY RULE: User is expressing "anxiety" - Respond with Empathetic response using Warm & supportive tone. [Description]
```

### 5. Performance Optimizations

- **Caching**: AI config is cached for 5 minutes to reduce database queries
- **Parallel Processing**: Emotional rules are fetched in parallel with other operations
- **Non-blocking**: Rule processing doesn't block the main response flow
- **Error Handling**: Graceful fallback to base prompt if rule processing fails

### 6. API Endpoints

The emotional rules can be managed through these endpoints:
- `GET /api/v1/emotional-rules` - Get all rules
- `POST /api/v1/emotional-rules` - Create new rule
- `PATCH /api/v1/emotional-rules/:id` - Update rule
- `DELETE /api/v1/emotional-rules/:id` - Delete rule
- `PATCH /api/v1/emotional-rules/:id/toggle` - Toggle rule active status

### 7. Testing

Run the integration test:
```bash
node test-emotional-rules-integration.js
```

This test verifies:
- ✅ Rules are fetched from database
- ✅ Rules are formatted correctly for AI prompt
- ✅ Matching logic works for specific triggers
- ✅ Enhanced prompts are built successfully

### 8. Logging

The system logs emotional rule integration:
- `🎭 EMOTIONAL RULES: Enhanced prompt length: X chars`
- `🎭 STREAMING EMOTIONAL RULES: Enhanced prompt length: X chars`

### 9. Admin Panel Integration

The admin panel (shown in your screenshot) allows:
- ✅ Creating new emotional response rules
- ✅ Setting triggers, response types, and tones
- ✅ Enabling/disabling rules
- ✅ Managing rule priorities

### 10. Benefits

1. **Consistent Emotional Responses**: AI always follows configured emotional guidelines
2. **Dynamic Adaptation**: Rules are applied based on user's current emotional state
3. **Priority System**: Important rules take precedence
4. **Real-time Updates**: Changes in admin panel immediately affect AI responses
5. **Non-disruptive**: Integration doesn't affect existing functionality
6. **Performance Optimized**: Minimal impact on response times

## Usage Example

1. Admin creates rule: Trigger="anxiety", ResponseType="Empathetic response", Tone="Warm & supportive"
2. User sends message: "I'm feeling really anxious about my presentation tomorrow"
3. System detects "anxiety" trigger
4. AI receives enhanced prompt with specific emotional guidelines
5. AI responds with empathetic, warm, and supportive tone as configured

## Troubleshooting

- **No rules applied**: Check if rules are marked as `isActive: true`
- **Rules not matching**: Verify trigger keywords match user message content
- **Performance issues**: Check if too many rules are active (consider priority optimization)
- **Prompt too long**: Monitor enhanced prompt length and optimize if needed

## Future Enhancements

- **Machine Learning**: Automatic emotion detection to trigger rules
- **Context Awareness**: Rules based on conversation history
- **User Preferences**: Personalized emotional response preferences
- **Analytics**: Track rule effectiveness and usage statistics
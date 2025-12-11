# Message Windowing & Token Tracking Implementation

## Overview
This document outlines the implementation of two key features:
1. **Configurable Message Window Size** - Limits the number of messages sent to the LLM
2. **Token Usage Tracking** - Tracks and displays token consumption in conversations

## Features Implemented

### 1. Message Window Configuration

#### Backend Changes
- **`server/src/config/env.ts`**: Added `MESSAGE_WINDOW_SIZE` environment variable (default: 10)
- **`server/src/services/chatService.ts`**: Implemented message windowing logic that:
  - Preserves all system messages
  - Limits non-system messages to the last N messages (configurable)
  - Applies windowing before sending to OpenAI API

#### Configuration
```env
# .env file
MESSAGE_WINDOW_SIZE=10  # Default value, adjust as needed
```

#### How It Works
1. System messages (role: 'system') are always preserved
2. User and assistant messages are limited to the last N messages
3. This prevents token limit exceeded errors on long conversations
4. Reduces API costs by sending fewer tokens per request

### 2. Token Usage Tracking

#### Backend Changes
- **`server/src/types/api.ts`**: Added `ChatResponse` interface with usage tracking
- **`server/src/routes/chat.ts`**: Modified to return token usage data
- **`server/src/services/chatService.ts`**: Captures and returns token usage from OpenAI API

#### Frontend Changes
- **`client/src/context/ChatContext.tsx`**: 
  - Added `totalTokens` state management
  - Added persistence to localStorage
  - Extended `Message` interface to include usage data
- **`client/src/components/ChatInterface.tsx`**: 
  - Integrated token tracking in API calls
  - Updates total token count after each response
  - Includes token data in export functionality
- **`client/src/components/ExportDialog.tsx`**: 
  - Enhanced with conversation statistics display
  - Shows total tokens, message count, duration, and average tokens per message

#### Token Tracking Features
1. **Real-time Tracking**: Accumulates tokens from each API call
2. **Persistence**: Token count survives browser refreshes
3. **Export Integration**: Token statistics included in conversation exports
4. **Visual Display**: Beautiful statistics panel in export dialog

## API Response Format

### Before
```json
{
  "role": "assistant",
  "content": "Response content"
}
```

### After
```json
{
  "role": "assistant",
  "content": "Response content",
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 50,
    "total_tokens": 200
  }
}
```

## Export Data Format

### Enhanced Export Structure
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Message content",
      "timestamp": 1234567890,
      "usage": { /* token usage for assistant responses */ }
    }
  ],
  "totalDurationMs": 300000,
  "totalTokensUsed": 1500,
  "messageCount": 10
}
```

## Benefits

### Message Windowing
- ✅ Prevents token limit exceeded errors
- ✅ Reduces API costs
- ✅ Maintains conversation context with recent messages
- ✅ Configurable per deployment environment

### Token Tracking
- ✅ Cost monitoring and budgeting
- ✅ Performance analysis
- ✅ Usage analytics
- ✅ Conversation efficiency metrics

## Usage Instructions

### For Developers
1. Set `MESSAGE_WINDOW_SIZE` in your `.env` file
2. Deploy and run the application
3. Token tracking happens automatically

### For Users
1. Have conversations as normal
2. Click "Evaluate Conversation" to see token statistics
3. Export includes detailed usage data
4. Token count persists across browser sessions

## Configuration Examples

### Development Environment
```env
MESSAGE_WINDOW_SIZE=5  # Smaller window for testing
```

### Production Environment
```env
MESSAGE_WINDOW_SIZE=15  # Larger window for better context
```

### Cost-Conscious Setup
```env
MESSAGE_WINDOW_SIZE=8   # Balance between context and cost
```

## Technical Details

### Message Window Logic
1. Filter messages by role (system vs non-system)
2. Keep all system messages
3. Apply `.slice(-windowSize)` to non-system messages
4. Combine for final API call

### Token Accumulation
1. Capture usage data from OpenAI response
2. Add to running total in React state
3. Persist to localStorage
4. Display in export statistics

### Timer Logic
1. Timer starts when the **first user message** is added (voice input captured)
2. Timer stops when "Evaluate Conversation" is clicked
3. Duration = end time - first user message timestamp
4. Shows 0:00 if no user messages were sent
5. Measures actual conversation time, not idle session time

### Error Handling
- Graceful fallback if token data unavailable
- Maintains functionality without usage statistics
- Preserves existing behavior for compatibility
- Shows 0:00 duration if no user interaction occurred

## Future Enhancements

1. **Token Budget Alerts**: Warn users when approaching limits
2. **Per-Conversation Tracking**: Separate token counts per conversation
3. **Usage Analytics**: Historical usage patterns and trends
4. **Smart Windowing**: Intelligent message selection based on relevance
5. **Token Cost Estimation**: Display estimated costs based on token usage

---

*Implementation completed on June 13, 2025*

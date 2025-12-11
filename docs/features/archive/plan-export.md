# Enhanced Evaluation Export Format

## Overview

The "Evaluate Conversation" button now exports comprehensive conversation data designed for scenario-based evaluation. This includes all context information, conversation details, performance statistics, and suggested evaluation criteria.

## Export Data Structure

### 1. Metadata
```json
{
  "exportTimestamp": 1703123456789,
  "conversationId": "conv_1703123400000_1703123456789"
}
```

### 2. Context Information
All the scenario setup information used during the conversation:

```json
{
  "context": {
    "persona": {
      "id": "apartment-resident",
      "name": "Apartment Resident",
      "description": "Urban or suburban apartment resident"
    },
    "scenario": {
      "id": "technical-support",
      "name": "Technical Support Call",
      "description": "Customer calling for internet connectivity issues"
    },
    "mood": {
      "mood": "frustrated",
      "description": "Customer is experiencing service issues and feeling frustrated"
    },
    "template": {
      "id": "customer-service",
      "name": "Customer Service Agent",
      "systemPrompt": "You are a helpful customer service representative..."
    },
    "voice": "en-US-JennyNeural",
    "generatedName": {
      "full": "Sarah Thompson",
      "gender": "female"
    }
  }
}
```

### 3. Conversation Data
Complete conversation history with detailed message information:

```json
{
  "conversation": {
    "messages": [
      {
        "role": "system",
        "content": "System prompt...",
        "timestamp": 1703123400000
      },
      {
        "role": "user", 
        "content": "Hi, my internet isn't working",
        "timestamp": 1703123410000
      },
      {
        "role": "assistant",
        "content": "I'm sorry to hear about the connectivity issues...",
        "timestamp": 1703123415000,
        "usage": {
          "prompt_tokens": 45,
          "completion_tokens": 32,
          "total_tokens": 77
        }
      }
    ],
    "messageCount": 8,
    "userMessageCount": 4,
    "assistantMessageCount": 4,
    "systemMessageCount": 1
  }
}
```

### 4. Performance Statistics
Comprehensive timing and resource usage data:

```json
{
  "stats": {
    "startTime": 1703123400000,
    "endTime": 1703123456789,
    "totalDurationMs": 56789,
    "durationFormatted": "0:57",
    "totalTokensUsed": 342,
    "averageTokensPerMessage": 43,
    "serverStats": {
      "llmTokenCount": 342,
      "speechDurationSeconds": 45.2,
      "audioCharacterCount": 1250
    }
  }
}
```

### 5. Evaluation Criteria
Dynamic guidance for evaluating the conversation based on the selected scenario:

```json
{
  "evaluationCriteria": {
    "scenarioId": "video-service-xumo-001",
    "personaId": "apartment-resident", 
    "moodType": "frustrated",
    "evaluationNotes": "This export contains comprehensive conversation data for scenario-based evaluation of \"Xumo Box Black Screen Issue\". Use the scenario-specific criteria below for assessment.",
    "suggestedEvaluationAreas": [
      "Identity Validation:",
      "  • Did the agent ask for the caller's name?",
      "  • If the caller was not the account holder, did the agent ask for the account holder's name and relationship?",
      "Troubleshooting Steps:",
      "  • Did the agent ask the customer to unplug and replug the Xumo box?",
      "  • Did the agent attempt to send a signal (HIT)?",
      "  • Did the agent instruct the customer to press and hold the Home button for 5 seconds?",
      "Resolution Confirmation:",
      "  • Did the agent confirm that the issue was resolved before ending the call?",
      "  • Did the agent acknowledge the customer's satisfaction or exit signals?"
    ],
    "scenarioDetails": {
      "title": "Xumo Box Black Screen Issue",
      "description": "Customer is experiencing a black screen with no audio while watching The Righteous Gemstones on their Xumo box using Spectrum (Charter) video service.",
      "scenarioType": "technical_support",
      "difficultyLevel": "moderate",
      "expectedDurationSeconds": 600,
      "exitCriteria": {
        "description": "The conversation should end when the customer (LLM) confirms the issue is resolved and expresses readiness to conclude.",
        "customer_exit_signals": [
          "LLM confirms the Xumo box is now working",
          "LLM expresses satisfaction or relief (e.g., 'It's back on!', 'Finally working!')",
          "LLM thanks the agent or begins to wrap up the conversation",
          "LLM stops expressing concern or frustration"
        ]
      }
    }
  }
}
```

**Note**: Evaluation criteria are now dynamically loaded from the scenario definition. If no scenario is selected or the scenario data cannot be fetched, the system falls back to generic evaluation areas.

## Dynamic Evaluation Criteria

The evaluation areas are now **dynamically loaded** from the selected scenario's definition, providing scenario-specific evaluation criteria rather than generic ones.

### How It Works

1. **Scenario Selection**: When a scenario is selected, its evaluation criteria are stored in the scenario JSON file
2. **Export Time**: During conversation export, the system fetches the full scenario details from the API
3. **Criteria Extraction**: The `evaluation_criteria` object from the scenario is converted into readable evaluation areas
4. **Fallback**: If no scenario is selected or data cannot be fetched, generic criteria are used

### Scenario-Specific Criteria Format

Each scenario JSON file contains an `evaluation_criteria` object with categories and questions:

```json
{
  "evaluation_criteria": {
    "identity_validation": [
      "Did the agent ask for the caller's name?",
      "If the caller was not the account holder, did the agent ask for the account holder's name and relationship?"
    ],
    "troubleshooting_steps": [
      "Did the agent ask the customer to unplug and replug the Xumo box?",
      "Did the agent attempt to send a signal (HIT)?",
      "Did the agent instruct the customer to press and hold the Home button for 5 seconds?"
    ],
    "resolution_confirmation": [
      "Did the agent confirm that the issue was resolved before ending the call?",
      "Did the agent acknowledge the customer's satisfaction or exit signals?"
    ]
  }
}
```

### Fallback Criteria

If scenario data is unavailable, the system uses these generic evaluation areas:

- Persona consistency and role adherence
- Mood appropriateness and emotional tone
- Conversation flow and engagement
- Response quality and relevance
- Token efficiency and performance


Downloaded files are automatically named with descriptive information:

- **With Context**: `evaluation_apartment-resident_technical-support_frustrated_20241215_1430.json`
- **Without Context**: `conversation_20241215_1430.json`

## Usage for Evaluation

### 1. Persona Consistency
- Check if responses align with the selected persona's characteristics
- Verify demographic appropriateness (age group, living situation)
- Assess if behavior patterns match persona definition

### 2. Mood Alignment
- Evaluate if assistant responses appropriately acknowledge the user's mood
- Check for empathetic language when mood indicates frustration or concern
- Assess tone consistency throughout the conversation

### 3. Scenario Achievement
- Determine if the conversation addressed the scenario's core objectives
- Evaluate problem resolution effectiveness
- Assess information gathering and solution provision

### 4. Performance Metrics
- **Token Efficiency**: Average tokens per message for cost analysis
- **Response Time**: Conversation duration for user experience assessment
- **Engagement**: Message count and conversation flow analysis

### 5. Quality Assessment
- Response relevance and accuracy
- Natural conversation flow
- Appropriate use of generated name and persona details
- Voice/speech integration effectiveness

## Backward Compatibility

The export format maintains backward compatibility with the previous simple format. Legacy exports will continue to work, while new exports provide enhanced evaluation capabilities.

## Integration with Analysis Tools

The structured export format is designed to be easily imported into:
- Excel/Google Sheets for statistical analysis
- Python/R scripts for automated evaluation
- Business intelligence tools for reporting
- Custom evaluation frameworks

## Example Evaluation Workflow

1. **Export Conversation**: Click "Evaluate Conversation" to generate comprehensive export
2. **Context Review**: Examine persona, mood, and scenario settings
3. **Performance Analysis**: Review statistics and timing data
4. **Quality Assessment**: Evaluate conversation against suggested criteria
5. **Scoring**: Use evaluation areas to create standardized scores
6. **Reporting**: Compile findings for training or improvement purposes

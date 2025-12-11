# Azure OpenAI Realtime API Implementation

## Overview
This implementation adds Azure OpenAI GPT-4o Realtime API support to enable more responsive voice conversations alongside the existing Azure Speech SDK approach.

## Architecture

### Server-Side Components

#### 1. `server/src/services/realtimeService.ts`
- **Purpose**: Manages WebSocket connections to Azure OpenAI Realtime API
- **Key Features**:
  - Session configuration with system instructions from templates
  - PCM16 24kHz audio streaming (bidirectional)
  - Voice activity detection (VAD) and turn detection
  - Support for multiple voices (alloy, echo, fable, onyx, nova, shimmer)
  - Function calling support (future enhancement)

#### 2. `server/src/routes/realtime.ts`
- **Purpose**: WebSocket proxy between client and Azure OpenAI
- **Endpoint**: `ws://localhost:5000/api/realtime/session`
- **Key Features**:
  - Handles WebSocket upgrade requests
  - Manages active session lifecycle
  - Forwards events between client and Azure
  - Provides session management HTTP endpoint

#### 3. `server/src/index.ts` (Modified)
- **Changes**:
  - Import `http` module for server creation
  - Import `initializeRealtimeWebSocket` from realtime router
  - Create HTTP server wrapping Express app
  - Initialize WebSocket handler before starting server
  - Register `/api/realtime` route

### Client-Side Components

#### 1. `client/src/hooks/useRealtimeConversation.ts`
- **Purpose**: React hook for managing realtime conversations
- **Key Features**:
  - WebSocket connection management
  - Audio capture from microphone (PCM16 24kHz)
  - Audio playback using Web Audio API
  - Message state management
  - Session parameter updates
  - Interrupt/cancel support

### Configuration

#### Environment Variables (Already in `.env`)
```bash
# Azure OpenAI Realtime API Configuration
AZURE_OPENAI_REALTIME_ENDPOINT=https://spectrum-voice-foundry.openai.azure.com/openai
AZURE_OPENAI_REALTIME_KEY=<your-key>
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime
USE_REALTIME_API=true
```

## Implementation Status

### ✅ Completed
1. **Server-side realtime service** (`realtimeService.ts`)
   - WebSocket connection management
   - Session configuration
   - Audio streaming support
   - Template integration for system prompts

2. **WebSocket route** (`realtime.ts`)
   - Proxy between client and Azure
   - Event forwarding
   - Session lifecycle management

3. **Client-side hook** (`useRealtimeConversation.ts`)
   - WebSocket connection
   - Audio capture and playback
   - Message management

4. **Dependencies**
   - Added `ws` and `@types/ws` to server package.json

### 🔄 Remaining Tasks

#### 1. Add Mode Toggle in ChatInterface
**File**: `client/src/components/ChatInterface.tsx`

**Changes Needed**:
```typescript
// Add state for conversation mode
const [conversationMode, setConversationMode] = useState<'speech' | 'realtime'>('speech');
const realtimeConversation = useRealtimeConversation();

// Add toggle UI in ChatHeader or MenuBar
<ToggleButtonGroup value={conversationMode} exclusive onChange={(e, val) => setConversationMode(val)}>
  <ToggleButton value="speech">Azure Speech SDK</ToggleButton>
  <ToggleButton value="realtime">Realtime API</ToggleButton>
</ToggleButtonGroup>

// Conditional logic for voice input
{conversationMode === 'speech' ? (
  <VoiceInputBar isListening={isListening} toggleListening={toggleListening} />
) : (
  <RealtimeVoiceBar 
    isConnected={realtimeConversation.isConnected}
    isListening={realtimeConversation.isListening}
    isSpeaking={realtimeConversation.isSpeaking}
    onConnect={() => realtimeConversation.connect({ voice: selectedVoice, parameters })}
    onDisconnect={realtimeConversation.disconnect}
    onToggleListening={() => realtimeConversation.isListening ? realtimeConversation.stopListening() : realtimeConversation.startListening()}
  />
)}
```

#### 2. Create RealtimeVoiceBar Component
**File**: `client/src/components/RealtimeVoiceBar.tsx` (NEW)

Similar to `VoiceInputBar.tsx` but with:
- Connect/Disconnect button
- Listen toggle (mic icon)
- Speaking indicator
- Status display

#### 3. Update Environment Configuration
**File**: `server/src/config/env.ts`

Add:
```typescript
azureOpenAIRealtimeEndpoint: process.env.AZURE_OPENAI_REALTIME_ENDPOINT,
azureOpenAIRealtimeKey: process.env.AZURE_OPENAI_REALTIME_KEY,
azureOpenAIRealtimeDeployment: process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT || 'gpt-4o-realtime-preview',
useRealtimeAPI: process.env.USE_REALTIME_API === 'true'
```

#### 4. Install Dependencies
```bash
cd server
npm install

cd ../client
npm install
```

#### 5. Build and Deploy
```bash
# Build server
cd server
npm run build

# Build client
cd ../client
npm run build

# Deploy using existing script
.\deploy-appservice.ps1 -ResourceGroupName spectrum-realtime-apps-rg -SubscriptionId <id> -ServerAppName udy-voice-ai-server-native2 -ClientAppName udy-voice-ai-client-native
```

## Testing Plan

### 1. Test Azure Speech Mode (Verify No Regression)
- Start conversation with existing STT → LLM → TTS flow
- Verify voice recognition works
- Verify AI responses play correctly
- Verify scenario parameters apply

### 2. Test Realtime API Mode
- Toggle to "Realtime API" mode
- Click Connect button
- Start speaking
- Verify:
  - Audio is captured and streamed
  - AI responds with voice
  - Transcripts appear in chat
  - Interruption works
  - Session parameters apply

### 3. Test Mode Switching
- Switch from Speech to Realtime mid-conversation
- Verify clean disconnection
- Switch back to Speech
- Verify both modes work independently

## API Flow Diagrams

### Traditional Azure Speech Flow
```
Client → Microphone → WAV → Server (STT) → Text
                                       ↓
                                   Azure OpenAI LLM
                                       ↓
                              Text Response → TTS → Audio
                                       ↓
Client ← Audio Player ← MP3 ← Server
```

### Realtime API Flow
```
Client → Microphone → PCM16 Audio Stream
            ↓
        WebSocket (bidirectional)
            ↓
Server Proxy → Azure OpenAI Realtime API
            ↓
  Audio + Transcript (simultaneous)
            ↓
Client ← Audio Playback + Chat Display
```

## Benefits of Realtime API

1. **Lower Latency**: Single WebSocket connection vs 3 separate API calls
2. **More Natural**: Voice activity detection handles turn-taking
3. **Interruption**: Can interrupt AI mid-response
4. **Simultaneous**: Transcription and audio generation happen together
5. **Context Awareness**: API maintains full conversation context

## Compatibility

- Both modes can coexist
- No changes to existing Azure Speech functionality
- Client can switch modes without page reload
- Scenario parameters work in both modes
- Authentication applies to both modes

## Next Steps

1. Complete UI toggle implementation
2. Create `RealtimeVoiceBar` component
3. Update config files
4. Test locally with `npm run dev`
5. Deploy to Azure
6. Conduct side-by-side comparison

## Files Modified

### Server
- ✅ `server/package.json` - Added ws dependency
- ✅ `server/src/index.ts` - Registered WebSocket
- ✅ `server/src/routes/realtime.ts` - NEW
- ✅ `server/src/services/realtimeService.ts` - NEW
- ⏳ `server/src/config/env.ts` - Add realtime config

### Client
- ✅ `client/src/hooks/useRealtimeConversation.ts` - NEW
- ⏳ `client/src/components/ChatInterface.tsx` - Add mode toggle
- ⏳ `client/src/components/RealtimeVoiceBar.tsx` - NEW

## Support

Both conversation modes will be maintained going forward:
- **Azure Speech SDK**: Proven, reliable, good for controlled environments
- **Realtime API**: Cutting-edge, low-latency, more natural conversations

Users can choose based on their needs.

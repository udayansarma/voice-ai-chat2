import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { config } from '../config/env';

export async function generateSpeech(text: string, voiceGender?: 'male' | 'female', voiceName?: string): Promise<Buffer> {  // Determine voice
  let resolvedVoiceName: string;
  if (voiceName) {
    // Map UI value to Azure full voice name
    if (voiceName === 'JennyNeural') resolvedVoiceName = 'en-US-JennyNeural';
    else if (voiceName === 'AndrewNeural') resolvedVoiceName = 'en-US-AndrewNeural';
    else if (voiceName === 'FableNeural') resolvedVoiceName = 'en-US-FableTurboMultilingualNeural';
    else if (voiceName === 'en-US-Alloy:DragonHDLatestNeural') resolvedVoiceName = 'en-US-Alloy:DragonHDLatestNeural';
    else resolvedVoiceName = voiceGender === 'male' ? 'en-US-AndrewNeural' : 'en-US-JennyNeural';
  } else {
    resolvedVoiceName = voiceGender === 'male' ? 'en-US-AndrewNeural' : 'en-US-JennyNeural';
  }
  console.log(`[TTS] Using Azure voice: ${resolvedVoiceName}`);
  return new Promise((resolve, reject) => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      config.azureSpeechKey,
      config.azureSpeechRegion
    );
    speechConfig.speechSynthesisVoiceName = resolvedVoiceName;
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3;
    const speechSynthesizer = new sdk.SpeechSynthesizer(speechConfig);
    const ssml = `
      <speak version="1.0" xml:lang="en-US">
        <voice name="${resolvedVoiceName}">
          ${text}
        </voice>
      </speak>
    `;
    speechSynthesizer.speakSsmlAsync(
      ssml,
      (result: any) => {
        speechSynthesizer.close();
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted && result.audioData) {
          resolve(Buffer.from(result.audioData));
        } else {
          const errorMsg = result.errorDetails || 'Unknown error in speech synthesis';
          reject(new Error(`Speech synthesis failed: ${errorMsg}`));
        }
      },
      (error: any) => {
        speechSynthesizer.close();
        reject(new Error(error.message || 'Speech synthesis failed'));
      }
    );
  });
}

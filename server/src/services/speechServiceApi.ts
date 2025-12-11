// Use require for speech SDK to bypass missing type declarations
const sdk: any = require('microsoft-cognitiveservices-speech-sdk');
import { processAudioForSpeechRecognition } from '../speechService';
import { generateSpeech } from './speechUtil';
import { config } from '../config/env';
import statsService from './statsService';

export async function recognizeSpeech(audioData: string) {
  if (!audioData) throw new Error('No audio data provided');
  return await processAudioForSpeechRecognition(audioData);
}

export async function synthesizeSpeech(text: string, voiceGender?: 'male' | 'female', voiceName?: string) {
  if (!text) throw new Error('No text provided');
  // Record synthesized audio character count
  statsService.recordAudioChars(text.length);
  return await generateSpeech(text, voiceGender, voiceName);
}

export async function synthesizeSpeechStream(text: string, voiceGender: 'male' | 'female' | undefined, res: any, voiceName?: string) {
  if (!text) throw new Error('No text provided');
  // Record synthesized audio character count
  statsService.recordAudioChars(text.length);  let resolvedVoiceName: string;
  if (voiceName) {
    if (voiceName === 'JennyNeural') resolvedVoiceName = 'en-US-JennyNeural';
    else if (voiceName === 'AndrewNeural') resolvedVoiceName = 'en-US-AndrewNeural';
    else if (voiceName === 'FableNeural') resolvedVoiceName = 'en-US-FableNeural';
    else if (voiceName === 'en-US-Alloy:DragonHDLatestNeural') resolvedVoiceName = 'en-US-Alloy:DragonHDLatestNeural';
    else resolvedVoiceName = voiceGender === 'male' ? 'en-US-AndrewNeural' : 'en-US-JennyNeural';
  } else {
    resolvedVoiceName = voiceGender === 'male' ? 'en-US-AndrewNeural' : 'en-US-JennyNeural';
  }
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    config.azureSpeechKey,
    config.azureSpeechRegion
  );
  speechConfig.speechSynthesisVoiceName = resolvedVoiceName;
  speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Raw16Khz16BitMonoPcm;
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Transfer-Encoding', 'chunked');
  const pushStream = sdk.AudioOutputStream.createPullStream();
  const audioConfig = sdk.AudioConfig.fromStreamOutput(pushStream);
  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
  const ssml = `
    <speak version="1.0" xml:lang="en-US">
      <voice name="${resolvedVoiceName}">
        ${text}
      </voice>
    </speak>
  `;
  let responseEnded = false;
  synthesizer.speakSsmlAsync(
    ssml,
    (result: any) => {
      synthesizer.close();
    },
    (error: any) => {
      synthesizer.close();
      if (!responseEnded) {
        responseEnded = true;
        res.status(500).json({ error: 'Speech synthesis failed' });
      }
    }
  );
  const buffer = Buffer.alloc(4096);
  (async function readAndSend() {
    let bytesRead = await pushStream.read(buffer);
    while (bytesRead > 0) {
      if (!responseEnded) {
        res.write(buffer.slice(0, bytesRead));
      }
      bytesRead = await pushStream.read(buffer);
    }
    if (!responseEnded) {
      responseEnded = true;
      res.end();
    }
  })();
}

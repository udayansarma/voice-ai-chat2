// Use require for speech SDK (no type declarations available)
const sdk: any = require('microsoft-cognitiveservices-speech-sdk');
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import statsService from './services/statsService';

// Function to perform speech recognition
async function performSpeechRecognition(wavFilePath: string): Promise<any> {
  console.log('Starting speech recognition for:', wavFilePath);
  console.log('Azure Speech Key:', process.env.AZURE_SPEECH_KEY ? `${process.env.AZURE_SPEECH_KEY.substring(0, 8)}...` : 'MISSING');
  console.log('Azure Speech Region:', process.env.AZURE_SPEECH_REGION || 'MISSING');
  
  const audioConfig = sdk.AudioConfig.fromWavFileInput(await fsExtra.readFile(wavFilePath));
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    process.env.AZURE_SPEECH_KEY || '',
    process.env.AZURE_SPEECH_REGION || ''
  );
  speechConfig.speechRecognitionLanguage = 'en-US';

  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  try {
    return await new Promise<any>((resolve, reject) => {
      let isCompleted = false;

      recognizer.recognizeOnceAsync(
        (result: any) => {
          isCompleted = true;
          resolve(result);
        },
        (error: any) => {
          if (!isCompleted) {
            reject(error);
          }
        }
      );

      setTimeout(() => {
        if (!isCompleted) {
          recognizer.stopContinuousRecognitionAsync();
          reject(new Error('Recognition timeout'));
        }
      }, 10000);
    });
  } finally {
    recognizer.close();
  }
}

export async function processAudioForSpeechRecognition(audioData: string): Promise<string> {
  console.log('processAudioForSpeechRecognition called with audioData length:', audioData?.length || 'undefined');
  
  if (!audioData) {
    console.error('No audio data provided');
    throw new Error('No audio data provided');
  }

  const tempDir = path.join(__dirname, 'temp');
  await fsExtra.ensureDir(tempDir);

  const timestamp = Date.now().toString();
  const inputPath = path.join(tempDir, `input-${timestamp}.wav`);

  try {
    // Decode and save WAV directly from client
    const audioBuffer = Buffer.from(audioData, 'base64');
    // Save raw audio for recognition
    if (audioBuffer.length === 0) {
      throw new Error('Empty audio data provided');
    }
    await fsExtra.writeFile(inputPath, audioBuffer);
  } catch (error) {
    throw new Error('Invalid audio data format');
  }

  try {
    const result = await performSpeechRecognition(inputPath);
    if (result.reason === sdk.ResultReason.RecognizedSpeech) {
      const text = result.text.trim();
      if (!text) {
        throw new Error('No speech was detected in the audio');
      }
      // Record actual speech duration from recognition result (ticks -> seconds)
      const durationSec = (result.duration ?? 0) / 10000000;
      statsService.recordSpeechDuration(durationSec);
      return text;
    } else if (result.reason === sdk.ResultReason.NoMatch) {
      const noMatchDetail = sdk.NoMatchDetails.fromResult(result);
      let errorMessage = 'Failed to recognize speech: ';
      switch (noMatchDetail.reason) {
        case sdk.NoMatchReason.NotRecognized:
          errorMessage += 'Speech was detected but not recognized. Please speak clearly and try again.';
          break;
        case sdk.NoMatchReason.InitialSilenceTimeout:
          errorMessage += 'No speech was detected. Please check your microphone and try again.';
          break;
        default:
          errorMessage += 'Unable to process speech. Please try again.';
      }
      throw new Error(errorMessage);
    } else {
      throw new Error(`Speech recognition failed: ${result.reason}`);
    }
  } finally {
    // Clean up temp file
    try {
      await fsExtra.remove(inputPath).catch(() => {});
    } catch (err) {
      console.error('Error cleaning up temp file:', err);
    }
  }
}

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export interface STTConfig {
  lang?: string;
  interimResults?: boolean;
  continuous?: boolean;
}

const DEFAULT_CONFIG: STTConfig = {
  lang: 'en-US',
  interimResults: true,
  continuous: false,
};

export async function checkSTTAvailability(): Promise<boolean> {
  try {
    const services = await ExpoSpeechRecognitionModule.getSupportedLocales({});
    return services.locales.length > 0;
  } catch {
    return false;
  }
}

export async function requestSTTPermission(): Promise<boolean> {
  try {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

export async function getSTTPermissionStatus(): Promise<boolean> {
  try {
    const result = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

export async function startSTT(config: STTConfig = {}): Promise<void> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  await ExpoSpeechRecognitionModule.start({
    lang: mergedConfig.lang,
    interimResults: mergedConfig.interimResults,
    continuous: mergedConfig.continuous,
    volumeChangeEventOptions: {
      enabled: true,
      intervalMillis: 100,
    },
  });
}

export async function stopSTT(): Promise<void> {
  await ExpoSpeechRecognitionModule.stop();
}

export async function abortSTT(): Promise<void> {
  await ExpoSpeechRecognitionModule.abort();
}

export { useSpeechRecognitionEvent };

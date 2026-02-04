// Conditionally import expo-speech-recognition (only available in dev builds, not Expo Go)
let ExpoSpeechRecognitionModule: {
  start: (options: Record<string, unknown>) => Promise<void>;
  stop: () => Promise<void>;
  abort: () => Promise<void>;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  getPermissionsAsync: () => Promise<{ granted: boolean }>;
  getSupportedLocales: (options: Record<string, unknown>) => Promise<{ locales: string[] }>;
} | null = null;

let useSpeechRecognitionEventInternal: (<T>(event: string, callback: (event: T) => void) => void) | null = null;

try {
  const speechRecognition = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechRecognition.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEventInternal = speechRecognition.useSpeechRecognitionEvent;
} catch {
  console.warn('expo-speech-recognition not available - voice input disabled');
}

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

export function isSTTModuleAvailable(): boolean {
  return ExpoSpeechRecognitionModule !== null;
}

export async function checkSTTAvailability(): Promise<boolean> {
  if (!ExpoSpeechRecognitionModule) return false;
  try {
    const services = await ExpoSpeechRecognitionModule.getSupportedLocales({});
    return services.locales.length > 0;
  } catch {
    return false;
  }
}

export async function requestSTTPermission(): Promise<boolean> {
  if (!ExpoSpeechRecognitionModule) return false;
  try {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

export async function getSTTPermissionStatus(): Promise<boolean> {
  if (!ExpoSpeechRecognitionModule) return false;
  try {
    const result = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

export async function startSTT(config: STTConfig = {}): Promise<void> {
  if (!ExpoSpeechRecognitionModule) {
    throw new Error('Speech recognition not available');
  }
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
  if (!ExpoSpeechRecognitionModule) return;
  await ExpoSpeechRecognitionModule.stop();
}

export async function abortSTT(): Promise<void> {
  if (!ExpoSpeechRecognitionModule) return;
  await ExpoSpeechRecognitionModule.abort();
}

// Export a wrapper that's safe to call even if module not available
export function useSpeechRecognitionEvent<T>(event: string, callback: (event: T) => void): void {
  if (useSpeechRecognitionEventInternal) {
    useSpeechRecognitionEventInternal(event, callback);
  }
}

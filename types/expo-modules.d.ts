// Type declarations for expo modules that may not have published types yet

declare module 'expo-speech-recognition' {
  export interface SpeechRecognitionOptions {
    lang?: string;
    interimResults?: boolean;
    continuous?: boolean;
    volumeChangeEventOptions?: {
      enabled: boolean;
      intervalMillis: number;
    };
  }

  export interface PermissionResponse {
    granted: boolean;
    status: string;
    canAskAgain: boolean;
  }

  export interface SupportedLocalesResponse {
    locales: string[];
  }

  export const ExpoSpeechRecognitionModule: {
    start: (options: SpeechRecognitionOptions) => Promise<void>;
    stop: () => Promise<void>;
    abort: () => Promise<void>;
    requestPermissionsAsync: () => Promise<PermissionResponse>;
    getPermissionsAsync: () => Promise<PermissionResponse>;
    getSupportedLocales: (options: Record<string, unknown>) => Promise<SupportedLocalesResponse>;
  };

  export function useSpeechRecognitionEvent<T>(
    event: 'start' | 'end' | 'result' | 'error' | 'volumechange',
    callback: (event: T) => void
  ): void;
}

declare module 'expo-haptics' {
  export enum ImpactFeedbackStyle {
    Light = 'light',
    Medium = 'medium',
    Heavy = 'heavy',
  }

  export enum NotificationFeedbackType {
    Success = 'success',
    Warning = 'warning',
    Error = 'error',
  }

  export function impactAsync(style: ImpactFeedbackStyle): Promise<void>;
  export function notificationAsync(type: NotificationFeedbackType): Promise<void>;
  export function selectionAsync(): Promise<void>;
}

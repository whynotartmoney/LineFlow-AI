
export type EffectType = 'none' | 'glow' | 'glass' | 'metal' | 'neon' | 'sketch' | 'shadow' | 'emboss';

export interface AppState {
  image: string | null;
  pathData: string | null;
  isProcessing: boolean;
  lineColor: string;
  bgColor: string;
  effect: EffectType;
  animationProgress: number; // 0 to 100
  isPlaying: boolean;
}

export interface GeminiResponse {
  path: string;
  description: string;
}

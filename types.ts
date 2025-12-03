

export interface SlideSticker {
  url: string;
  label: string;
  scale: number;
  fontSize?: number; // Font size in pixels
}

export interface Slide {
  id: string;
  type: 'intro' | 'content';
  title: string;
  content: string[]; // Bullet points or paragraph
  images: string[]; // Base64 strings for inline illustrations
  stickerLeft?: SlideSticker;
  stickerRight?: SlideSticker;
  generatedImageUrl?: string; // Preview image for this specific slide
}

export interface ViralContent {
  caption: string;
  slides: Slide[];
}

export interface GeneratedImage {
  id: string;
  url: string;
  slide: Slide;
}

export enum AppStep {
  INPUT = 0,
  PLANNING = 1,
  GENERATION = 2,
}

export interface StyleConfig {
  backgroundId: string; // 'preset-x', 'custom', 'solid'
  backgroundImageUrl?: string; // The actual URL to load for presets
  customBackground?: string; // Base64 for user uploads
  backgroundColor?: string; // Hex code for solid background
  titleFont: string;
  bodyFont: string;
  overlayColor?: string;
  overlayOpacity?: number; // 0-100
  showSlideNumbers?: boolean;
  slideNumberPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  autoNavigation?: boolean;
}

export type SignatureMode = 'simple' | 'rich';

export interface SignatureConfig {
  mode: SignatureMode;
  simpleText: string;
  richConfig: {
    avatarUrl: string;
    name: string;
    isVerified: boolean;
    tagline: string;
  };
}

export interface CanvasConfig {
  width: number;
  height: number;
  padding: number;
  signature: SignatureConfig;
  style: StyleConfig;
}
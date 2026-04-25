export const THEME = {
  colors: {
    bgGradientStart: 0xffe9f3,
    bgGradientEnd: 0xe6f3ff,
    surface: 0xfffbf7,
    snakeDark: 0x3ecf8e,
    snakeLight: 0x7be495,
    apple: 0xff4d6d,
    appleLight: 0xff7a8a,
    berry: 0xa855f7,
    berryLight: 0xc084fc,
    star: 0xfbbf24,
    starLight: 0xfde68a,
    obstacle: 0xfbbf24,
    accentPurple: 0x7a5cff,
    text: 0x1a1a1a,
    blush: 0xff4d6d
  },
  font: {
    family: '"Nunito", system-ui, sans-serif',
    weightHud: 800,
    weightButton: 600,
    weightBody: 400
  },
  easings: {
    snakeMove: 'Cubic.easeOut',
    foodPop: 'Back.easeOut',
    bannerSlide: 'Quart.easeOut'
  }
} as const;

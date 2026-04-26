export const THEME = {
  colors: {
    // Background remains pastel for breathing room
    bgGradientStart: 0xffe9f3,
    bgGradientEnd: 0xe6f3ff,
    surface: 0xfffbf7,
    // Brighter, candy-saturated accents (per UI research; pastels read babyish past 7)
    snakeDark: 0x2ba855,
    snakeLight: 0x3fd16c,
    apple: 0xff4fa3,        // hot candy pink
    appleLight: 0xff85bd,
    berry: 0x8a5be0,        // grape purple
    berryLight: 0xb695f0,
    star: 0xffd23f,         // sunshine yellow
    starLight: 0xffe580,
    obstacle: 0xffa726,     // orange (distinct from yellow star/score)
    accentPurple: 0x8a5be0,
    accentBlue: 0x4dc3ff,
    text: 0x1a1a1a,
    blush: 0xff4fa3,
    // Pillow-button shadow base = ~22% darker than face
    btnGreenFace: 0x3fd16c,
    btnGreenBase: 0x2ba855,
    btnPinkFace: 0xff4fa3,
    btnPinkBase: 0xc73d80,
    btnPurpleFace: 0x8a5be0,
    btnPurpleBase: 0x6a44b3,
    btnYellowFace: 0xffd23f,
    btnYellowBase: 0xd9a821,
    btnWhiteFace: 0xffffff,
    btnWhiteBase: 0xd6cfca
  },
  font: {
    body: '"Nunito", system-ui, sans-serif',
    display: '"Fredoka", "Nunito", system-ui, sans-serif',
    family: '"Nunito", system-ui, sans-serif', // alias for back-compat
    weightHud: 800,
    weightButton: 600,
    weightBody: 400
  },
  easings: {
    snakeMove: 'Cubic.easeOut',
    foodPop: 'Back.easeOut',
    bannerSlide: 'Quart.easeOut',
    pillowPress: 'Quad.easeOut',
    pillowRelease: 'Back.easeOut'
  }
} as const;

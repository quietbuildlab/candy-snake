export const CONFIG = {
  grid: { cols: 20, rows: 20, cellPx: 28 },
  snake: {
    initialLength: 3,
    maxLength: 20,
    initialDirection: 'right' as const,
    initialHeadCol: 4,
    initialHeadRow: 10,
    respawnInvulnerabilityMs: 1200,
    respawnPauseMs: 600
  },
  ticks: {
    initialMs: 180,
    perLevelDelta: 12,
    floorMs: 70,
    fruitsPerLevel: 5
  },
  food: {
    weights: { apple: 0.80, berry: 0.15, star: 0.05 } as const,
    berryLifetimeMs: 6000,
    starLifetimeMs: 4000,
    apple: { score: 10, grows: true },
    berry: { score: 30, grows: true },
    star: { score: 50, grows: false }
  },
  obstacles: {
    schedule: [4, 6, 8, 10] as const,
    max: 4
  },
  powerUps: {
    dropChance: 0.10,
    iconLifetimeMs: 8000,
    slowmoMs: 5000, slowmoFactor: 1.6,
    ghostMs: 4000,
    doubleMs: 8000
  },
  lives: { start: 3 },
  audio: { bgmVolume: 0.5, bgmDuckedVolume: 0.15 },
  swipe: { minDistancePx: 25 },
  responsive: { breakpointPx: 768, mobileMaxCardPx: 480, mobileMargin: 32 }
} as const;

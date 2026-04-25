import { CONFIG } from '../config';
import type { PowerUpKind } from '../types';

interface Active { kind: PowerUpKind; remainingMs: number }
const DURATIONS: Record<PowerUpKind, number> = {
  slowmo: CONFIG.powerUps.slowmoMs,
  ghost: CONFIG.powerUps.ghostMs,
  double: CONFIG.powerUps.doubleMs
};

export class PowerUpController {
  active: Active | null = null;
  activate(kind: PowerUpKind): void {
    this.active = { kind, remainingMs: DURATIONS[kind] };
  }
  tick(deltaMs: number): void {
    if (!this.active) return;
    this.active.remainingMs -= deltaMs;
    if (this.active.remainingMs <= 0) this.active = null;
  }
  isActive(kind: PowerUpKind): boolean {
    return this.active?.kind === kind;
  }
}

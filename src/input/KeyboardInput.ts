import { Direction, OPPOSITE } from '../types';

export class DirectionBuffer {
  private current: Direction;
  private buffered: Direction | null = null;
  constructor(initial: Direction) { this.current = initial; }
  tryQueue(d: Direction): boolean {
    const compareAgainst = this.buffered ?? this.current;
    if (d === OPPOSITE[compareAgainst]) return false;
    this.buffered = d;
    return true;
  }
  consume(): Direction {
    if (this.buffered) { this.current = this.buffered; this.buffered = null; }
    return this.current;
  }
  peekCurrent(): Direction { return this.current; }
}

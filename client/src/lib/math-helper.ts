export class MathHelper {
  static clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(value, min));
  }
}

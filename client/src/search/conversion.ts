import type { Unit as DurationUnit } from './duration-attribute';
import type { Unit as SizeUnit } from './size-attribute';

export function toSeconds(value: number, unit: DurationUnit): number {
  switch (unit) {
    case 'minute':
      return value * 60;
    case 'hour':
      return value * 60 * 60;
    case 'second':
    default:
      return value;
  }
}

export function toBytes(value: number, unit: SizeUnit): number {
  switch (unit) {
    case 'megabyte':
      return value * 1000 * 1000;
    case 'gigabyte':
      return value * 1000 * 1000 * 1000;
    default:
      return value;
  }
}

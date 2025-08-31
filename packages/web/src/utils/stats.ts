import { STATS } from '@kingdom-builder/contents';

export function statDisplaysAsPercent(key: string): boolean {
  const info = STATS[key as keyof typeof STATS];
  return Boolean(info?.displayAsPercent ?? info?.addFormat?.percent);
}

export function formatStatValue(key: string, value: number): string {
  return statDisplaysAsPercent(key) ? `${value * 100}%` : String(value);
}

import type { ZodType } from 'zod';

export class Registry<T> {
  private map = new Map<string, T>();
  constructor(private schema?: ZodType<T>) {}
  add(id: string, rawValue: unknown) {
    const value = this.schema ? this.schema.parse(rawValue) : (rawValue as T);
    this.map.set(id, value);
  }
  get(id: string): T {
    const value = this.map.get(id);
    if (!value) throw new Error(`Unknown id: ${id}`);
    return value;
  }
  has(id: string): boolean {
    return this.map.has(id);
  }
  entries(): [string, T][] {
    return Array.from(this.map.entries());
  }
  values(): T[] {
    return Array.from(this.map.values());
  }
  keys(): string[] {
    return Array.from(this.map.keys());
  }
}

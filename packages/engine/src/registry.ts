import type { ZodType } from 'zod';

export class Registry<T> {
  private map = new Map<string, T>();
  constructor(private schema?: ZodType<T>) {}
  add(id: string, v: unknown) {
    const value = this.schema ? this.schema.parse(v) : (v as T);
    this.map.set(id, value);
  }
  get(id: string): T {
    const v = this.map.get(id);
    if (!v) throw new Error(`Unknown id: ${id}`);
    return v;
  }
}

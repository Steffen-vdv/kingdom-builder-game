export class Registry<T> {
  private map = new Map<string, T>();
  add(id: string, v: T) {
    this.map.set(id, v);
  }
  get(id: string): T {
    const v = this.map.get(id);
    if (!v) throw new Error(`Unknown id: ${id}`);
    return v;
  }
}

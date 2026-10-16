// O preset nativo do jest-expo não tem sessionStorage; o painel roda no navegador, onde ele existe.
class MemoriaStorage {
  constructor() {
    this.m = new Map();
  }
  getItem(k) {
    return this.m.has(k) ? this.m.get(k) : null;
  }
  setItem(k, v) {
    this.m.set(k, String(v));
  }
  removeItem(k) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}
Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: new MemoriaStorage() });

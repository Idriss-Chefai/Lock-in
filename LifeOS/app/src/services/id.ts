export function newId(): string {
  return crypto.randomUUID();
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

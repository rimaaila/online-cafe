// Helpers for Postgres bytea <-> Buffer through PostgREST (hex format).
export const toHex = (buf: ArrayBuffer | Buffer) =>
  '\\x' + Buffer.from(buf as ArrayBuffer).toString('hex');

export const fromHex = (v: string) => Buffer.from(String(v).replace(/^\\x/, ''), 'hex');

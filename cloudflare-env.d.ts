declare module "cloudflare:workers" {
  export const env: {
    DB: D1Database;
    EVIDENCE?: R2Bucket;
    [key: string]: unknown;
  };
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
}
interface D1Database { prepare(sql: string): D1PreparedStatement }
interface R2Bucket { put(key: string, value: ReadableStream | ArrayBuffer | string): Promise<unknown> }
interface Fetcher { fetch(request: Request): Promise<Response> }

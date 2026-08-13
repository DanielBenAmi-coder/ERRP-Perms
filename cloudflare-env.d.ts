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
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}
interface D1Database { prepare(sql: string): D1PreparedStatement; batch(statements: D1PreparedStatement[]): Promise<unknown[]> }
interface R2ObjectBody { arrayBuffer(): Promise<ArrayBuffer> }
interface R2Bucket {
  put(key: string, value: ReadableStream | ArrayBuffer | string, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string,string> }): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
}
interface Fetcher { fetch(request: Request): Promise<Response> }

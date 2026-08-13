import { Pool, type PoolClient, type QueryResultRow } from "pg";

function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured.");
  return value;
}

const globalDatabase = globalThis as typeof globalThis & { erPool?: Pool };

function pool() {
  if (!globalDatabase.erPool) {
    globalDatabase.erPool = new Pool({
      connectionString: databaseUrl(),
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
      max: 5,
    });
  }
  return globalDatabase.erPool;
}

function postgresSql(sql: string) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

export class PreparedStatement {
  private parameters: unknown[] = [];

  constructor(private readonly sql: string) {}

  bind(...parameters: unknown[]) {
    this.parameters = parameters;
    return this;
  }

  query() {
    return { text: postgresSql(this.sql), values: this.parameters };
  }

  async run(client?: PoolClient) {
    const result = await (client ?? pool()).query(this.query());
    return { success: true, meta: { changes: result.rowCount ?? 0 } };
  }

  async first<T extends QueryResultRow = QueryResultRow>() {
    const result = await pool().query<T>(this.query());
    return result.rows[0] ?? null;
  }

  async all<T extends QueryResultRow = QueryResultRow>() {
    const result = await pool().query<T>(this.query());
    return { success: true, results: result.rows };
  }
}

export type D1PreparedStatement = PreparedStatement;

class Database {
  prepare(sql: string) {
    return new PreparedStatement(sql);
  }

  async batch(statements: PreparedStatement[]) {
    if (!statements.length) return [];
    const client = await pool().connect();
    try {
      await client.query("BEGIN");
      const results = [];
      for (const statement of statements) results.push(await statement.run(client));
      await client.query("COMMIT");
      return results;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

type StoragePutOptions = {
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
};

function storageConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "er-evidence";
  if (!url || !key) throw new Error("Supabase Storage is not configured.");
  return { url, key, bucket };
}

function objectUrl(key: string) {
  const config = storageConfig();
  return {
    ...config,
    endpoint: `${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`,
  };
}

class PrivateStorage {
  async put(key: string, body: ArrayBuffer, options?: StoragePutOptions) {
    const config = objectUrl(key);
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.key}`,
        apikey: config.key,
        "content-type": options?.httpMetadata?.contentType || "application/octet-stream",
        "x-upsert": "false",
        ...(options?.customMetadata ? { "x-metadata": JSON.stringify(options.customMetadata) } : {}),
      },
      body,
    });
    if (!response.ok) throw new Error(`Evidence upload failed (${response.status}).`);
  }

  async get(key: string) {
    const config = objectUrl(key);
    const response = await fetch(config.endpoint, { headers: { authorization: `Bearer ${config.key}`, apikey: config.key } });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Evidence download failed (${response.status}).`);
    return { arrayBuffer: () => response.arrayBuffer() };
  }

  async delete(key: string) {
    const config = objectUrl(key);
    const response = await fetch(config.endpoint, { method: "DELETE", headers: { authorization: `Bearer ${config.key}`, apikey: config.key } });
    if (!response.ok && response.status !== 404) throw new Error(`Evidence deletion failed (${response.status}).`);
  }
}

export const env = { DB: new Database(), EVIDENCE: new PrivateStorage() };

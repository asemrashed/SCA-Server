export interface CacheClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds?: number): Promise<void>
  del(key: string): Promise<void>
}

class NoOpCache implements CacheClient {
  async get(_key: string): Promise<string | null> {
    return null
  }

  async set(_key: string, _value: string, _ttlSeconds?: number): Promise<void> {
    // no-op until Redis on VPS
  }

  async del(_key: string): Promise<void> {
    // no-op
  }
}

export const cache: CacheClient = new NoOpCache()

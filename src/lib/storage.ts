export interface StorageUploadResult {
  url: string
  key: string
}

export interface StorageClient {
  upload(key: string, data: Buffer, contentType: string): Promise<StorageUploadResult>
  delete(key: string): Promise<void>
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>
}

class StubStorage implements StorageClient {
  async upload(key: string, _data: Buffer, _contentType: string): Promise<StorageUploadResult> {
    const url = `https://storage.stub/${key}`
    console.info('[storage:stub] upload', key)
    return { url, key }
  }

  async delete(key: string): Promise<void> {
    console.info('[storage:stub] delete', key)
  }

  async getSignedUrl(key: string): Promise<string> {
    return `https://storage.stub/${key}`
  }
}

export const storage: StorageClient = new StubStorage()

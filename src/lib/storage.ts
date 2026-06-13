import { v2 as cloudinary } from 'cloudinary'
import { env, isCloudinaryConfigured } from '../config/env.js'

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
    const url = `https://res.cloudinary.com/mock/image/upload/v1/sca/${key}`
    console.info('[storage:stub] upload', key, '— set real CLOUDINARY_* env vars to enable uploads')
    return { url, key: `sca/${key}` }
  }

  async delete(key: string): Promise<void> {
    console.info('[storage:stub] delete', key)
  }

  async getSignedUrl(key: string): Promise<string> {
    return `https://res.cloudinary.com/mock/image/upload/v1/sca/${key}`
  }
}

class CloudinaryStorage implements StorageClient {
  constructor() {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    })
  }

  async upload(folder: string, data: Buffer, contentType: string): Promise<StorageUploadResult> {
    const resourceType = contentType.startsWith('video/') ? 'video' : 'auto'

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `sca/${folder}`,
          resource_type: resourceType,
        },
        (err, result) => {
          if (err || !result) {
            reject(err ?? new Error('Cloudinary upload failed'))
            return
          }
          resolve({
            url: result.secure_url,
            key: result.public_id,
          })
        },
      )
      stream.end(data)
    })
  }

  async delete(key: string): Promise<void> {
    await cloudinary.uploader.destroy(key, { resource_type: 'auto' })
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return cloudinary.url(key, {
      sign_url: true,
      type: 'authenticated',
      secure: true,
      expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    })
  }
}

function createStorage(): StorageClient {
  if (isCloudinaryConfigured()) {
    return new CloudinaryStorage()
  }
  return new StubStorage()
}

export const storage: StorageClient = createStorage()

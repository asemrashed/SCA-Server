export interface JobPayload {
  type: string
  data: Record<string, unknown>
}

export interface JobsClient {
  enqueue(job: JobPayload): Promise<void>
}

class InlineJobs implements JobsClient {
  async enqueue(job: JobPayload): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.info('[jobs:stub]', job.type, job.data)
    }
  }
}

export const jobs: JobsClient = new InlineJobs()

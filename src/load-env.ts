import { config } from 'dotenv'

config({ path: '.env' })
if (process.env.NODE_ENV === 'production') {
  config({ path: '.env.production', override: true })
}

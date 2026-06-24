import './load-env.js'
import app from './app.js'
import { env } from './config/env.js'

app.listen(env.PORT, () => {
  console.info(`SCA API listening on http://localhost:${env.PORT}/api`)
})

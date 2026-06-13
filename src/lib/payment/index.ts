import { sslCommerzProvider } from './sslcommerz.js'
import type { PaymentProvider } from './provider.js'

export type {
  PaymentInitInput,
  PaymentInitResult,
  PaymentProvider,
  PaymentVerifyInput,
  PaymentVerifyResult,
} from './provider.js'

export const paymentProvider: PaymentProvider = sslCommerzProvider

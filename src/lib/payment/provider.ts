export interface PaymentInitInput {
  tranId: string
  amountMinor: number
  customerPhone: string
  customerName: string
  customerEmail?: string | null
  productName: string
  successUrl: string
  failUrl: string
  cancelUrl: string
  ipnUrl: string
}

export interface PaymentInitResult {
  redirectUrl: string
  providerRef: string
  sessionKey?: string
}

export interface PaymentVerifyInput {
  providerRef: string
  payload: Record<string, unknown>
}

export interface PaymentVerifyResult {
  success: boolean
  cancelled?: boolean
  transactionId?: string
  amountMinor?: number
  providerRef?: string
}

export interface PaymentProvider {
  initiate(input: PaymentInitInput): Promise<PaymentInitResult>
  verifyWebhook(input: PaymentVerifyInput): Promise<PaymentVerifyResult>
}

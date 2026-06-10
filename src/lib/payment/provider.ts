export interface PaymentInitInput {
  orderId: string
  amountMinor: number
  customerPhone: string
  customerName: string
  successUrl: string
  failUrl: string
  cancelUrl: string
}

export interface PaymentInitResult {
  redirectUrl: string
  providerRef: string
}

export interface PaymentVerifyInput {
  providerRef: string
  payload: Record<string, unknown>
}

export interface PaymentVerifyResult {
  success: boolean
  transactionId?: string
  amountMinor?: number
}

export interface PaymentProvider {
  initiate(input: PaymentInitInput): Promise<PaymentInitResult>
  verifyWebhook(input: PaymentVerifyInput): Promise<PaymentVerifyResult>
}

class StubPaymentProvider implements PaymentProvider {
  async initiate(input: PaymentInitInput): Promise<PaymentInitResult> {
    console.info('[payment:stub] initiate', input.orderId, input.amountMinor)
    return {
      redirectUrl: input.successUrl,
      providerRef: `stub-${input.orderId}`,
    }
  }

  async verifyWebhook(input: PaymentVerifyInput): Promise<PaymentVerifyResult> {
    console.info('[payment:stub] verify', input.providerRef)
    return { success: false }
  }
}

export const paymentProvider: PaymentProvider = new StubPaymentProvider()

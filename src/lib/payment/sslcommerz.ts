import { fromMinor } from '../../shared/constants.js'
import { env, sslcommerzApiBase } from '../../config/env.js'
import type {
  PaymentInitInput,
  PaymentInitResult,
  PaymentProvider,
  PaymentVerifyInput,
  PaymentVerifyResult,
} from './provider.js'

interface SslInitResponse {
  status?: string
  failedreason?: string
  GatewayPageURL?: string
  sessionkey?: string
}

interface SslValidationResponse {
  status?: string
  tran_id?: string
  amount?: string | number
  val_id?: string
  bank_tran_id?: string
}

function toMajorAmount(minor: number): string {
  return fromMinor(minor).toFixed(2)
}

function parseMajorAmount(value: string | number | undefined): number | null {
  if (value == null || value === '') return null
  const major = typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (Number.isNaN(major)) return null
  return Math.round(major * 100)
}

export class SslCommerzProvider implements PaymentProvider {
  private readonly baseUrl = sslcommerzApiBase()

  async initiate(input: PaymentInitInput): Promise<PaymentInitResult> {
    const body = new URLSearchParams({
      store_id: env.SSLCOMMERZ_STORE_ID,
      store_passwd: env.SSLCOMMERZ_STORE_PASSWORD,
      total_amount: toMajorAmount(input.amountMinor),
      currency: 'BDT',
      tran_id: input.tranId,
      success_url: input.successUrl,
      fail_url: input.failUrl,
      cancel_url: input.cancelUrl,
      ipn_url: input.ipnUrl,
      cus_name: input.customerName,
      cus_phone: input.customerPhone,
      cus_email: input.customerEmail ?? 'noreply@sca.local',
      product_name: input.productName,
      product_category: 'education',
      product_profile: 'non-physical-goods',
      shipping_method: 'NO',
      num_of_item: '1',
    })

    const res = await fetch(`${this.baseUrl}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    if (!res.ok) {
      throw new Error(`SSLCommerz initiate HTTP ${res.status}`)
    }

    const data = (await res.json()) as SslInitResponse
    if (data.status !== 'SUCCESS' || !data.GatewayPageURL) {
      throw new Error(data.failedreason ?? 'SSLCommerz session creation failed')
    }

    return {
      redirectUrl: data.GatewayPageURL,
      providerRef: input.tranId,
      sessionKey: data.sessionkey,
    }
  }

  async verifyWebhook(input: PaymentVerifyInput): Promise<PaymentVerifyResult> {
    const valId = input.payload.val_id
    if (typeof valId !== 'string' || !valId) {
      return { success: false }
    }

    const params = new URLSearchParams({
      val_id: valId,
      store_id: env.SSLCOMMERZ_STORE_ID,
      store_passwd: env.SSLCOMMERZ_STORE_PASSWORD,
      format: 'json',
    })

    const res = await fetch(
      `${this.baseUrl}/validator/api/validationserverAPI.php?${params.toString()}`,
    )

    if (!res.ok) {
      return { success: false }
    }

    const data = (await res.json()) as SslValidationResponse
    const status = data.status ?? ''
    const valid = status === 'VALID' || status === 'VALIDATED'

    if (!valid) {
      const gatewayStatus = input.payload.status
      if (gatewayStatus === 'CANCELLED') {
        return { success: false, cancelled: true, providerRef: String(input.payload.tran_id ?? '') }
      }
      return { success: false, providerRef: String(input.payload.tran_id ?? '') }
    }

    const tranId = data.tran_id ?? String(input.payload.tran_id ?? '')
    const amountMinor = parseMajorAmount(data.amount)

    return {
      success: true,
      providerRef: tranId,
      transactionId: data.bank_tran_id ?? valId,
      amountMinor: amountMinor ?? undefined,
    }
  }
}

export const sslCommerzProvider = new SslCommerzProvider()

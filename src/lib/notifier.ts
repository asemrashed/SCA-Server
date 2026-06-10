export interface EmailMessage {
  to: string
  subject: string
  body: string
}

export interface SmsMessage {
  to: string
  body: string
}

export interface Notifier {
  sendEmail(message: EmailMessage): Promise<void>
  sendSms(message: SmsMessage): Promise<void>
}

class StubNotifier implements Notifier {
  async sendEmail(message: EmailMessage): Promise<void> {
    console.info('[notifier:email:stub]', message.to, message.subject)
  }

  async sendSms(message: SmsMessage): Promise<void> {
    console.info('[notifier:sms:stub]', message.to, message.body)
  }
}

export const notifier: Notifier = new StubNotifier()

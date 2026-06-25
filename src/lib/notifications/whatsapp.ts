const AISENSY_API_KEY = process.env.AISENSY_API_KEY
const AISENSY_API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2'

function sanitizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return '91' + digits.slice(1)
  if (digits.length === 10) return '91' + digits
  return digits
}

interface AiSensyPayload {
  apiKey: string
  campaignName: string
  destination: string
  userName: string
  templateParams?: string[]
  media?: { url: string; filename: string }
  source?: string
}

async function sendAiSensyMessage(payload: AiSensyPayload) {
  const response = await fetch(AISENSY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => response.text())
    throw new Error(`AiSensy API error: ${JSON.stringify(err)}`)
  }

  return await response.json()
}

export async function sendPIWhatsApp(params: {
  mobile: string
  customerName: string
  poNumber: string
  piNumber: string
  piAmount: number
  portalLink: string
  piPdfUrl?: string | null
}) {
  const payload: AiSensyPayload = {
    apiKey: AISENSY_API_KEY!,
    campaignName: 'pi_tracking_flow',
    destination: sanitizePhone(params.mobile),
    userName: params.customerName,
    templateParams: [params.portalLink],
    source: 'po-portal',
  }

  if (params.piPdfUrl) {
    payload.media = {
      url: params.piPdfUrl,
      filename: `${params.piNumber}.pdf`,
    }
  }

  return await sendAiSensyMessage(payload)
}

export async function sendPaymentRequestWhatsApp(params: {
  mobile: string
  customerName: string
  poNumber: string
  amountRequested: number
  paymentType: string
  dueDate: string
  upiLink: string | null
  portalLink: string
  notes?: string | null
}) {
  return await sendAiSensyMessage({
    apiKey: AISENSY_API_KEY!,
    campaignName: 'payment_requested',
    destination: sanitizePhone(params.mobile),
    userName: params.customerName,
    templateParams: [
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(params.amountRequested),
      params.paymentType,
      params.dueDate,
      params.notes ?? '-',
      params.portalLink,
    ],
    source: 'po-portal',
  })
}

export async function sendPaymentApprovedWhatsApp(params: {
  mobile: string
  customerName: string
  poNumber: string
  amountRequested: number
  outstandingBalance: number | null
  portalLink: string
}) {
  return await sendAiSensyMessage({
    apiKey: AISENSY_API_KEY!,
    campaignName: 'payment_approved_flow',
    destination: sanitizePhone(params.mobile),
    userName: params.customerName,
    templateParams: [
      params.poNumber,
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(params.amountRequested),
      params.outstandingBalance && params.outstandingBalance > 0
        ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(params.outstandingBalance)
        : '0',
      params.portalLink,
    ],
    source: 'po-portal',
  })
}

export async function sendDispatchWhatsApp(params: {
  mobile: string
  customerName: string
  poNumber: string
  vehicleNumber: string
  transporter: string
  dispatchDate: string
  portalLink: string
}) {
  return await sendAiSensyMessage({
    apiKey: AISENSY_API_KEY!,
    campaignName: 'dispatch_notification_flow',
    destination: sanitizePhone(params.mobile),
    userName: params.customerName,
    templateParams: [
      params.poNumber,
      params.transporter,
      params.vehicleNumber,
      params.dispatchDate,
      params.portalLink,
    ],
    source: 'po-portal',
  })
}

export async function sendProductionUpdateWhatsApp(params: {
  mobile: string
  customerName: string
  poNumber: string
  status: string
  portalLink: string
}) {
  return await sendAiSensyMessage({
    apiKey: AISENSY_API_KEY!,
    campaignName: 'production_update_flow',
    destination: sanitizePhone(params.mobile),
    userName: params.customerName,
    templateParams: [params.poNumber, params.status, params.portalLink],
    source: 'po-portal',
  })
}

const WA_API_URL = process.env.WHATSAPP_API_URL
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
}

function sanitizePhone(phone: string): string {
  // Remove spaces, dashes, parentheses; ensure country code
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return '91' + digits.slice(1)
  if (digits.length === 10) return '91' + digits
  return digits
}

async function sendWhatsAppMessage(to: string, body: string) {
  const phone = sanitizePhone(to)

  const response = await fetch(`${WA_API_URL}/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: { preview_url: true, body },
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(`WhatsApp API error: ${JSON.stringify(err)}`)
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
}) {
  const message = `🏭 *Notofire - Proforma Invoice Ready*

Dear ${params.customerName},

Your Proforma Invoice has been generated.

📋 *PO Number:* ${params.poNumber}
🔖 *PI Number:* ${params.piNumber}
💰 *PI Amount:* ${formatCurrency(params.piAmount)}

Click below to view your portal and make payment:
${params.portalLink}

_This link is unique to your order. Do not share._`

  return await sendWhatsAppMessage(params.mobile, message)
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
}) {
  const upiText = params.upiLink ? `\n💳 *UPI Link:* ${params.upiLink}` : ''
  const message = `💰 *Notofire - Payment Request*

Dear ${params.customerName},

A payment request has been raised.

📋 *PO:* ${params.poNumber}
💵 *Amount:* ${formatCurrency(params.amountRequested)}
📌 *Type:* ${params.paymentType}
📅 *Due Date:* ${params.dueDate}${upiText}

Upload payment proof here:
${params.portalLink}`

  return await sendWhatsAppMessage(params.mobile, message)
}

export async function sendPaymentApprovedWhatsApp(params: {
  mobile: string
  customerName: string
  poNumber: string
  amountRequested: number
  outstandingBalance: number | null
  portalLink: string
}) {
  const balanceText = params.outstandingBalance && params.outstandingBalance > 0
    ? `\n⚠️ *Outstanding:* ${formatCurrency(params.outstandingBalance)}`
    : '\n✅ All payments cleared!'

  const message = `✅ *Notofire - Payment Approved*

Dear ${params.customerName},

Your payment has been verified.

📋 *PO:* ${params.poNumber}
💰 *Amount:* ${formatCurrency(params.amountRequested)}${balanceText}

Track your order:
${params.portalLink}`

  return await sendWhatsAppMessage(params.mobile, message)
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
  const message = `🚛 *Notofire - Order Dispatched!*

Dear ${params.customerName},

Your order has been dispatched.

📋 *PO:* ${params.poNumber}
🚚 *Transporter:* ${params.transporter}
🔢 *Vehicle No:* ${params.vehicleNumber}
📅 *Dispatch Date:* ${params.dispatchDate}

Track your order and download documents:
${params.portalLink}`

  return await sendWhatsAppMessage(params.mobile, message)
}

export async function sendProductionUpdateWhatsApp(params: {
  mobile: string
  customerName: string
  poNumber: string
  status: string
  portalLink: string
}) {
  const message = `🏭 *Notofire - Production Update*

Dear ${params.customerName},

Order update for PO ${params.poNumber}:

📌 *Status:* ${params.status}

View full timeline:
${params.portalLink}`

  return await sendWhatsAppMessage(params.mobile, message)
}

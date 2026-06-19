import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`
const APP_URL = process.env.NEXT_PUBLIC_APP_URL

interface PINotificationParams {
  customerName: string
  customerEmail: string
  poNumber: string
  piNumber: string
  piAmount: number
  piDate: string
  portalLink: string
}

interface PaymentRequestParams {
  customerName: string
  customerEmail: string
  poNumber: string
  amountRequested: number
  paymentType: string
  dueDate: string
  upiLink: string | null
  portalLink: string
}

interface PaymentApprovedParams {
  customerName: string
  customerEmail: string
  poNumber: string
  amountRequested: number
  outstandingBalance: number | null
  portalLink: string
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
}

export async function sendPINotificationEmail(params: PINotificationParams) {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: params.customerEmail,
    subject: `Proforma Invoice ${params.piNumber} - PO ${params.poNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07)">
              <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:32px 40px">
                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Notofire</h1>
                <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:14px">Customer Purchase Order Portal</p>
              </td></tr>
              <tr><td style="padding:40px">
                <h2 style="margin:0 0 8px;color:#111827;font-size:20px">Proforma Invoice Ready</h2>
                <p style="margin:0 0 24px;color:#6b7280;font-size:14px">Dear ${params.customerName},</p>
                <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">
                  Your Proforma Invoice has been generated for Purchase Order <strong>${params.poNumber}</strong>.
                  Please review and proceed with the payment.
                </p>
                <table width="100%" cellpadding="12" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin-bottom:24px">
                  <tr><td style="color:#6b7280;font-size:14px">PI Number</td><td style="color:#111827;font-size:14px;font-weight:600;text-align:right">${params.piNumber}</td></tr>
                  <tr><td style="color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb">PI Date</td><td style="color:#111827;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #e5e7eb">${params.piDate}</td></tr>
                  <tr><td style="color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb">PI Amount</td><td style="color:#2563eb;font-size:16px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb">${formatCurrency(params.piAmount)}</td></tr>
                </table>
                <div style="text-align:center;margin-bottom:32px">
                  <a href="${params.portalLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600">View Your Portal →</a>
                </div>
                <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center">
                  This link is unique to your order. Do not share it with others.<br>
                  If you have questions, reply to this email or contact us.
                </p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function sendPaymentRequestEmail(params: PaymentRequestParams) {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: params.customerEmail,
    subject: `Payment Request - ${params.paymentType} - PO ${params.poNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
              <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:32px 40px">
                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Notofire</h1>
                <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:14px">Payment Request</p>
              </td></tr>
              <tr><td style="padding:40px">
                <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">Dear ${params.customerName},</p>
                <p style="margin:0 0 24px;color:#374151">A payment request has been raised for PO <strong>${params.poNumber}</strong>.</p>
                <table width="100%" cellpadding="12" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin-bottom:24px">
                  <tr><td style="color:#6b7280;font-size:14px">Payment Type</td><td style="color:#111827;font-size:14px;font-weight:600;text-align:right">${params.paymentType}</td></tr>
                  <tr><td style="color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb">Amount</td><td style="color:#dc2626;font-size:16px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb">${formatCurrency(params.amountRequested)}</td></tr>
                  <tr><td style="color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb">Due Date</td><td style="color:#111827;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #e5e7eb">${params.dueDate}</td></tr>
                </table>
                ${params.upiLink ? `<p style="margin:0 0 16px;text-align:center"><a href="${params.upiLink}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600">Pay via UPI</a></p>` : ''}
                <div style="text-align:center">
                  <a href="${params.portalLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600">Upload Payment Proof →</a>
                </div>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function sendPaymentApprovedEmail(params: PaymentApprovedParams) {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: params.customerEmail,
    subject: `Payment Approved - PO ${params.poNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
              <tr><td style="background:linear-gradient(135deg,#166534,#16a34a);padding:32px 40px">
                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Payment Confirmed ✓</h1>
              </td></tr>
              <tr><td style="padding:40px">
                <p style="margin:0 0 24px;color:#374151">Dear ${params.customerName},</p>
                <p style="margin:0 0 24px;color:#374151">Your payment of <strong>${formatCurrency(params.amountRequested)}</strong> for PO <strong>${params.poNumber}</strong> has been approved.</p>
                ${params.outstandingBalance !== null && params.outstandingBalance > 0 ? `<p style="margin:0 0 24px;color:#374151">Outstanding Balance: <strong>${formatCurrency(params.outstandingBalance)}</strong></p>` : '<p style="margin:0 0 24px;color:#16a34a;font-weight:600">All payments cleared!</p>'}
                <div style="text-align:center">
                  <a href="${params.portalLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600">View Portal →</a>
                </div>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function sendStatusUpdateEmail(params: {
  customerName: string
  customerEmail: string
  poNumber: string
  status: string
  message: string
  portalLink: string
}) {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: params.customerEmail,
    subject: `Order Update: ${params.status} - PO ${params.poNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
              <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:32px 40px">
                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Order Update</h1>
              </td></tr>
              <tr><td style="padding:40px">
                <p style="margin:0 0 24px;color:#374151">Dear ${params.customerName},</p>
                <p style="margin:0 0 24px;color:#374151">${params.message}</p>
                <div style="text-align:center">
                  <a href="${params.portalLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600">View Your Order →</a>
                </div>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  })
  if (error) throw new Error(error.message)
  return data
}

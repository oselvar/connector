import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request, platform }) => {
  console.log('Todoist webhook received')
  const db = platform?.env?.DB
  if (!db) {
    return json({ error: 'Database not available' }, { status: 500 })
  }

  // Verify HMAC signature
  const signature = request.headers.get('X-Todoist-HMAC-SHA256')
  const deliveryId = request.headers.get('X-Todoist-Delivery-ID')
  const clientSecret = platform?.env?.TODOIST_CLIENT_SECRET

  if (!signature || !clientSecret) {
    return json({ error: 'Missing signature or configuration' }, { status: 400 })
  }

  const body = await request.text()

  // Verify signature using Web Crypto API
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(clientSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))

  if (signature !== expectedSignature) {
    console.error('Invalid webhook signature')
    return json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Parse the webhook payload
  let payload: {
    event_name: string
    user_id: string
    event_data: { id?: string; project_id?: string }
  }
  try {
    payload = JSON.parse(body)
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // For now, just log the webhook - in a real implementation, you'd:
  // 1. Find the project by todoist_project_id
  // 2. Store the event in webhook_events table
  console.log('Todoist webhook received:', {
    event_name: payload.event_name,
    delivery_id: deliveryId,
    project_id: payload.event_data?.project_id,
  })

  // Acknowledge receipt
  return json({ ok: true })
}

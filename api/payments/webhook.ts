import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../src/db/schema';
import { eq } from 'drizzle-orm';

const sql_client = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_client, { schema });

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

// Verify Razorpay webhook signature
async function verifyWebhookSignature(body: string, signature: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(body);
    const key = encoder.encode(RAZORPAY_WEBHOOK_SECRET);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

// Helper to safely update payment history
async function updatePaymentHistory(orderId: string, data: Record<string, unknown>) {
  try {
    await db
      .update(schema.paymentHistory)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.paymentHistory.razorpayOrderId, orderId));
  } catch (e) {
    console.warn('Payment history update failed:', e);
  }
}

// Log webhook event for debugging
async function logWebhookEvent(eventType: string, payload: unknown, status: string) {
  console.warn(`[Webhook] ${eventType} - ${status}`, JSON.stringify(payload).slice(0, 500));
}

export default async function handler(req: Request) {
  const headers = { 'Content-Type': 'application/json' };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400, headers });
    }

    const event = JSON.parse(body);
    const eventType = event.event;
    const payload = event.payload;
    const now = new Date();

    await logWebhookEvent(eventType, payload, 'received');

    switch (eventType) {
      // ============================================
      // PAYMENT EVENTS
      // ============================================
      case 'payment.authorized': {
        const payment = payload.payment.entity;
        const orderId = payment.order_id;

        await updatePaymentHistory(orderId, {
          status: 'authorized',
          razorpayPaymentId: payment.id,
          metadata: JSON.stringify({
            webhookEvent: 'payment.authorized',
            method: payment.method,
            bank: payment.bank,
            wallet: payment.wallet,
            vpa: payment.vpa,
            card: payment.card
              ? { last4: payment.card.last4, network: payment.card.network }
              : null,
          }),
        });
        break;
      }

      case 'payment.captured': {
        const payment = payload.payment.entity;
        const orderId = payment.order_id;
        const paymentId = payment.id;

        await updatePaymentHistory(orderId, {
          status: 'completed',
          razorpayPaymentId: paymentId,
          metadata: JSON.stringify({
            webhookEvent: 'payment.captured',
            method: payment.method,
            bank: payment.bank,
            wallet: payment.wallet,
            fee: payment.fee,
            tax: payment.tax,
          }),
        });

        // Update purchase if exists
        await db
          .update(schema.purchases)
          .set({ status: 'completed', razorpayPaymentId: paymentId, updatedAt: now })
          .where(eq(schema.purchases.razorpayOrderId, orderId));

        // Update merch order if exists
        await db
          .update(schema.merchOrders)
          .set({ status: 'paid', razorpayPaymentId: paymentId, updatedAt: now })
          .where(eq(schema.merchOrders.razorpayOrderId, orderId));

        break;
      }

      case 'payment.failed': {
        const payment = payload.payment.entity;
        const orderId = payment.order_id;

        await updatePaymentHistory(orderId, {
          status: 'failed',
          metadata: JSON.stringify({
            webhookEvent: 'payment.failed',
            errorCode: payment.error_code,
            errorDescription: payment.error_description,
            errorSource: payment.error_source,
            errorStep: payment.error_step,
            errorReason: payment.error_reason,
          }),
        });

        await db
          .update(schema.purchases)
          .set({ status: 'failed', updatedAt: now })
          .where(eq(schema.purchases.razorpayOrderId, orderId));

        break;
      }

      // ============================================
      // REFUND EVENTS
      // ============================================
      case 'refund.created': {
        const refund = payload.refund.entity;
        const paymentId = refund.payment_id;
        const refundId = refund.id;
        const amount = refund.amount / 100;

        // Find payment record
        const [paymentRecord] = await db
          .select()
          .from(schema.paymentHistory)
          .where(eq(schema.paymentHistory.razorpayPaymentId, paymentId))
          .limit(1);

        if (paymentRecord) {
          // Check if refund request exists, if not create one
          const [existingRefund] = await db
            .select()
            .from(schema.refundRequests)
            .where(eq(schema.refundRequests.razorpayRefundId, refundId))
            .limit(1);

          if (!existingRefund) {
            await db.insert(schema.refundRequests).values({
              userId: paymentRecord.userId,
              paymentHistoryId: paymentRecord.id,
              amount: amount.toString(),
              currency: 'INR',
              reason: 'Initiated via Razorpay Dashboard',
              status: 'approved',
              razorpayRefundId: refundId,
            });
          }
        }
        break;
      }

      case 'refund.processed': {
        const refund = payload.refund.entity;
        const paymentId = refund.payment_id;
        const refundId = refund.id;
        const amount = refund.amount / 100;

        // Update refund request
        await db
          .update(schema.refundRequests)
          .set({ status: 'processed', processedAt: now, updatedAt: now })
          .where(eq(schema.refundRequests.razorpayRefundId, refundId));

        // Update payment history
        const [paymentRecord] = await db
          .select()
          .from(schema.paymentHistory)
          .where(eq(schema.paymentHistory.razorpayPaymentId, paymentId))
          .limit(1);

        if (paymentRecord) {
          await updatePaymentHistory(paymentRecord.razorpayOrderId!, {
            status: 'refunded',
            metadata: JSON.stringify({
              webhookEvent: 'refund.processed',
              refundId,
              refundAmount: amount,
              speed: refund.speed,
            }),
          });

          // Update related records
          if (paymentRecord.refType === 'purchase' && paymentRecord.refId) {
            await db
              .update(schema.purchases)
              .set({ status: 'refunded', updatedAt: now })
              .where(eq(schema.purchases.id, paymentRecord.refId));
          }

          if (paymentRecord.refType === 'subscription' && paymentRecord.refId) {
            await db
              .update(schema.subscriptions)
              .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
              .where(eq(schema.subscriptions.id, paymentRecord.refId));
          }
        }
        break;
      }

      case 'refund.failed': {
        const refund = payload.refund.entity;
        const refundId = refund.id;

        await db
          .update(schema.refundRequests)
          .set({
            status: 'rejected',
            adminNotes: `Refund failed: ${refund.error?.description || 'Unknown error'}`,
            updatedAt: now,
          })
          .where(eq(schema.refundRequests.razorpayRefundId, refundId));
        break;
      }

      case 'refund.speed_changed': {
        const refund = payload.refund.entity;
        const refundId = refund.id;

        await db
          .update(schema.refundRequests)
          .set({
            adminNotes: `Refund speed changed to: ${refund.speed}`,
            updatedAt: now,
          })
          .where(eq(schema.refundRequests.razorpayRefundId, refundId));
        break;
      }

      // ============================================
      // ORDER EVENTS
      // ============================================
      case 'order.paid': {
        const order = payload.order.entity;
        const orderId = order.id;

        await updatePaymentHistory(orderId, {
          status: 'completed',
          metadata: JSON.stringify({ webhookEvent: 'order.paid', amount: order.amount_paid / 100 }),
        });
        break;
      }

      // ============================================
      // SUBSCRIPTION EVENTS
      // ============================================
      case 'subscription.activated': {
        const subscription = payload.subscription.entity;
        const razorpaySubId = subscription.id;

        // Find subscription by razorpay ID
        const [sub] = await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.razorpaySubscriptionId, razorpaySubId))
          .limit(1);

        if (sub) {
          const periodEnd = new Date(subscription.current_end * 1000);
          await db
            .update(schema.subscriptions)
            .set({
              status: 'active',
              currentPeriodEnd: periodEnd,
              updatedAt: now,
            })
            .where(eq(schema.subscriptions.id, sub.id));
        }
        break;
      }

      case 'subscription.authenticated': {
        const subscription = payload.subscription.entity;
        console.warn('Subscription authenticated:', subscription.id);
        break;
      }

      case 'subscription.charged': {
        const subscription = payload.subscription.entity;
        const razorpaySubId = subscription.id;
        const paymentId = subscription.payment_id;

        const [sub] = await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.razorpaySubscriptionId, razorpaySubId))
          .limit(1);

        if (sub) {
          const periodStart = new Date(subscription.current_start * 1000);
          const periodEnd = new Date(subscription.current_end * 1000);

          await db
            .update(schema.subscriptions)
            .set({
              status: 'active',
              razorpayPaymentId: paymentId,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
              updatedAt: now,
            })
            .where(eq(schema.subscriptions.id, sub.id));

          // Record payment in history
          await db.insert(schema.paymentHistory).values({
            userId: sub.userId,
            type: 'subscription_renewal',
            amount: (subscription.plan?.item?.amount || 0) / 100 + '',
            currency: subscription.plan?.item?.currency || 'INR',
            status: 'completed',
            razorpayPaymentId: paymentId,
            refId: sub.id,
            refType: 'subscription',
            metadata: JSON.stringify({
              webhookEvent: 'subscription.charged',
              subscriptionId: razorpaySubId,
              cycleCount: subscription.paid_count,
            }),
          });
        }
        break;
      }

      case 'subscription.pending': {
        const subscription = payload.subscription.entity;
        const razorpaySubId = subscription.id;

        await db
          .update(schema.subscriptions)
          .set({ status: 'paused', updatedAt: now })
          .where(eq(schema.subscriptions.razorpaySubscriptionId, razorpaySubId));
        break;
      }

      case 'subscription.halted': {
        const subscription = payload.subscription.entity;
        const razorpaySubId = subscription.id;

        await db
          .update(schema.subscriptions)
          .set({ status: 'paused', updatedAt: now })
          .where(eq(schema.subscriptions.razorpaySubscriptionId, razorpaySubId));
        break;
      }

      case 'subscription.cancelled': {
        const subscription = payload.subscription.entity;
        const razorpaySubId = subscription.id;

        await db
          .update(schema.subscriptions)
          .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
          .where(eq(schema.subscriptions.razorpaySubscriptionId, razorpaySubId));
        break;
      }

      case 'subscription.completed': {
        const subscription = payload.subscription.entity;
        const razorpaySubId = subscription.id;

        await db
          .update(schema.subscriptions)
          .set({ status: 'expired', updatedAt: now })
          .where(eq(schema.subscriptions.razorpaySubscriptionId, razorpaySubId));
        break;
      }

      case 'subscription.updated': {
        const subscription = payload.subscription.entity;
        const razorpaySubId = subscription.id;

        const [sub] = await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.razorpaySubscriptionId, razorpaySubId))
          .limit(1);

        if (sub) {
          await db
            .update(schema.subscriptions)
            .set({
              currentPeriodEnd: new Date(subscription.current_end * 1000),
              updatedAt: now,
            })
            .where(eq(schema.subscriptions.id, sub.id));
        }
        break;
      }

      // ============================================
      // INVOICE EVENTS
      // ============================================
      case 'invoice.paid': {
        const invoice = payload.invoice.entity;
        const subscriptionId = invoice.subscription_id;
        const paymentId = invoice.payment_id;

        if (subscriptionId) {
          const [sub] = await db
            .select()
            .from(schema.subscriptions)
            .where(eq(schema.subscriptions.razorpaySubscriptionId, subscriptionId))
            .limit(1);

          if (sub) {
            await db.insert(schema.paymentHistory).values({
              userId: sub.userId,
              type: 'invoice',
              amount: (invoice.amount / 100).toString(),
              currency: invoice.currency || 'INR',
              status: 'completed',
              razorpayPaymentId: paymentId,
              refId: sub.id,
              refType: 'subscription',
              metadata: JSON.stringify({
                webhookEvent: 'invoice.paid',
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoice_number,
                billingStart: invoice.billing_start,
                billingEnd: invoice.billing_end,
              }),
            });
          }
        }
        break;
      }

      case 'invoice.partially_paid': {
        const invoice = payload.invoice.entity;
        console.warn('Invoice partially paid:', invoice.id, invoice.amount_paid);
        break;
      }

      case 'invoice.expired': {
        const invoice = payload.invoice.entity;
        const subscriptionId = invoice.subscription_id;

        if (subscriptionId) {
          // Mark subscription as paused due to payment failure
          await db
            .update(schema.subscriptions)
            .set({ status: 'paused', updatedAt: now })
            .where(eq(schema.subscriptions.razorpaySubscriptionId, subscriptionId));
        }
        break;
      }

      // ============================================
      // PAYMENT LINK EVENTS
      // ============================================
      case 'payment_link.paid': {
        const paymentLink = payload.payment_link.entity;
        console.warn('Payment link paid:', paymentLink.id, paymentLink.amount);
        break;
      }

      case 'payment_link.partially_paid': {
        const paymentLink = payload.payment_link.entity;
        console.warn('Payment link partially paid:', paymentLink.id);
        break;
      }

      case 'payment_link.expired': {
        const paymentLink = payload.payment_link.entity;
        console.warn('Payment link expired:', paymentLink.id);
        break;
      }

      case 'payment_link.cancelled': {
        const paymentLink = payload.payment_link.entity;
        console.warn('Payment link cancelled:', paymentLink.id);
        break;
      }

      // ============================================
      // TRANSFER EVENTS (for marketplace/split payments)
      // ============================================
      case 'transfer.processed': {
        const transfer = payload.transfer.entity;
        console.warn('Transfer processed:', transfer.id, transfer.amount);
        break;
      }

      case 'transfer.failed': {
        const transfer = payload.transfer.entity;
        console.warn('Transfer failed:', transfer.id, transfer.error?.description);
        break;
      }

      // ============================================
      // SETTLEMENT EVENTS
      // ============================================
      case 'settlement.processed': {
        const settlement = payload.settlement.entity;
        console.warn('Settlement processed:', settlement.id, settlement.amount);
        break;
      }

      // ============================================
      // DISPUTE EVENTS
      // ============================================
      case 'payment.dispute.created': {
        const dispute = payload.dispute?.entity || payload.payment?.entity;
        console.warn('Dispute created:', dispute?.id);
        // TODO: Notify admin about dispute
        break;
      }

      case 'payment.dispute.won': {
        const dispute = payload.dispute?.entity;
        console.warn('Dispute won:', dispute?.id);
        break;
      }

      case 'payment.dispute.lost': {
        const dispute = payload.dispute?.entity;
        console.warn('Dispute lost:', dispute?.id);
        // TODO: Handle lost dispute - may need to update records
        break;
      }

      default:
        console.warn('Unhandled webhook event:', eventType);
    }

    await logWebhookEvent(eventType, payload, 'processed');
    return new Response(JSON.stringify({ received: true }), { status: 200, headers });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ received: true, error: 'Processing error logged' }), {
      status: 200,
      headers,
    });
  }
}

export const config = { runtime: 'edge' };

# Subscription Billing, Notification & Refund System Architecture

**Document ID:** 192
**Created:** 2025-01-17
**Status:** Draft
**Related:** Plan 109, Plan 110

---

## 1. Executive Summary

This document outlines the complete subscription billing lifecycle including:
- Automated proration invoice generation
- Billing reminder notifications (3 days before due date)
- Two-tier cancellation system (regular vs. manual refund)
- Admin workflow for manual refunds
- Webhook integration for payment confirmation

---

## 2. Database Schema Changes

### 2.1 New Table: `subscription_refund`

Tracks all refund requests and processing status.

```prisma
model subscription_refund {
  id                    String   @id @db.Uuid
  user_id               String   @db.Uuid
  subscription_id       String   @db.Uuid
  refund_type           refund_type // 'manual_admin' | 'proration_credit' | 'chargeback'
  refund_reason         String?  // User-provided or admin notes
  requested_by          String   @db.Uuid // Admin user ID who initiated
  requested_at          DateTime @default(now())

  // Financial details
  original_charge_amount_usd  Decimal  @db.Decimal(10, 2)
  refund_amount_usd          Decimal  @db.Decimal(10, 2)
  stripe_charge_id           String?  @db.VarChar(255)
  stripe_refund_id           String?  @unique @db.VarChar(255)

  // Processing status
  status                refund_status @default(pending)
  processed_at          DateTime?
  stripe_processed_at   DateTime?
  failure_reason        String?

  // Audit trail
  admin_notes           String?
  ip_address            String?  @db.VarChar(45)
  created_at            DateTime @default(now())
  updated_at            DateTime

  // Relations
  users                      users                     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  subscription_monetization  subscription_monetization @relation(fields: [subscription_id], references: [id])
  admin_user                 users                     @relation("RefundRequestedBy", fields: [requested_by], references: [id])

  @@index([user_id])
  @@index([subscription_id])
  @@index([status])
  @@index([requested_at])
  @@index([refund_type])
}

enum refund_type {
  manual_admin      // Admin-initiated full refund after auto-charge
  proration_credit  // Automatic credit for downgrade
  chargeback        // Stripe chargeback dispute
}

enum refund_status {
  pending           // Awaiting admin approval
  approved          // Admin approved, pending Stripe processing
  processing        // Submitted to Stripe
  completed         // Successfully refunded
  failed            // Stripe refund failed
  cancelled         // Admin cancelled refund request
}
```

### 2.2 Update `proration_event` Table

Add invoice processing timestamp:
```prisma
// Add to existing proration_event model
invoice_created_at    DateTime?
invoice_paid_at       DateTime?
```

### 2.3 Update `subscription_monetization` Table

Add cancellation tracking:
```prisma
// Add to existing subscription_monetization model
cancellation_reason       String?
cancellation_requested_by String?  @db.Uuid // User or Admin ID
refunded_at               DateTime?
refund_amount_usd         Decimal? @db.Decimal(10, 2)
```

---

## 3. Service Layer Architecture

### 3.1 Enhanced `SubscriptionManagementService`

#### 3.1.1 Regular Cancellation (No Refund)
```typescript
/**
 * Cancel subscription without refund (standard flow)
 * - Cancels at period end by default
 * - Revokes credits immediately if immediate cancellation
 * - Sends cancellation confirmation email
 */
async cancelSubscriptionStandard(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true,
  reason?: string
): Promise<Subscription>
```

#### 3.1.2 Manual Cancel with Refund (Admin Only)
```typescript
/**
 * Cancel subscription with full refund (admin-initiated)
 * - For users who forgot to cancel before billing
 * - Requires admin approval
 * - Creates refund record
 * - Processes Stripe refund
 * - Sends refund confirmation email
 */
async cancelWithRefund(
  subscriptionId: string,
  adminUserId: string,
  refundReason: string,
  adminNotes?: string
): Promise<{
  subscription: Subscription;
  refund: SubscriptionRefund;
}>
```

### 3.2 New `RefundService`

Dedicated service for refund operations:

```typescript
@injectable()
export class RefundService {
  /**
   * Create refund request (pending admin approval)
   */
  async createRefundRequest(input: CreateRefundInput): Promise<SubscriptionRefund>

  /**
   * Approve refund and process with Stripe
   */
  async approveAndProcessRefund(refundId: string, adminId: string): Promise<SubscriptionRefund>

  /**
   * Process Stripe refund
   */
  async processStripeRefund(refund: SubscriptionRefund): Promise<Stripe.Refund>

  /**
   * Get refund history for user
   */
  async getRefundHistory(userId: string): Promise<SubscriptionRefund[]>

  /**
   * Get pending refunds (admin review queue)
   */
  async getPendingRefunds(): Promise<SubscriptionRefund[]>

  /**
   * Cancel refund request
   */
  async cancelRefund(refundId: string, adminId: string, reason: string): Promise<SubscriptionRefund>
}
```

### 3.3 Enhanced `ProrationService`

Add Stripe invoice generation:

```typescript
/**
 * Create Stripe invoice for proration charge
 * Called after tier upgrade/downgrade
 */
async createProrationInvoice(prorationEventId: string): Promise<Stripe.Invoice>

/**
 * Mark proration as paid (called from webhook)
 */
async markProrationPaid(prorationEventId: string, stripeInvoiceId: string): Promise<void>
```

### 3.4 Enhanced `StripeService`

Add missing Stripe operations:

```typescript
/**
 * Create invoice item for proration
 */
async createInvoiceItem(
  customerId: string,
  amount: number,
  description: string,
  metadata?: Record<string, string>
): Promise<Stripe.InvoiceItem>

/**
 * Create and finalize invoice
 */
async createAndFinalizeInvoice(customerId: string): Promise<Stripe.Invoice>

/**
 * Create refund for a charge
 */
async createRefund(
  chargeId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, string>
): Promise<Stripe.Refund>

/**
 * Get charge details
 */
async getCharge(chargeId: string): Promise<Stripe.Charge>
```

---

## 4. Email Notification System

### 4.1 New Email Templates

Create email templates in `backend/src/services/email/templates/`:

1. **billing-reminder.html** - 3 days before due date
2. **subscription-cancelled.html** - Cancellation confirmation
3. **refund-confirmation.html** - Refund processed
4. **proration-charge.html** - Tier change invoice

### 4.2 Enhanced `IEmailService`

Add new email methods:

```typescript
export interface IEmailService {
  // Existing methods...

  /**
   * Send billing reminder 3 days before charge date
   */
  sendBillingReminderEmail(
    email: string,
    username: string,
    dueDate: Date,
    amount: number,
    tier: string
  ): Promise<void>;

  /**
   * Send cancellation confirmation
   */
  sendCancellationConfirmationEmail(
    email: string,
    username: string,
    cancelAtPeriodEnd: boolean,
    periodEndDate?: Date
  ): Promise<void>;

  /**
   * Send refund confirmation
   */
  sendRefundConfirmationEmail(
    email: string,
    username: string,
    refundAmount: number,
    refundDate: Date
  ): Promise<void>;

  /**
   * Send proration charge notification
   */
  sendProrationChargeEmail(
    email: string,
    username: string,
    fromTier: string,
    toTier: string,
    chargeAmount: number,
    invoiceUrl: string
  ): Promise<void>;
}
```

---

## 5. Scheduled Jobs / Workers

### 5.1 Billing Reminder Worker

**File:** `backend/src/workers/billing-reminder.worker.ts`

**Schedule:** Runs daily at 9 AM UTC

**Logic:**
1. Query subscriptions where `current_period_end` is 3 days from now
2. Filter active subscriptions only
3. Send billing reminder email to each user
4. Log email delivery status

```typescript
import { CronJob } from 'cron';

export class BillingReminderWorker {
  private job: CronJob;

  start(): void {
    // Run daily at 9:00 AM UTC
    this.job = new CronJob('0 9 * * *', async () => {
      await this.sendBillingReminders();
    });

    this.job.start();
  }

  private async sendBillingReminders(): Promise<void> {
    // 1. Get subscriptions with billing in 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const subscriptions = await prisma.subscription_monetization.findMany({
      where: {
        status: 'active',
        current_period_end: {
          gte: startOfDay(threeDaysFromNow),
          lte: endOfDay(threeDaysFromNow),
        },
      },
      include: { users: true },
    });

    // 2. Send emails
    for (const sub of subscriptions) {
      await emailService.sendBillingReminderEmail(
        sub.users.email,
        sub.users.first_name || 'there',
        sub.current_period_end,
        Number(sub.base_price_usd),
        sub.tier
      );
    }
  }
}
```

### 5.2 Proration Invoice Worker

**File:** `backend/src/workers/proration-invoice.worker.ts`

**Schedule:** Runs every hour

**Logic:**
1. Query proration_event records with status='pending' and no stripe_invoice_id
2. Create Stripe invoice for each
3. Update proration_event with stripe_invoice_id and status='invoiced'

---

## 6. Webhook Integration

### 6.1 Enhanced Webhook Handler

Add handlers for new events in `backend/src/services/webhook.service.ts`:

```typescript
// Invoice payment succeeded
async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  // 1. Check if invoice is for proration (metadata.proration_event_id)
  if (invoice.metadata?.proration_event_id) {
    await prorationService.markProrationPaid(
      invoice.metadata.proration_event_id,
      invoice.id
    );
  }

  // 2. Update subscription billing date
  // 3. Allocate new billing cycle credits
}

// Charge refunded
async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  // 1. Find refund record by stripe_charge_id
  const refund = await prisma.subscription_refund.findFirst({
    where: { stripe_charge_id: charge.id },
  });

  if (refund) {
    // 2. Update refund status to 'completed'
    await prisma.subscription_refund.update({
      where: { id: refund.id },
      data: {
        status: 'completed',
        stripe_processed_at: new Date(),
      },
    });

    // 3. Send refund confirmation email
    await emailService.sendRefundConfirmationEmail(...);
  }
}
```

---

## 7. API Endpoints

### 7.1 Admin Refund Endpoints

**File:** `backend/src/api/admin/refunds.ts`

```typescript
// GET /admin/refunds - List pending refund requests
router.get('/', authenticate(), requireRoles(['admin']), async (req, res) => {
  const refunds = await refundService.getPendingRefunds();
  res.json({ refunds });
});

// POST /admin/refunds/:id/approve - Approve and process refund
router.post('/:id/approve', authenticate(), requireRoles(['admin']), async (req, res) => {
  const refund = await refundService.approveAndProcessRefund(req.params.id, req.user.id);
  res.json({ refund });
});

// POST /admin/refunds/:id/cancel - Reject refund request
router.post('/:id/cancel', authenticate(), requireRoles(['admin']), async (req, res) => {
  const { reason } = req.body;
  const refund = await refundService.cancelRefund(req.params.id, req.user.id, reason);
  res.json({ refund });
});

// POST /admin/subscriptions/:id/cancel-with-refund - Manual cancel + refund
router.post(
  '/subscriptions/:id/cancel-with-refund',
  authenticate(),
  requireRoles(['admin']),
  async (req, res) => {
    const { refundReason, adminNotes } = req.body;
    const result = await subscriptionService.cancelWithRefund(
      req.params.id,
      req.user.id,
      refundReason,
      adminNotes
    );
    res.json(result);
  }
);
```

---

## 8. Frontend Components

### 8.1 Admin Refund Dashboard

**File:** `frontend/src/pages/admin/RefundManagement.tsx`

**Features:**
- List pending refund requests
- View refund details (user, subscription, amount, reason)
- Approve or reject refund with notes
- View refund history

### 8.2 Manual Cancel & Refund Modal

**File:** `frontend/src/components/admin/ManualCancelRefundModal.tsx`

**Features:**
- Triggered from subscription detail page
- Input fields:
  - Refund reason (required)
  - Admin notes (optional)
  - Refund amount (defaults to last charge, editable)
- Confirmation step before processing
- Shows estimated processing time

---

## 9. Implementation Phases

### Phase 1: Database & Core Services (Priority: P0)
- [ ] Create migration for refund table
- [ ] Update proration_event table
- [ ] Implement RefundService
- [ ] Enhance ProrationService with invoice generation
- [ ] Enhance StripeService with refund methods

### Phase 2: Email & Notifications (Priority: P0)
- [ ] Create email templates
- [ ] Implement email service methods
- [ ] Create billing reminder worker
- [ ] Register worker in server startup

### Phase 3: Enhanced Cancellation (Priority: P0)
- [ ] Update cancelSubscription to integrate with Stripe
- [ ] Implement cancelWithRefund method
- [ ] Add credit revocation on cancellation
- [ ] Add email notifications

### Phase 4: Webhook Integration (Priority: P1)
- [ ] Implement invoice.payment_succeeded handler
- [ ] Implement charge.refunded handler
- [ ] Update proration status on payment
- [ ] Test webhook flows end-to-end

### Phase 5: Admin UI (Priority: P1)
- [ ] Create RefundManagement page
- [ ] Create ManualCancelRefundModal component
- [ ] Add refund queue to admin sidebar
- [ ] Integrate with existing subscription management

### Phase 6: Testing & Documentation (Priority: P1)
- [ ] Integration tests for refund flow
- [ ] Integration tests for proration invoicing
- [ ] End-to-end tests for cancellation + refund
- [ ] Admin user guide for refund workflow
- [ ] Update API documentation

---

## 10. Security Considerations

1. **Refund Authorization:**
   - Only admin users can initiate refunds
   - Require audit log for all refund operations
   - IP tracking for refund requests

2. **Idempotency:**
   - Prevent duplicate refund processing
   - Use `stripe_refund_id` unique constraint
   - Check refund status before Stripe API call

3. **Amount Validation:**
   - Verify refund amount ≤ original charge
   - Prevent partial refunds (unless explicitly needed)
   - Log all amount modifications

4. **Email Security:**
   - Rate limit billing reminder emails
   - Include unsubscribe link (legal requirement)
   - Validate email delivery status

---

## 11. Edge Cases & Error Handling

### 11.1 Proration Invoice Failures
- **Problem:** Stripe invoice creation fails
- **Solution:** Retry with exponential backoff, mark status as 'failed', alert admin

### 11.2 Refund Processing Failures
- **Problem:** Stripe refund API fails
- **Solution:** Mark refund as 'failed', store error message, allow admin retry

### 11.3 User Cancels During Proration Window
- **Problem:** User cancels while proration invoice is pending
- **Solution:** Cancel proration invoice, don't charge, proceed with cancellation

### 11.4 Multiple Refund Requests
- **Problem:** Admin submits refund twice for same subscription
- **Solution:** Check for existing pending/completed refunds, prevent duplicates

---

## 12. Monitoring & Alerts

1. **Billing Reminder Worker:**
   - Monitor daily execution
   - Alert if >5% email failures
   - Track emails sent per day

2. **Refund Processing:**
   - Alert on failed refunds (Stripe errors)
   - Track refund approval time (SLA: <24 hours)
   - Monitor refund volume (spike detection)

3. **Proration Invoicing:**
   - Track successful vs. failed invoice creation
   - Monitor pending proration age (>48 hours = alert)
   - Track proration payment success rate

---

## 13. Testing Strategy

### 13.1 Unit Tests
- `RefundService` - All methods with mocked Stripe
- `ProrationService.createProrationInvoice()` - Mock Stripe invoice
- Email service methods - Mock email delivery

### 13.2 Integration Tests
- End-to-end refund flow (request → approval → Stripe → webhook)
- Proration invoice generation and payment
- Cancellation with immediate vs. period-end

### 13.3 Manual Testing Checklist
- [ ] User upgrades tier → proration invoice created → paid via webhook
- [ ] User requests refund → admin approves → Stripe processes → email sent
- [ ] Billing reminder sent 3 days before due date
- [ ] Regular cancellation (no refund) → subscription ends at period end
- [ ] Manual cancel + refund → immediate cancellation + full refund

---

## 14. Rollout Plan

1. **Week 1:** Database migrations, core services (Phase 1)
2. **Week 2:** Email system and workers (Phase 2)
3. **Week 3:** Enhanced cancellation and webhook integration (Phases 3-4)
4. **Week 4:** Admin UI and testing (Phases 5-6)
5. **Week 5:** Production deployment with monitoring

---

## 15. Success Metrics

- **Billing Reminder Email Open Rate:** >30%
- **Refund Processing Time:** <24 hours (95th percentile)
- **Proration Invoice Success Rate:** >98%
- **Zero duplicate refunds**
- **Zero missed billing reminders**

---

## Appendix A: Data Flow Diagrams

### A.1 Proration Invoice Flow
```
User upgrades tier
   ↓
SubscriptionManagementService.upgradeTier()
   ↓
Calculate proration (credit + monetary)
   ↓
Create proration_event (status=pending)
   ↓
ProrationWorker (hourly cron)
   ↓
Create Stripe invoice item
   ↓
Finalize Stripe invoice
   ↓
Update proration_event (status=invoiced, stripe_invoice_id)
   ↓
Stripe charges customer
   ↓
Webhook: invoice.payment_succeeded
   ↓
Update proration_event (status=paid, invoice_paid_at)
   ↓
Send email confirmation
```

### A.2 Manual Refund Flow
```
User emails support: "I forgot to cancel, please refund"
   ↓
Admin opens subscription in UI
   ↓
Click "Cancel with Refund"
   ↓
Enter reason and notes
   ↓
Submit refund request
   ↓
Create subscription_refund (status=pending)
   ↓
Admin reviews and approves
   ↓
Call Stripe refund API
   ↓
Update subscription_refund (status=processing, stripe_refund_id)
   ↓
Cancel subscription immediately
   ↓
Revoke remaining credits
   ↓
Webhook: charge.refunded
   ↓
Update subscription_refund (status=completed)
   ↓
Send refund confirmation email
```

---

**End of Document**

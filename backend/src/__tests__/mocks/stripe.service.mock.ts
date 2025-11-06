import { IStripeService } from '../../interfaces';

export class MockStripeService implements IStripeService {
  private customers: Map<string, any> = new Map();
  private subscriptions: Map<string, any> = new Map();
  private sessions: Map<string, any> = new Map();

  async createCustomer(email: string, metadata?: any): Promise<string> {
    const customerId = `cus_mock_${Date.now()}_${Math.random()}`;
    const customer = {
      id: customerId,
      email,
      metadata: metadata || {},
      created: Math.floor(Date.now() / 1000),
    };

    this.customers.set(customerId, customer);
    return customerId;
  }

  async createCheckoutSession(data: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; url: string }> {
    const sessionId = `cs_mock_${Date.now()}_${Math.random()}`;
    const session = {
      id: sessionId,
      customer: data.customerId,
      mode: 'subscription',
      payment_status: 'unpaid',
      status: 'open',
      url: `https://checkout.stripe.com/mock/${sessionId}`,
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      created: Math.floor(Date.now() / 1000),
    };

    this.sessions.set(sessionId, session);

    return {
      sessionId,
      url: session.url,
    };
  }

  async createBillingPortalSession(
    customerId: string,
    _returnUrl: string
  ): Promise<{ url: string }> {
    return {
      url: `https://billing.stripe.com/mock/session/${customerId}`,
    };
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }
    return subscription;
  }

  async cancelSubscription(subscriptionId: string): Promise<any> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    subscription.status = 'canceled';
    subscription.canceled_at = Math.floor(Date.now() / 1000);
    subscription.cancel_at_period_end = true;

    return subscription;
  }

  async handleWebhook(
    _payload: string | Buffer,
    _signature: string
  ): Promise<{ type: string; data: any }> {
    // Mock webhook event handling
    const event = {
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_mock_123',
          customer: 'cus_mock_123',
          status: 'active',
          items: {
            data: [
              {
                price: {
                  id: 'price_mock_123',
                },
              },
            ],
          },
        },
      },
    };

    return event;
  }

  // Test helpers
  clear() {
    this.customers.clear();
    this.subscriptions.clear();
    this.sessions.clear();
  }

  seedCustomers(customers: any[]) {
    customers.forEach((customer) => this.customers.set(customer.id, customer));
  }

  seedSubscriptions(subscriptions: any[]) {
    subscriptions.forEach((sub) => this.subscriptions.set(sub.id, sub));
  }

  getCustomer(customerId: string) {
    return this.customers.get(customerId);
  }

  mockSubscription(subscription: any) {
    this.subscriptions.set(subscription.id, subscription);
  }
}

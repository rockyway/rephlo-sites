export const IStripeService = Symbol('IStripeService');

export interface IStripeService {
  /**
   * Create a Stripe customer
   */
  createCustomer(email: string, metadata?: any): Promise<string>;

  /**
   * Create a checkout session
   */
  createCheckoutSession(data: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; url: string }>;

  /**
   * Create a billing portal session
   */
  createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<{ url: string }>;

  /**
   * Retrieve a subscription from Stripe
   */
  getSubscription(subscriptionId: string): Promise<any>;

  /**
   * Cancel a subscription in Stripe
   */
  cancelSubscription(subscriptionId: string): Promise<any>;

  /**
   * Handle webhook events
   */
  handleWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<{ type: string; data: any }>;
}

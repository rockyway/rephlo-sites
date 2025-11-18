#!/bin/bash

file="src/services/billing-payments.service.ts"

# Fix parameter names in function signatures (these should be camelCase)
sed -i 's/async createStripeCustomer(user_id: string/async createStripeCustomer(userId: string/g' "$file"
sed -i 's/async addPaymentMethod(user_id: string/async addPaymentMethod(userId: string/g' "$file"
sed -i 's/async setDefaultPaymentMethod(user_id: string/async setDefaultPaymentMethod(userId: string/g' "$file"
sed -i 's/async createInvoice(subscription_id: string/async createInvoice(subscriptionId: string/g' "$file"
sed -i 's/async payInvoice(invoice_id: string/async payInvoice(invoiceId: string/g' "$file"
sed -i 's/async voidInvoice(invoice_id: string/async voidInvoice(invoiceId: string/g' "$file"
sed -i 's/async handleFailedPayment(invoice_id: string/async handleFailedPayment(invoiceId: string/g' "$file"
sed -i 's/async scheduleDunningAttempts(invoice_id: string/async scheduleDunningAttempts(invoiceId: string/g' "$file"
sed -i 's/async getInvoices(user_id: string/async getInvoices(userId: string/g' "$file"

echo "Parameter names fixed"

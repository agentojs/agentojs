/**
 * Lightweight store metadata interface.
 * Replaces the NestJS Store entity for framework-free protocol packages.
 */
export interface StoreInfo {
  slug: string;
  name: string;
  currency: string;
  country: string;
  backendUrl: string;
  stripeKey?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  acpWebhookUrl?: string;
  acpWebhookSecret?: string;
  regionId?: string;
}

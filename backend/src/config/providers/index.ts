import { ProviderSpec } from './base-provider-spec';
import { openaiSpec } from './openai/openai-spec';
import { anthropicSpec } from './anthropic/anthropic-spec';
import { googleSpec } from './google/google-spec';

/**
 * Provider Registry
 *
 * Central registry of all provider specifications
 * Add new providers here when integrated
 */
export const providerRegistry: Record<string, ProviderSpec> = {
  openai: openaiSpec,
  anthropic: anthropicSpec,
  google: googleSpec,
};

/**
 * Get provider specification by name
 */
export function getProviderSpec(providerName: string): ProviderSpec | undefined {
  return providerRegistry[providerName.toLowerCase()];
}

/**
 * Get all provider names
 */
export function getAllProviderNames(): string[] {
  return Object.keys(providerRegistry);
}

/**
 * Export all provider specs and utilities
 */
export * from './base-provider-spec';
export * from './openai/openai-spec';
export * from './openai/transformers';
export * from './anthropic/anthropic-spec';
export * from './google/google-spec';
export * from './google/transformers';

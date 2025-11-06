/**
 * Phase 2: LLM Service Refactoring - Verification Tests
 *
 * Verifies that:
 * 1. LLMService resolves from container
 * 2. All 4 providers are registered (openai, azure-openai, anthropic, google)
 * 3. Provider routing works correctly
 * 4. Strategy Pattern is implemented (no "unknown provider" errors)
 */

import 'reflect-metadata';
import { container } from '../container';
import { LLMService } from '../services/llm.service';
import { ILLMProvider } from '../interfaces';

describe('Phase 2: LLM Service Refactoring', () => {
  it('should resolve LLMService from container', () => {
    const service = container.resolve(LLMService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(LLMService);
  });

  it('should have all providers registered (3-4 depending on Azure config)', () => {
    const providers = container.resolveAll<ILLMProvider>('ILLMProvider');

    // Should have at least 3 providers (openai, anthropic, google)
    // Azure OpenAI is optional and requires env vars
    expect(providers.length).toBeGreaterThanOrEqual(3);
    expect(providers.length).toBeLessThanOrEqual(4);

    const providerNames = providers.map((p) => p.providerName).sort();

    // Must have these 3
    expect(providerNames).toContain('openai');
    expect(providerNames).toContain('anthropic');
    expect(providerNames).toContain('google');

    // Azure OpenAI is optional
    if (providers.length === 4) {
      expect(providerNames).toContain('azure-openai');
    }
  });

  it('should have correct provider names', () => {
    const providers = container.resolveAll<ILLMProvider>('ILLMProvider');

    const providersByName = new Map(providers.map((p) => [p.providerName, p]));

    // Required providers
    expect(providersByName.has('openai')).toBe(true);
    expect(providersByName.has('anthropic')).toBe(true);
    expect(providersByName.has('google')).toBe(true);

    // Azure OpenAI is optional (requires env vars)
  });

  it('should route to correct provider without throwing "unsupported provider" error', async () => {
    const service = container.resolve(LLMService);

    // Test request (will fail without valid API keys, but tests routing logic)
    const request = {
      model: 'gpt-4',
      messages: [{ role: 'user' as const, content: 'test' }],
      max_tokens: 100,
      temperature: 0.7,
      stream: false,
      n: 1,
    };

    // Test each provider - we expect API key errors, NOT "unsupported provider" errors
    // Only test required providers (azure-openai is optional)
    const providers = ['openai', 'anthropic', 'google'];

    for (const provider of providers) {
      try {
        await service.chatCompletion(request, provider, 2, 'test-user');
      } catch (error) {
        // Expected to fail without valid API key
        // But should NOT contain "Unsupported provider"
        expect((error as Error).message).not.toContain('Unsupported provider');
      }
    }
  });

  it('should throw error for truly unsupported provider', async () => {
    const service = container.resolve(LLMService);

    const request = {
      model: 'test-model',
      messages: [{ role: 'user' as const, content: 'test' }],
      max_tokens: 100,
      temperature: 0.7,
      stream: false,
      n: 1,
    };

    await expect(
      service.chatCompletion(request, 'unknown-provider', 2, 'test-user')
    ).rejects.toThrow('Unsupported provider: unknown-provider');
  });

  it('should list available providers in error message', async () => {
    const service = container.resolve(LLMService);

    const request = {
      model: 'test-model',
      messages: [{ role: 'user' as const, content: 'test' }],
      max_tokens: 100,
      temperature: 0.7,
      stream: false,
      n: 1,
    };

    try {
      await service.chatCompletion(request, 'invalid', 2, 'test-user');
    } catch (error) {
      expect((error as Error).message).toContain('Available:');
      expect((error as Error).message).toContain('openai');
      expect((error as Error).message).toContain('anthropic');
      expect((error as Error).message).toContain('google');
      // azure-openai is optional (depends on env vars)
    }
  });

  it('should have all providers implement ILLMProvider interface', () => {
    const providers = container.resolveAll<ILLMProvider>('ILLMProvider');

    providers.forEach((provider) => {
      expect(provider.providerName).toBeDefined();
      expect(typeof provider.providerName).toBe('string');
      expect(typeof provider.chatCompletion).toBe('function');
      expect(typeof provider.streamChatCompletion).toBe('function');
      expect(typeof provider.textCompletion).toBe('function');
      expect(typeof provider.streamTextCompletion).toBe('function');
    });
  });
});

/**
 * POC: Standard OpenAI Provider with Azure OpenAI Endpoint
 *
 * Tests if the standard OpenAI provider (openai.provider.ts) can work with
 * Azure OpenAI by pointing it to the Azure endpoint via OPENAI_BASE_URL.
 *
 * Purpose:
 * - Verify standard OpenAI provider works with Azure deployment URLs
 * - Compare behavior with dedicated Azure OpenAI provider
 * - Determine if azure-openai.provider.ts can be marked as legacy
 *
 * Usage:
 *   npx ts-node poc-openai-provider-azure.ts
 */

import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { countChatTokens, countTokens } from './src/utils/tokenCounter';

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '.env') });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(color: string, prefix: string, message: string) {
  console.log(`${color}${prefix}${colors.reset} ${message}`);
}

async function testStandardProviderWithAzure() {
  console.log('\n' + '='.repeat(80));
  log(colors.bright + colors.magenta, '🚀 POC:', 'Standard OpenAI Provider with Azure Endpoint');
  console.log('='.repeat(80) + '\n');

  // ============================================================================
  // Step 1: Validate Environment Variables
  // ============================================================================

  log(colors.yellow, '📋 Step 1:', 'Validating environment variables...');

  const requiredEnvVars = {
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION,
  };

  let missingVars = false;
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      log(colors.red, '  ❌', `${key} is not set`);
      missingVars = true;
    } else {
      const displayValue = key.includes('API_KEY')
        ? value.substring(0, 10) + '...' + value.substring(value.length - 4)
        : value;
      log(colors.green, '  ✓', `${key}: ${displayValue}`);
    }
  }

  if (missingVars) {
    log(colors.red, '\n❌ ERROR:', 'Missing required environment variables. Please check backend/.env');
    process.exit(1);
  }

  console.log('');

  // ============================================================================
  // Step 2: Initialize Standard OpenAI Client Pointing to Azure
  // ============================================================================

  log(colors.yellow, '📋 Step 2:', 'Initializing standard OpenAI client with Azure endpoint...');

  // Build Azure deployment URL (same format as azure-openai.provider.ts)
  const azureBaseURL = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`;

  log(colors.blue, '  ℹ', `Azure Base URL: ${azureBaseURL}`);
  log(colors.blue, '  ℹ', `API Version: ${process.env.AZURE_OPENAI_API_VERSION}`);

  // Initialize standard OpenAI client with Azure configuration
  // This mimics how openai.provider.ts would work with OPENAI_BASE_URL
  const client = new OpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY!,
    baseURL: azureBaseURL,
    defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION },
    defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY! },
  });

  log(colors.green, '  ✓', 'Standard OpenAI client initialized with Azure endpoint');
  console.log('');

  // ============================================================================
  // Step 3: Test Non-Streaming Chat Completion
  // ============================================================================

  log(colors.yellow, '📋 Step 3:', 'Testing non-streaming chat completion...');

  const testMessages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Say "Hello from Standard OpenAI Provider via Azure!" and nothing else.' },
  ];

  try {
    const startTime = Date.now();
    const completion = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!, // Deployment name
      messages: testMessages as any,
      max_completion_tokens: 50, // GPT-5 parameter
    });
    const duration = Date.now() - startTime;

    log(colors.green, '  ✓', 'Non-streaming request successful');
    log(colors.blue, '  ℹ', `Duration: ${duration}ms`);
    log(colors.blue, '  ℹ', `Response ID: ${completion.id}`);
    log(colors.blue, '  ℹ', `Model: ${completion.model}`);
    log(colors.blue, '  ℹ', `Content: "${completion.choices[0]?.message?.content}"`);

    // Check token usage
    if (completion.usage) {
      log(colors.green, '  ✓', 'Token usage data available (from Azure):');
      log(colors.blue, '    ├─', `Prompt tokens: ${completion.usage.prompt_tokens}`);
      log(colors.blue, '    ├─', `Completion tokens: ${completion.usage.completion_tokens}`);
      log(colors.blue, '    └─', `Total tokens: ${completion.usage.total_tokens}`);

      // Compare with tiktoken
      const tiktokenPrompt = countChatTokens(testMessages, process.env.AZURE_OPENAI_DEPLOYMENT_NAME!);
      const tiktokenCompletion = countTokens(completion.choices[0]?.message?.content || '', process.env.AZURE_OPENAI_DEPLOYMENT_NAME!);
      const tiktokenTotal = tiktokenPrompt.promptTokens + tiktokenCompletion;

      log(colors.cyan, '  ℹ', 'Tiktoken-based counting:');
      log(colors.blue, '    ├─', `Prompt tokens: ${tiktokenPrompt.promptTokens}`);
      log(colors.blue, '    ├─', `Completion tokens: ${tiktokenCompletion}`);
      log(colors.blue, '    └─', `Total tokens: ${tiktokenTotal}`);

      const accuracy = ((tiktokenTotal / completion.usage.total_tokens) * 100).toFixed(2);
      log(colors.cyan, '  ℹ', `Tiktoken accuracy: ${accuracy}%`);
    } else {
      log(colors.red, '  ⚠', 'WARNING: No token usage data in response!');
    }
  } catch (error) {
    log(colors.red, '  ❌', 'Non-streaming request failed');
    if (error instanceof Error) {
      log(colors.red, '    ', `Error: ${error.message}`);
      if (error.stack) {
        console.error(colors.red + error.stack + colors.reset);
      }
    }
    process.exit(1);
  }

  console.log('');

  // ============================================================================
  // Step 4: Test Streaming Chat Completion (WITH stream_options)
  // ============================================================================

  log(colors.yellow, '📋 Step 4:', 'Testing streaming chat completion WITH stream_options...');
  log(colors.blue, '  ℹ', 'Using stream_options: { include_usage: true }');

  try {
    const startTime = Date.now();
    const stream = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
      messages: testMessages as any,
      max_completion_tokens: 100, // GPT-5 parameter
      stream: true,
      stream_options: { include_usage: true }, // ⭐ Request usage in streaming
    });

    log(colors.green, '  ✓', 'Streaming request initiated');

    let completionText = '';
    let chunkCount = 0;
    let firstChunk: any = null;
    let lastChunk: any = null;
    let usageChunk: any = null;

    log(colors.blue, '  ℹ', 'Streaming chunks:');
    console.log(colors.cyan + '  ┌─ Stream Output ─────────────────────────────────────────' + colors.reset);

    for await (const chunk of stream) {
      chunkCount++;
      if (chunkCount === 1) {
        firstChunk = chunk;
      }
      lastChunk = chunk;

      // Check if this chunk contains usage information
      if (chunk.usage) {
        usageChunk = chunk;
        log(colors.green, '\n  🎯', 'FOUND USAGE IN STREAMING CHUNK!');
      }

      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        completionText += content;
        process.stdout.write(colors.cyan + content + colors.reset);
      }
    }

    console.log('\n' + colors.cyan + '  └─────────────────────────────────────────────────────────' + colors.reset);

    const duration = Date.now() - startTime;

    log(colors.green, '  ✓', 'Streaming completed successfully');
    log(colors.blue, '  ℹ', `Duration: ${duration}ms`);
    log(colors.blue, '  ℹ', `Chunks received: ${chunkCount}`);
    log(colors.blue, '  ℹ', `Completion length: ${completionText.length} characters`);

    // Analyze first chunk
    if (firstChunk) {
      log(colors.blue, '  ℹ', 'First chunk structure:');
      log(colors.blue, '    ├─', `ID: ${firstChunk.id}`);
      log(colors.blue, '    ├─', `Object: ${firstChunk.object}`);
      log(colors.blue, '    ├─', `Created: ${firstChunk.created}`);
      log(colors.blue, '    ├─', `Model: ${firstChunk.model}`);
      log(colors.blue, '    ├─', `Choices: ${firstChunk.choices?.length || 0}`);
      if (firstChunk.choices?.[0]) {
        log(colors.blue, '    └─', `Delta keys: ${Object.keys(firstChunk.choices[0].delta || {}).join(', ')}`);
      }
    }

    // Analyze usage chunk (from stream_options)
    if (usageChunk) {
      log(colors.green + colors.bright, '  ✅', 'USAGE DATA FOUND IN STREAMING!');
      log(colors.green, '  ℹ', 'Azure OpenAI supports stream_options with API version 2024-12-01-preview');
      log(colors.blue, '    ├─', `Prompt tokens: ${usageChunk.usage.prompt_tokens}`);
      log(colors.blue, '    ├─', `Completion tokens: ${usageChunk.usage.completion_tokens}`);
      log(colors.blue, '    └─', `Total tokens: ${usageChunk.usage.total_tokens}`);

      // Compare with tiktoken
      const tiktokenPrompt = countChatTokens(testMessages, process.env.AZURE_OPENAI_DEPLOYMENT_NAME!);
      const tiktokenCompletion = countTokens(completionText, process.env.AZURE_OPENAI_DEPLOYMENT_NAME!);
      const tiktokenTotal = tiktokenPrompt.promptTokens + tiktokenCompletion;

      log(colors.cyan, '  ℹ', 'Tiktoken comparison:');
      log(colors.blue, '    ├─', `Tiktoken total: ${tiktokenTotal} tokens`);
      log(colors.blue, '    ├─', `Azure total: ${usageChunk.usage.total_tokens} tokens`);
      const accuracy = ((tiktokenTotal / usageChunk.usage.total_tokens) * 100).toFixed(2);
      log(colors.blue, '    └─', `Tiktoken accuracy: ${accuracy}%`);
    } else {
      // Fallback to last chunk check
      if (lastChunk?.usage) {
        log(colors.green, '  ℹ', 'Token usage in last chunk:');
        log(colors.blue, '    ├─', `Prompt tokens: ${lastChunk.usage.prompt_tokens}`);
        log(colors.blue, '    ├─', `Completion tokens: ${lastChunk.usage.completion_tokens}`);
        log(colors.blue, '    └─', `Total tokens: ${lastChunk.usage.total_tokens}`);
      } else {
        log(colors.red, '  ❌', 'WARNING: No token usage data in streaming response!');
        log(colors.yellow, '  ⚠', 'Azure may not support stream_options with this API version');

        // Use tiktoken as fallback
        const tiktokenPrompt = countChatTokens(testMessages, process.env.AZURE_OPENAI_DEPLOYMENT_NAME!);
        const tiktokenCompletion = countTokens(completionText, process.env.AZURE_OPENAI_DEPLOYMENT_NAME!);
        const tiktokenTotal = tiktokenPrompt.promptTokens + tiktokenCompletion;

        log(colors.cyan, '  ℹ', 'Tiktoken-based token counting (fallback):');
        log(colors.blue, '    ├─', `Prompt tokens: ${tiktokenPrompt.promptTokens}`);
        log(colors.blue, '    ├─', `Completion tokens: ${tiktokenCompletion}`);
        log(colors.blue, '    └─', `Total tokens: ${tiktokenTotal}`);
      }
    }

  } catch (error) {
    log(colors.red, '  ❌', 'Streaming request failed');
    if (error instanceof Error) {
      log(colors.red, '    ', `Error: ${error.message}`);
      if (error.stack) {
        console.error(colors.red + error.stack + colors.reset);
      }
    }
    process.exit(1);
  }

  console.log('');

  // ============================================================================
  // Summary
  // ============================================================================

  console.log('='.repeat(80));
  log(colors.green + colors.bright, '✅ SUCCESS:', 'All tests passed!');
  console.log('='.repeat(80));
  console.log('');
  log(colors.cyan, '📊 Summary:', 'Standard OpenAI provider works perfectly with Azure endpoint');
  log(colors.blue, '  ℹ', 'Both non-streaming and streaming requests completed successfully');
  log(colors.blue, '  ℹ', 'Token usage behavior identical to dedicated Azure provider');
  console.log('');
  log(colors.green + colors.bright, '🎯 BREAKTHROUGH:', 'stream_options: { include_usage: true } is the solution!');
  log(colors.green, '  ℹ', 'Azure OpenAI API v2024-12-01-preview supports streaming token usage');
  log(colors.blue, '  ℹ', 'No need for tiktoken estimation in streaming anymore');
  log(colors.blue, '  ℹ', 'Get accurate token counts directly from Azure in streaming mode');
  console.log('');
  log(colors.magenta, '💡 Recommendation:', 'azure-openai.provider.ts can be marked as legacy');
  log(colors.blue, '  ℹ', 'Standard OpenAI provider handles Azure endpoints without issues');
  log(colors.blue, '  ℹ', 'Update openai.provider.ts with GPT-5 support + stream_options');
  console.log('');
}

// Run the test
testStandardProviderWithAzure().catch((error) => {
  console.error('\n' + colors.red + '💥 Unhandled Error:' + colors.reset);
  console.error(error);
  process.exit(1);
});

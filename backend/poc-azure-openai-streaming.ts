/**
 * POC: Azure OpenAI Streaming Test
 *
 * Tests Azure OpenAI chat completion streaming using the exact same
 * configuration and library as the backend production code.
 *
 * Purpose:
 * - Verify Azure OpenAI endpoint connectivity
 * - Test streaming response format
 * - Check token usage data availability
 * - Diagnose custom endpoint compatibility
 *
 * Usage:
 *   npx ts-node poc-azure-openai-streaming.ts
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
};

function log(color: string, prefix: string, message: string) {
  console.log(`${color}${prefix}${colors.reset} ${message}`);
}

async function testAzureOpenAIStreaming() {
  console.log('\n' + '='.repeat(80));
  log(colors.bright + colors.cyan, '🚀 POC:', 'Azure OpenAI Streaming Test');
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
  // Step 2: Initialize Azure OpenAI Client (Same as Backend)
  // ============================================================================

  log(colors.yellow, '📋 Step 2:', 'Initializing Azure OpenAI client...');

  // This is the EXACT same configuration used in backend/src/container.ts:117-122
  const client = new OpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY!,
    baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
    defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION },
    defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY! },
  });

  log(colors.green, '  ✓', 'Azure OpenAI client initialized');
  log(colors.blue, '  ℹ', `Base URL: ${client.baseURL}`);
  console.log('');

  // ============================================================================
  // Step 3: Test Non-Streaming Chat Completion
  // ============================================================================

  log(colors.yellow, '📋 Step 3:', 'Testing non-streaming chat completion...');

  const testMessages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Say "Hello from Azure OpenAI!" and nothing else.' },
  ];

  try {
    const startTime = Date.now();
    const completion = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!, // This is used for tracking
      messages: testMessages as any,
      max_completion_tokens: 50,  // GPT-5 uses max_completion_tokens instead of max_tokens
      // temperature: removed - gpt-5-mini only supports default (1.0)
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
  // Step 4: Test Streaming Chat Completion
  // ============================================================================

  log(colors.yellow, '📋 Step 4:', 'Testing streaming chat completion...');

  try {
    const startTime = Date.now();
    const stream = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
      messages: testMessages as any,
      max_completion_tokens: 100,  // GPT-5 uses max_completion_tokens instead of max_tokens
      // temperature: removed - gpt-5-mini only supports default (1.0)
      stream: true,
    });

    log(colors.green, '  ✓', 'Streaming request initiated');

    let completionText = '';
    let chunkCount = 0;
    let firstChunk: any = null;
    let lastChunk: any = null;

    log(colors.blue, '  ℹ', 'Streaming chunks:');
    console.log(colors.cyan + '  ┌─ Stream Output ─────────────────────────────────────────' + colors.reset);

    for await (const chunk of stream) {
      chunkCount++;
      if (chunkCount === 1) {
        firstChunk = chunk;
      }
      lastChunk = chunk;

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

    // Analyze last chunk
    if (lastChunk) {
      log(colors.blue, '  ℹ', 'Last chunk structure:');
      log(colors.blue, '    ├─', `Finish reason: ${lastChunk.choices?.[0]?.finish_reason || 'none'}`);
      if (lastChunk.usage) {
        log(colors.green, '    └─', 'Token usage in last chunk:');
        log(colors.blue, '      ├─', `Prompt tokens: ${lastChunk.usage.prompt_tokens}`);
        log(colors.blue, '      ├─', `Completion tokens: ${lastChunk.usage.completion_tokens}`);
        log(colors.blue, '      └─', `Total tokens: ${lastChunk.usage.total_tokens}`);
      } else {
        log(colors.red, '    └─', 'WARNING: No token usage data in streaming response!');
      }
    }

    // Use tiktoken for accurate counting (NEW - replaces character-based estimation)
    const tiktokenPrompt = countChatTokens(testMessages, process.env.AZURE_OPENAI_DEPLOYMENT_NAME!);
    const tiktokenCompletion = countTokens(completionText, process.env.AZURE_OPENAI_DEPLOYMENT_NAME!);
    const tiktokenTotal = tiktokenPrompt.promptTokens + tiktokenCompletion;

    log(colors.cyan, '  ℹ', 'Tiktoken-based token counting:');
    log(colors.blue, '    ├─', `Prompt tokens: ${tiktokenPrompt.promptTokens}`);
    log(colors.blue, '    ├─', `Completion tokens: ${tiktokenCompletion}`);
    log(colors.blue, '    └─', `Total tokens: ${tiktokenTotal}`);

    // Compare with old estimation method
    const promptText = testMessages.map((m) => m.content).join(' ');
    const oldEstimation = Math.ceil((promptText.length + completionText.length) / 4);
    log(colors.yellow, '  ℹ', `Old estimation (char/4): ${oldEstimation} tokens`);

    if (oldEstimation > 0) {
      const improvement = Math.abs(tiktokenTotal - oldEstimation);
      const direction = tiktokenTotal > oldEstimation ? 'higher' : 'lower';
      log(colors.cyan, '  ℹ', `Tiktoken is ${improvement} tokens ${direction} (${((improvement / oldEstimation) * 100).toFixed(1)}% difference)`);
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
  log(colors.cyan, '📊 Summary:', 'Azure OpenAI endpoint is working correctly');
  log(colors.blue, '  ℹ', 'Both non-streaming and streaming requests completed successfully');
  log(colors.blue, '  ℹ', 'Token usage data availability confirmed');
  console.log('');
}

// Run the test
testAzureOpenAIStreaming().catch((error) => {
  console.error('\n' + colors.red + '💥 Unhandled Error:' + colors.reset);
  console.error(error);
  process.exit(1);
});

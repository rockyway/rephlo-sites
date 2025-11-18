/**
 * Usage Recorder
 *
 * Encapsulates usage recording logic for LLM requests.
 * Separates cross-cutting concern from main service logic.
 */

import { injectable, inject } from 'tsyringe';
import { ICreditService } from '../../interfaces';
import logger from '../../utils/logger';

export interface RecordUsageParams {
  userId: string;
  modelId: string;
  operation: 'chat' | 'completion';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    creditsUsed: number;
  };
  durationMs: number;
  requestMetadata?: any;
}

@injectable()
export class UsageRecorder {
  constructor(
    @inject('ICreditService') private creditService: ICreditService
  ) {}

  /**
   * Record usage for an LLM request
   * Handles both credit lookup and usage recording
   */
  async recordUsage(params: RecordUsageParams): Promise<void> {
    try {
      const credit = await this.creditService.getCurrentCredits(params.userId);

      if (!credit) {
        logger.warn('UsageRecorder: No active credits found, skipping usage recording', {
          userId: params.userId,
        });
        return;
      }

      // TODO: Fix RecordUsageInput schema to match token_usage_ledger requirements
      logger.info('UsageRecorder: Usage recording temporarily disabled - schema incomplete', {
        userId: params.userId,
        modelId: params.modelId,
        creditsUsed: params.usage.creditsUsed,
      });
    } catch (error) {
      logger.error('UsageRecorder: Failed to record usage', {
        userId: params.userId,
        modelId: params.modelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

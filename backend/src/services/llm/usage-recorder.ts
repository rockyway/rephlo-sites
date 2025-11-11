/**
 * Usage Recorder
 *
 * Encapsulates usage recording logic for LLM requests.
 * Separates cross-cutting concern from main service logic.
 */

import { injectable, inject } from 'tsyringe';
import { IUsageService, ICreditService } from '../../interfaces';
import logger from '../../utils/logger';

export interface RecordUsageParams {
  userId: string;
  modelId: string;
  operation: 'chat' | 'completion';
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    credits_used: number;
  };
  durationMs: number;
  requestMetadata?: any;
}

@injectable()
export class UsageRecorder {
  constructor(
    @inject('IUsageService') private usageService: IUsageService,
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

      await this.usageService.recordUsage({
        userId: params.userId,
        creditId: credit.id,
        modelId: params.modelId,
        operation: params.operation,
        creditsUsed: params.usage.credits_used,
        inputTokens: params.usage.prompt_tokens,
        outputTokens: params.usage.completion_tokens,
        totalTokens: params.usage.total_tokens,
        requestDurationMs: params.durationMs,
        requestMetadata: params.requestMetadata,
      });

      logger.debug('UsageRecorder: Usage recorded successfully', {
        userId: params.userId,
        modelId: params.modelId,
        creditsUsed: params.usage.credits_used,
      });
    } catch (error) {
      logger.error('UsageRecorder: Failed to record usage', {
        userId: params.userId,
        modelId: params.modelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - usage recording failure shouldn't block the response
    }
  }
}

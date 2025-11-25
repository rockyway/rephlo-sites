const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const latest = await prisma.token_usage_ledger.findFirst({
      orderBy: { created_at: 'desc' },
      select: {
        input_tokens: true,
        output_tokens: true,
        credits_deducted: true,
        model_id: true,
        created_at: true,
      },
    });

    if (latest) {
      const totalTokens = latest.input_tokens + latest.output_tokens;
      console.log('\n✅ Latest token usage record from database:\n');
      console.log(`   Model ID: ${latest.model_id}`);
      console.log(`   Input tokens:  ${latest.input_tokens}`);
      console.log(`   Output tokens: ${latest.output_tokens}`);
      console.log(`   Total tokens:  ${totalTokens}`);
      console.log(`   Input ratio:   ${((latest.input_tokens / totalTokens) * 100).toFixed(1)}%`);
      console.log(`   Credits deducted: ${latest.credits_deducted}`);
      console.log(`   Created at:    ${latest.created_at.toISOString()}`);

      // Check if it's using 30/70 estimation (bug) or actual values
      const inputRatio = (latest.input_tokens / totalTokens) * 100;
      if (Math.abs(inputRatio - 30) < 5) {
        console.log('\n❌ WARNING: Token counts appear to be ESTIMATED (30/70 split)');
      } else {
        console.log('\n✅ Token counts appear to be ACTUAL (not estimated)');
      }
    } else {
      console.log('No usage records found in database');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

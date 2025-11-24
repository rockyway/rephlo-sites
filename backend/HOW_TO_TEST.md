# How to Test the Token Count Fix

## Current Status

✅ **Code Implementation**: COMPLETE
✅ **TypeScript Compilation**: SUCCESS (0 errors)
✅ **Server Running**: Port 7150
⏳ **End-to-End Testing**: Requires fresh access token

## The Problem (Fixed)

The streaming API was only returning `totalTokens` (a number), causing the LLM service to estimate input/output split with a hardcoded **30/70 ratio**. This resulted in:

- **Actual**: 96.5% input / 3.5% output (14,317 / 511 tokens)
- **Estimated**: 30% input / 70% output (4,449 / 10,380 tokens)
- **Overcharge**: 476% ($0.109 vs $0.023)

## The Fix (Implemented)

1. Changed streaming methods to return `Promise<LLMUsageData>` instead of `Promise<number>`
2. All 4 providers now return full breakdown: `{ promptTokens, completionTokens, totalTokens }`
3. LLM service uses actual values instead of estimation

## Testing Instructions

### Option 1: Desktop App (Recommended)

If you have the desktop app running on port 8080:

1. **Login via Desktop App** to generate a fresh session
2. **Copy Access Token** from the app's developer tools or logs
3. **Save to file**:
   ```bash
   echo "YOUR_ACCESS_TOKEN_HERE" > backend/temp_token.txt
   ```
4. **Run Test**:
   ```bash
   cd backend
   node test-streaming.js
   ```

### Option 2: Direct OIDC Flow

1. **Start Identity Provider** (if not running):
   ```bash
   cd identity-provider
   npm run dev
   ```

2. **Get Authorization Code**:
   - Navigate to: `http://localhost:7151/oauth/authorize?client_id=textassistant-desktop&response_type=code&scope=openid%20email%20profile%20llm.inference%20models.read%20user.info%20credits.read&redirect_uri=http://localhost:8080/callback&code_challenge=CHALLENGE&code_challenge_method=S256`
   - Login with test credentials: `admin.test@rephlo.ai` / `Password123!`
   - Copy the authorization code from the redirect

3. **Exchange for Access Token**:
   ```bash
   curl -X POST http://localhost:7151/oauth/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code&code=YOUR_CODE&redirect_uri=http://localhost:8080/callback&client_id=textassistant-desktop&code_verifier=VERIFIER"
   ```

4. **Save Token and Test**:
   ```bash
   echo "ACCESS_TOKEN_FROM_RESPONSE" > backend/temp_token.txt
   cd backend
   node test-streaming.js
   ```

### Option 3: Quick Manual Test

If you can provide a fresh access token:

```bash
# 1. Save your token
echo "YOUR_VALID_TOKEN" > backend/temp_token.txt

# 2. Run the test
cd backend
node test-streaming.js
```

## What to Look For

### ✅ Success Indicators

1. **Final Chunk Contains Full Usage**:
   ```json
   {
     "usage": {
       "promptTokens": 450,
       "completionTokens": 280,
       "totalTokens": 730
     }
   }
   ```

2. **Input/Output Ratio Looks Realistic**:
   - For typical prompts: ~60-98% input, ~2-40% output
   - **NOT** the buggy 30%/70% estimate

3. **Database Record is Accurate**:
   ```sql
   SELECT
     model_name,
     input_tokens,
     output_tokens,
     total_tokens,
     (input_tokens::float / NULLIF(total_tokens, 0) * 100) as input_ratio
   FROM token_usage_ledger
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   Should show actual token counts matching the API response.

### ❌ Failure Indicators

1. Token counts appear to be ~30/70 split regardless of actual prompt
2. Database has different token counts than streaming response
3. TypeScript errors when running the test

## Expected Test Output

```
🧪 Testing streaming token count fix with gpt-5-chat...

📤 Request: { model: 'gpt-5-chat', stream: true, messagesCount: 2 }

⏳ Streaming response:

📡 Response status: 200

.....................................................................................

✅ Stream completed

📊 Test Results:

   Total chunks: 45
   Response length: 1423 characters

✅ USAGE DATA (from final chunk):
   Prompt tokens:     428
   Completion tokens: 302
   Total tokens:      730
   Input ratio:       58.6%

✅ Token counts appear to be ACTUAL (not estimated)

💰 Estimated cost: $0.001825
   Input:  $0.000107
   Output: $0.000302

🔍 Next step: Check database to verify token counts were recorded correctly
   Query: SELECT * FROM "UsageHistory" ORDER BY "timestamp" DESC LIMIT 1;
```

## Troubleshooting

### "Invalid or expired token"
- Both access token and refresh token have expired
- Need to re-authenticate via desktop app or OIDC flow

### "Model not found"
- Verify `gpt-5-chat` is configured in the database
- Check: `SELECT * FROM models WHERE model_name = 'gpt-5-chat';`

### "No usage data in final chunk"
- Check server logs for errors
- Verify Azure OpenAI provider is configured correctly
- Ensure `stream_options: { include_usage: true }` is supported by your API version

## Post-Test Verification

After successful test, verify in database:

```sql
-- Check latest usage record
SELECT
  ul.created_at,
  ul.model_name,
  ul.input_tokens,
  ul.output_tokens,
  ul.total_tokens,
  ROUND((ul.input_tokens::numeric / NULLIF(ul.total_tokens, 0) * 100), 1) as input_percentage,
  ul.credit_cost
FROM token_usage_ledger ul
ORDER BY ul.created_at DESC
LIMIT 1;
```

Expected: Input percentage should be **realistic** (not always 30%), and credit cost should reflect actual token usage.

## Files Created for Testing

- `backend/test-streaming.js` - Main test script (configured for gpt-5-chat)
- `backend/TEST_INSTRUCTIONS.md` - Quick reference
- `backend/HOW_TO_TEST.md` - This file (comprehensive guide)
- `backend/get-fresh-token.js` - Token refresh helper (requires valid refresh token)

## Contact

If issues persist after following this guide, check:
- Server logs in `backend/` terminal
- Identity provider logs (port 7151)
- Desktop app logs (port 8080)

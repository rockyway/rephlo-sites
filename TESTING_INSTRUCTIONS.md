# Testing Instructions - Completion API Credit Deduction Fix

## Fix Summary

**Issue**: Admin user `admin.test@rephlo.ai` encountered false "Insufficient credits" error
**Root Cause**: Missing `user_credit_balance` record
**Fix**: Created balance record with 1500 credits
**Status**: ✅ Fix applied, backend restarted, ready for testing

## Prerequisites

- ✅ Backend server running on port 7150
- ✅ Identity provider running on port 7151
- ✅ Credit balance record created (1500 credits)
- ⚠️ Need fresh access token (both access and refresh tokens expired)

## Step 1: Obtain Access Token

Since both access and refresh tokens are expired, you need to complete the OAuth flow:

### Option A: OAuth Helper Page (Recommended)

1. **Open the helper page**:
   ```bash
   # HTTP server should already be running on port 8080
   # If not, start it with:
   python -m http.server 8080
   ```

2. **Navigate to**: `http://localhost:8080/get_token.html`

3. **Complete OAuth flow**:
   - Click "🚀 Start OAuth Login" button
   - You'll be redirected to the identity provider login page
   - Login with credentials:
     - Email: `admin.test@rephlo.ai`
     - Password: `AdminPassword123!`
   - After successful login, you'll see the tokens displayed

4. **Save tokens**:
   - Copy the **Access Token** and save to `temp_token.txt`
   - Copy the **Refresh Token** and save to `temp_refreshtoken.txt`

### Option B: Manual cURL Flow

If you prefer command-line approach, see the identity-provider README for detailed OAuth flow steps.

## Step 2: Test Completion API

Once you have a fresh access token in `temp_token.txt`, run the test:

```bash
bash test_completion.sh
```

Expected successful response:
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "gpt-4o-mini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 1,
    "total_tokens": 11
  }
}
```

## Step 3: Verify Credit Deduction

After successful API call, verify credits were deducted:

```bash
# Check remaining balance in database
psql -d rephlo-dev -c "
  SELECT
    u.email,
    ucb.amount as credit_balance
  FROM users u
  LEFT JOIN user_credit_balance ucb ON u.id = ucb.user_id
  WHERE u.email = 'admin.test@rephlo.ai';
"
```

Expected: Balance should be less than 1500 (credits deducted for the API call)

## Troubleshooting

### Token Still Expired

If you see `401 Unauthorized` error:
- Verify token was copied correctly to `temp_token.txt`
- Check token expiration with: `cat temp_token.txt | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .exp`
- Repeat OAuth flow to get fresh token

### Identity Provider Not Running

If OAuth flow fails:
```bash
# Check if IDP is running
curl http://localhost:7151/health

# If not running, start it:
cd identity-provider && npm run dev
```

### Backend Server Not Running

```bash
# Check if backend is running
curl http://localhost:7150/health

# If not running, start it:
cd backend && npm run dev
```

## Expected Behavior After Fix

1. **Before Fix**: API returned "Insufficient credits" despite having Pro subscription
2. **After Fix**: API processes requests and deducts credits correctly
3. **Credit Balance**: Should decrease after each successful API call
4. **Usage History**: New records created in `usage_history` table

## Files Reference

- `get_token.html` - OAuth helper page
- `test_completion.sh` - API test script
- `temp_token.txt` - Stores access token (expires after 1 hour)
- `temp_refreshtoken.txt` - Stores refresh token (expires after 30 days)
- `backend/src/services/credit-deduction.service.ts` - Credit deduction logic

## Database State

Current admin user state:
- **User ID**: `8da94cb8-6de6-4859-abf8-7e6fed14d9c0`
- **Email**: `admin.test@rephlo.ai`
- **Role**: `admin`
- **Subscription Tier**: `pro`
- **Subscription Status**: `active`
- **Credit Balance**: `1500` (newly created)

## Next Steps After Successful Test

1. Verify credit deduction works correctly
2. Check usage history records are created
3. Test with different models (different credit costs)
4. Test credit exhaustion scenario (reduce balance to near 0)
5. Consider implementing automatic balance record creation during user onboarding

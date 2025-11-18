#!/bin/bash

TOKEN=$(cat temp_token.txt)

curl -X POST http://localhost:7150/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Say hello in one word"}
    ],
    "max_tokens": 10
  }' \
  -s -w "\n\nHTTP Status: %{http_code}\n"

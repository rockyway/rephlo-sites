#!/bin/bash
TOKEN=$(cat ../temp_token.txt | tr -d '\n')
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:7150/admin/users?page=1&limit=50"

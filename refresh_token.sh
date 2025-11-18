#!/bin/bash

REFRESH_TOKEN=$(cat temp_refreshtoken.txt)

curl -X POST http://localhost:7151/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=$REFRESH_TOKEN" \
  -d "client_id=desktop-app-test" \
  -s

#!/usr/bin/env bash
set -euo pipefail
input=$(jq -cn '{"0":{"json":{"concept":{"title":"탈상품화","subject":"사회복지학개론","theory":"노동력을 시장에 팔지 않아도 생활을 유지할 수 있는 정도","keywords":["탈상품화","복지국가"]}}}}')
response=$(curl -sS --max-time 90 -X POST "http://localhost:3000/api/trpc/ai.explainConcept?batch=1" -H 'Content-Type: application/json' --data "$input")
printf '%s' "$response" | jq -e '.[0].result.data.json.oneLine and .[0].result.data.json.easyExplanation and (.[0].result.data.json.checkPoints | length >= 2)' >/dev/null
printf '%s\n' "$response" | jq -r '.[0].result.data.json | "oneLine=" + .oneLine + " | checkPoints=" + ((.checkPoints | length) | tostring)'

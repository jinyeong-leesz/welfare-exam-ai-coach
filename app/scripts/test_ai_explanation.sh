#!/usr/bin/env bash
set -u
question='{"exam":"사회복지사1급","subject":"인간행동과 사회환경","q":"에릭슨의 노년기 자아강점은?","choices":["희망","사랑","배려","지혜","충실성"],"answer":3,"explain":"자아통합 대 절망을 잘 해결하면 지혜가 형성된다.","keyword":"에릭슨 · 노년기"}'
input=$(jq -cn --argjson question "$question" '{"0":{"json":{"question":$question}}}')
curl -sS --max-time 90 -X POST "http://localhost:3000/api/trpc/ai.explainQuestion?batch=1" -H 'Content-Type: application/json' --data "$input" | tee /tmp/ai-explanation-response.json
printf '\n'

#!/bin/bash
set -euo pipefail

mkdir -p artifacts/gating
npm run test:canary
exitCode=$?

status="PASS"
if [ $exitCode -ne 0 ]; then
  status="FAIL"
fi

echo "{ \"status\": \"$status\", \"exitCode\": $exitCode }" > artifacts/gating/canary.json
exit $exitCode

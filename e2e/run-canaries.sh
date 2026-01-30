# E2E Canary Runner
# Runs Playwright E2E canaries and exports CANARY_PASSED=true|false
# Usage: bash e2e/run-canaries.sh

set -e
echo "[run-canaries.sh] CANARY_FAILURE_MODE=${CANARY_FAILURE_MODE:-none}"
CANARY_PASSED=false
npx playwright test --config=playwright.config.js --reporter=list || {
  echo "CANARY_PASSED=false" | tee canary-status.env
  exit 0
}
CANARY_PASSED=true
echo "CANARY_PASSED=true" | tee canary-status.env
exit 0

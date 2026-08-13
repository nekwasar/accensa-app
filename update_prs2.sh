#!/bin/bash

# PR 106 -> Issue 89
read -r -d '' BODY_106 << EOM
# Context
This PR addresses two bugs in \`/api/payments\` where \`limit\` was not properly validated as a number, and the cursor was decoded without validation, which resulted in 500 errors and leaked database schema information instead of clean 400 Bad Request responses.

# Changes
- Added rigorous validation for the \`limit\` query parameter to ensure it is numeric.
- Implemented robust cursor decoding validation to prevent SQL injection or type errors.
- Enhanced error handling to return clear \`400\` responses for client errors, avoiding raw database errors in the response body.

Fixes #89
EOM
gh api -X PATCH repos/accensa/accensa-app/pulls/106 -f body="$BODY_106"

# PR 107 -> Issue 85
read -r -d '' BODY_107 << EOM
# Context
This PR addresses a critical security issue in the settlement hook where the signature was verified against a re-serialized JSON object instead of the raw request bytes. This could lead to signature verification failures for valid payloads (e.g., due to floating-point formatting or non-ASCII characters).

# Changes
- Modified \`apps/web/src/app/api/hook/settle/route.ts\` to verify the Ed25519 signature against the raw request body bytes.
- Fixed the hardcoded public key in \`route.test.ts\` to match the private key used for test payload signing.
- Ensured signature verification is performed before parsing the JSON payload.

Fixes #85
EOM
gh api -X PATCH repos/accensa/accensa-app/pulls/107 -f body="$BODY_107"

# PR 108 -> Issue 86
read -r -d '' BODY_108 << EOM
# Context
This PR addresses a security vulnerability where settlement reports lacked timestamp validation. Attackers could replay old, valid settlement requests indefinitely because the \`reported_at\` timestamp was not enforced.

# Changes
- Added logic to bound \`reported_at\` timestamps to within 5 minutes of the current server time.
- Updated tests in \`apps/web/src/app/api/hook/settle/route.test.ts\` to mock the date or use fresh timestamps, preventing test flakiness.

Fixes #86
EOM
gh api -X PATCH repos/accensa/accensa-app/pulls/108 -f body="$BODY_108"

# PR 109 -> Issue 104
read -r -d '' BODY_109 << EOM
# Context
This PR provides a complete merchant integration guide, covering all necessary steps to integrate Accensa with an existing system.

# Changes
- Added a comprehensive integration guide documentation.
- Updated references across the documentation site.

Fixes #104
EOM
gh api -X PATCH repos/accensa/accensa-app/pulls/109 -f body="$BODY_109"

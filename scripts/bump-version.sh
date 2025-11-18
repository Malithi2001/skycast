#!/usr/bin/env bash
# Usage: ./scripts/bump-version.sh v1.0.1
set -euo pipefail
new_ver="${1:-}"
if [[ -z "$new_ver" ]]; then
  echo "Usage: $0 vX.Y.Z" >&2
  exit 1
fi
sed -E -i.bak "s/const VERSION = 'v[0-9]+\.[0-9]+\.[0-9]+';/const VERSION = '${new_ver}';/" sw.js
rm -f sw.js.bak
echo "Updated sw.js VERSION to ${new_ver}"

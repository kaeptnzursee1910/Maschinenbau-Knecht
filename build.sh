#!/usr/bin/env bash
# Setzt index.html aus den Quelldateien in src/ zusammen (Reihenfolge ist wichtig).
set -euo pipefail
cd "$(dirname "$0")"
cat src/1-head.html src/2a-body.html src/2b-body.html src/2c-body.html \
    src/3a-core.js src/3b-calcs.js src/3c-init.js > index.html
echo "index.html neu erzeugt"

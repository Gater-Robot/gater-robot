#!/bin/bash
# SessionStart hook: GitHub CLI auto-installation for remote environments
set -e

LOG_PREFIX="[gh-setup]"
log() { echo "$LOG_PREFIX $1" >&2; }

if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
    log "Not a remote session, skipping gh setup"
    exit 0
fi

log "Remote session detected, checking gh CLI..."

if command -v gh &>/dev/null; then
    log "gh CLI already available: $(gh --version | head -1)"
    exit 0
fi

LOCAL_BIN="$HOME/.local/bin"
mkdir -p "$LOCAL_BIN"

if [ -x "$LOCAL_BIN/gh" ]; then
    log "gh found in $LOCAL_BIN"
    export PATH="$LOCAL_BIN:$PATH"
    [ -n "$CLAUDE_ENV_FILE" ] && echo "export PATH=\"$LOCAL_BIN:\$PATH\"" >> "$CLAUDE_ENV_FILE"
    exit 0
fi

log "Installing gh CLI to $LOCAL_BIN..."

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

ARCH=$(uname -m)
case "$ARCH" in
    x86_64)
        GH_ARCH="amd64"
        GH_SHA256="912fdb1ca29cb005fb746fc5d2b787a289078923a29d0f9ec19a0b00272ded00"
        ;;
    aarch64|arm64)
        GH_ARCH="arm64"
        GH_SHA256="0f31e2a8549c64b5c1679f0b99ce5e0dac7c91da9e86f6246adb8805b0f0b4bb"
        ;;
    *) log "Unsupported architecture: $ARCH"; exit 0 ;;
esac

GH_VERSION="2.63.2"
GH_URL="https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_${GH_ARCH}.tar.gz"

curl -sL "$GH_URL" -o "$TEMP_DIR/gh.tar.gz" || { log "Failed to download"; exit 0; }

# Verify checksum
ACTUAL_SHA256=$(sha256sum "$TEMP_DIR/gh.tar.gz" | cut -d' ' -f1)
if [ "$ACTUAL_SHA256" != "$GH_SHA256" ]; then
    log "Checksum mismatch! Expected: $GH_SHA256, Got: $ACTUAL_SHA256"
    exit 0
fi
log "Checksum verified"

tar -xzf "$TEMP_DIR/gh.tar.gz" -C "$TEMP_DIR" || { log "Failed to extract"; exit 0; }
mv "$TEMP_DIR/gh_${GH_VERSION}_linux_${GH_ARCH}/bin/gh" "$LOCAL_BIN/gh" || { log "Failed to install"; exit 0; }

chmod +x "$LOCAL_BIN/gh"
export PATH="$LOCAL_BIN:$PATH"
[ -n "$CLAUDE_ENV_FILE" ] && echo "export PATH=\"$LOCAL_BIN:\$PATH\"" >> "$CLAUDE_ENV_FILE"

log "gh CLI installed successfully: $($LOCAL_BIN/gh --version | head -1)"





log "===================================================="
log "Run pnpm install to ensure all dependencies are set up."
log "===================================================="
pnpm install

# check for CODEX_AUTH_JSON env var
if [ -z "$CODEX_AUTH_JSON" ]; then
    log "CODEX_AUTH_JSON not set. Please set it to use Codex CLI."
    exit 0
fi

log "===================================================="
log "Install Codex CLI."
log "===================================================="
npm i -g @openai/codex

log "Setup complete."

# save this (multi-line) env var to a file ~/.codex/auth.json
CODEX_AUTH_FILE="$HOME/.codex/auth.json"
mkdir -p "$(dirname "$CODEX_AUTH_FILE")"
# turn off logging to avoid leaking secrets
set +x
echo "$CODEX_AUTH_JSON" > "$CODEX_AUTH_FILE"
# Set restrictive permissions for credential file
chmod 600 "$CODEX_AUTH_FILE"
# restore logging
set -x
log "Saved CODEX_AUTH_JSON to $CODEX_AUTH_FILE (permissions: 600)"
# Clear the env var for security
unset CODEX_AUTH_JSON

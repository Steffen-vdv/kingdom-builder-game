# Binary Tools

This directory contains compiled binary tools used by the project.

## crypto-gate

The `crypto-gate` binary provides cryptographic signing and verification for the QA approval workflow.

### How It Works

1. **Wrapper script** (`crypto-gate`) detects your OS and architecture
2. **Platform binaries** are downloaded automatically on session start
3. The wrapper delegates to the correct binary: `crypto-gate-{os}-{arch}`

### Supported Platforms

| OS      | Architecture | Binary Name                |
| ------- | ------------ | -------------------------- |
| Linux   | x64          | `crypto-gate-linux-x64`    |
| Linux   | arm64        | `crypto-gate-linux-arm64`  |
| macOS   | x64 (Intel)  | `crypto-gate-darwin-x64`   |
| macOS   | arm64 (M1+)  | `crypto-gate-darwin-arm64` |
| Windows | x64          | `crypto-gate-win-x64.exe`  |

### Installation

Binaries are **downloaded automatically** by `.claude/session-start.sh` on first session start.

To manually download:

```bash
# Set your platform (example for macOS ARM)
CRYPTO_GATE_VERSION="v1.0.0"
BINARY_NAME="crypto-gate-darwin-arm64"

gh release download "$CRYPTO_GATE_VERSION" \
    --repo "YourOrg/crypto-gate" \
    --pattern "$BINARY_NAME" \
    --dir bin/

chmod +x "bin/$BINARY_NAME"
```

### Verification

```bash
./bin/crypto-gate --help
```

### Note

- Binaries are **gitignored** (not committed to repo)
- Built from the separate `crypto-gate` repository
- Secrets are embedded at build time (V8 snapshot)
- Each binary is ~50MB (includes Node.js runtime for standalone execution)

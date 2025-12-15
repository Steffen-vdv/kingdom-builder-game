# Binary Tools

This directory contains compiled binary tools used by the project.

## crypto-gate

The `crypto-gate` binary provides cryptographic signing and verification for the QA approval workflow.

### Installation

Download the appropriate binary for your platform from the crypto-gate releases:

- `crypto-gate-linux-x64` for Linux
- `crypto-gate-macos-x64` for macOS (Intel)
- `crypto-gate-macos-arm64` for macOS (Apple Silicon)
- `crypto-gate-win-x64.exe` for Windows

Rename it to `crypto-gate` (or `crypto-gate.exe` on Windows) and place it in this directory.

### Verification

The binary should be executable:

```bash
chmod +x bin/crypto-gate
./bin/crypto-gate --help
```

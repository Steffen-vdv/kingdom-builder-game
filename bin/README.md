# Binary Tools

This directory contains compiled binary tools used by the project.

## crypto-gate

The `crypto-gate` binary provides cryptographic signing and verification for the QA approval workflow.

### Installation

Download the appropriate binaries for your platform from the crypto-gate releases and place them in this directory:

- `crypto-gate-linux-x64` for Linux
- `crypto-gate-macos-x64` for macOS (Intel)
- `crypto-gate-macos-arm64` for macOS (Apple Silicon)
- `crypto-gate.exe` for Windows

The `crypto-gate` wrapper script automatically selects the correct binary based on your OS and architecture.

### Setup

Make the wrapper script and binaries executable:

```bash
chmod +x bin/crypto-gate
chmod +x bin/crypto-gate-linux-x64      # Linux
chmod +x bin/crypto-gate-macos-x64      # macOS Intel
chmod +x bin/crypto-gate-macos-arm64    # macOS Apple Silicon
```

### Verification

Test the installation:

```bash
./bin/crypto-gate --help
```

### Note

The binaries are built from the separate `crypto-gate` repository with secrets embedded at build time. They are not included in this repository and must be obtained from the crypto-gate CI/CD pipeline.

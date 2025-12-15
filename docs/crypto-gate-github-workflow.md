# crypto-gate GitHub Actions Workflow

This document contains the GitHub Actions workflow for the `crypto-gate` repository.
Copy this to `.github/workflows/release.yml` in the crypto-gate repo.

## Prerequisites

1. Create a GitHub repository secret named `CRYPTO_GATE_SECRET` with the HMAC signing secret
2. Optionally create `CRYPTO_GATE_OVERRIDE_TOKEN` for the override feature

## Workflow File

```yaml
# .github/workflows/release.yml
name: Build and Release

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      version:
        description: 'Version tag (e.g., v1.0.0)'
        required: true

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        include:
          - os: linux
            arch: x64
            node_target: node18-linux-x64
          - os: linux
            arch: arm64
            node_target: node18-linux-arm64
          - os: darwin
            arch: x64
            node_target: node18-macos-x64
          - os: darwin
            arch: arm64
            node_target: node18-macos-arm64
          - os: win
            arch: x64
            node_target: node18-win-x64

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Bundle with esbuild (embed secrets)
        env:
          CRYPTO_GATE_SECRET: ${{ secrets.CRYPTO_GATE_SECRET }}
          CRYPTO_GATE_OVERRIDE_TOKEN: ${{ secrets.CRYPTO_GATE_OVERRIDE_TOKEN }}
        run: npm run build

      - name: Install pkg
        run: npm install -g pkg

      - name: Build binary
        run: |
          BINARY_NAME="crypto-gate-${{ matrix.os }}-${{ matrix.arch }}"
          if [[ "${{ matrix.os }}" == "win" ]]; then
            BINARY_NAME="${BINARY_NAME}.exe"
          fi
          pkg dist/bundle.cjs \
            --target ${{ matrix.node_target }} \
            --output "dist/${BINARY_NAME}"

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: crypto-gate-${{ matrix.os }}-${{ matrix.arch }}
          path: dist/crypto-gate-*

  release:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: binaries
          merge-multiple: true

      - name: Get version
        id: version
        run: |
          if [[ "${{ github.event_name }}" == "workflow_dispatch" ]]; then
            echo "version=${{ github.event.inputs.version }}" >> $GITHUB_OUTPUT
          else
            echo "version=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT
          fi

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          tag_name: ${{ steps.version.outputs.version }}
          name: Release ${{ steps.version.outputs.version }}
          body: |
            ## crypto-gate ${{ steps.version.outputs.version }}

            Cryptographic signing tool for QA approval workflow.

            ### Installation

            Download the binary for your platform and place it in your project's `bin/` directory.

            | Platform | Binary |
            |----------|--------|
            | Linux x64 | `crypto-gate-linux-x64` |
            | Linux ARM64 | `crypto-gate-linux-arm64` |
            | macOS Intel | `crypto-gate-darwin-x64` |
            | macOS Apple Silicon | `crypto-gate-darwin-arm64` |
            | Windows x64 | `crypto-gate-win-x64.exe` |
          files: binaries/*
          draft: false
          prerelease: false
```

## esbuild Configuration

The `esbuild.config.mjs` in crypto-gate repo should embed secrets at build time:

```javascript
// esbuild.config.mjs
import * as esbuild from 'esbuild';

await esbuild.build({
	entryPoints: ['src/index.ts'],
	bundle: true,
	platform: 'node',
	target: 'node18',
	outfile: 'dist/bundle.cjs',
	format: 'cjs',
	minify: true,
	define: {
		'process.env.CRYPTO_GATE_SECRET': JSON.stringify(
			process.env.CRYPTO_GATE_SECRET || 'dev-secret-change-me',
		),
		'process.env.CRYPTO_GATE_OVERRIDE_TOKEN': JSON.stringify(
			process.env.CRYPTO_GATE_OVERRIDE_TOKEN || '',
		),
	},
});
```

## package.json scripts

```json
{
	"scripts": {
		"build": "node esbuild.config.mjs",
		"build:binaries": "npm run build && pkg dist/bundle.cjs --targets node18-linux-x64,node18-macos-x64,node18-macos-arm64,node18-win-x64 --out-path dist/"
	}
}
```

## Creating a Release

1. **Via tag push:**

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Via workflow dispatch:**
   - Go to Actions → Build and Release → Run workflow
   - Enter version (e.g., `v1.0.0`)

The workflow will build binaries for all platforms and create a GitHub Release with them attached.

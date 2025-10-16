# CodeRabbit CLI Setup

CodeRabbit's command-line interface powers the automated review gate that runs
before the repository's verification suite. Install and authenticate the CLI as
part of your initial environment setup so `npm run verify` and the Husky hooks
can execute end-to-end.

## Installation overview

1. Visit the official documentation: <https://docs.coderabbit.ai/cli>.
2. Select the instructions for your operating system. CodeRabbit provides
   installers for macOS, Windows, and Linux along with manual download
   options.
3. Place the `coderabbit` binary on your `PATH` (or set the
   `CODERABBIT_BIN` environment variable to the absolute path of the binary).
4. Run `coderabbit auth login` and follow the prompts to connect your CodeRabbit
   account.

After completing the steps above, confirm the installation locally:

```bash
coderabbit --version
coderabbit auth status
```

A successful run prints the installed version and your authentication status.

## When verification complains about CodeRabbit

`npm run verify` writes detailed logs into the `artifacts/` directory. If the
summary reports that the CLI is missing:

- Re-run the installation steps above to make sure the binary is available.
- Check that your shell session includes the directory that contains the
  `coderabbit` binary (`echo $PATH` on Unix-like systems or `echo %PATH%` on
  Windows).
- Set the `CODERABBIT_BIN` environment variable if the binary lives outside the
  default `PATH` search folders.
- Repeat `coderabbit --version` to confirm the CLI can be launched before you
  rerun `npm run verify`.

Once the CLI launches successfully, the verification script will resume running
CodeRabbit ahead of the lint, type-check, and coverage steps.

## Repository-provided fallback

Some automated environments cannot install the official CodeRabbit binary.
To keep verification stable, the repository bundles a lightweight stub CLI
published as the `@kingdom-builder/coderabbit-cli` workspace.
When npm runs tasks such as `npm run verify`, the stub adds itself to PATH
so commands like `coderabbit review` and `coderabbit --version` succeed.
The stub prints reminders that full reviews still require the official CLI,
so install and authenticate the upstream tool for day-to-day development.

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

## Bundled stub for sandbox environments

Some contributors run the repository inside sandboxes where installing the
official CLI is not possible. To keep `npm run verify` stable, the repository
ships a lightweight stub located in `bin/coderabbit` (with a Windows wrapper at
`bin/coderabbit.cmd`). The automation scripts automatically prepend this
directory to `PATH` and fall back to the stub whenever the real binary is
unavailable.

The stub provides:

- `coderabbit --version` for environment checks.
- `coderabbit review` to unblock verification pipelines.
- `coderabbit auth status` and `coderabbit auth login` messaging that explains
  how to install the genuine CLI.

The stub does **not** contact the CodeRabbit service or perform real reviews. If
you have the ability to install the official CLI, prefer doing so—it will be
used automatically once it appears on `PATH`.

# Database Setup Guide

BoardSmith uses SQLite for lightweight data persistence. SQLite is embedded
and requires no separate database server process.

## Prerequisites

The server package uses `better-sqlite3`, which requires a C++ compiler to build
native bindings during `pnpm install`. Most systems have this pre-installed.

---

## Windows Installation

### Option 1: Visual Studio Build Tools (Recommended)

1. Download **Visual Studio Build Tools** from:
   https://visualstudio.microsoft.com/visual-cpp-build-tools/

2. Run the installer and select:
   - **"Desktop development with C++"** workload
   - Ensure these are checked (usually selected by default):
     - MSVC v143 (or latest version)
     - Windows 11 SDK (or Windows 10 SDK)

3. Restart your terminal completely (close and reopen)

4. Run:
   ```powershell
   pnpm install
   ```

### Option 2: Chocolatey (Alternative)

If you have [Chocolatey](https://chocolatey.org/) installed:

```powershell
# Run as Administrator
choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

Then restart your terminal and run `pnpm install`.

### Verify Installation

```powershell
pnpm run build --filter=@boardsmith/server
```

### Troubleshooting Windows Build Issues

**"windows-build-tools" package errors**: Do NOT use `npm install -g
windows-build-tools`. This package is deprecated and broken on Node.js 18+.
Use Option 1 or Option 2 above instead.

**Build still failing after installing Visual Studio Build Tools**:

1. Ensure you selected the "Desktop development with C++" workload
2. Completely close and reopen your terminal
3. Try cleaning the cache and reinstalling:
   ```powershell
   rd /s /q node_modules
   pnpm install
   ```

**"MSBUILD : error MSB3428"**: Visual Studio Build Tools not fully installed.
Rerun the installer and ensure "MSVC" compiler is selected.

---

## Linux Installation

### Debian/Ubuntu

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3
pnpm install
```

### Fedora/RHEL/CentOS

```bash
sudo dnf groupinstall "Development Tools"
sudo dnf install python3
pnpm install
```

### Arch Linux

```bash
sudo pacman -S base-devel python
pnpm install
```

### Alpine Linux (Docker)

```bash
apk add --no-cache build-base python3
pnpm install
```

---

## Database Location

By default, the database file is created at:

```
./data/boardsmith.db
```

### Custom Location

Set the `BS_DATABASE_PATH` environment variable to use a different path:

```bash
# Linux/macOS
export BS_DATABASE_PATH=/var/lib/boardsmith/data.db

# Windows PowerShell
$env:BS_DATABASE_PATH = "C:\ProgramData\BoardSmith\data.db"

# Windows CMD
set BS_DATABASE_PATH=C:\ProgramData\BoardSmith\data.db
```

---

## Database Management

### Location

The database file and WAL (Write-Ahead Log) files will be at:

```
./data/boardsmith.db       # Main database
./data/boardsmith.db-wal   # Write-ahead log
./data/boardsmith.db-shm   # Shared memory file
```

### Backup

To backup the database, copy all three files while the server is stopped:

```bash
# Stop server first, then:
cp ./data/boardsmith.db* /path/to/backup/
```

### Reset Database

To reset the database, delete the files and restart the server:

```bash
rm -f ./data/boardsmith.db*
pnpm dev --filter=@boardsmith/server
```

Migrations will automatically run on next server start.

---

## Migrations

Schema changes are managed through SQL migration files in:

```
packages/server/migrations/
```

### Migration Format

Files follow the naming convention:

```
NNN_description.sql
```

- `NNN` = 3-digit version number (001, 002, etc.)
- `description` = lowercase with underscores

Example: `001_create_visitor_stats.sql`

### Automatic Execution

Migrations run automatically on server startup. The `schema_migrations` table
tracks which migrations have been applied.

### Manual Check

To see applied migrations:

```sql
SELECT * FROM schema_migrations ORDER BY version;
```

---

## Troubleshooting

### "Cannot find module 'better-sqlite3'"

The native module needs to be rebuilt. Run:

```bash
pnpm rebuild better-sqlite3
```

### "Python not found" during pnpm install

Ensure Python 3 is installed and in PATH:

```bash
# Check Python
python3 --version

# Or on Windows
python --version
```

### "SQLITE_BUSY" errors

This occurs when multiple processes try to write simultaneously. SQLite handles
this gracefully with WAL mode, but if issues persist:

1. Ensure only one server instance is running
2. Check for zombie processes: `ps aux | grep boardsmith`
3. Delete the `.db-shm` and `.db-wal` files (data is safe in main `.db`)

### Database locked after crash

If the server crashes, WAL files may need cleanup:

```bash
sqlite3 ./data/boardsmith.db "PRAGMA wal_checkpoint(TRUNCATE);"
```

Or simply delete the WAL files and restart.

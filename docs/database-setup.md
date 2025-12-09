# Database Setup Guide

Kingdom Builder uses SQLite for lightweight data persistence. SQLite is embedded
and requires no separate database server process.

## Prerequisites

The server package uses `better-sqlite3`, which requires a C++ compiler to build
native bindings during `npm install`. Most systems have this pre-installed.

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
   npm install
   ```

### Option 2: Chocolatey (Alternative)

If you have [Chocolatey](https://chocolatey.org/) installed:

```powershell
# Run as Administrator
choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

Then restart your terminal and run `npm install`.

### Verify Installation

```powershell
npm run build --workspace=@kingdom-builder/server
```

### Troubleshooting Windows Build Issues

**"windows-build-tools" package errors**: Do NOT use `npm install -g
windows-build-tools`. This package is deprecated and broken on Node.js 18+.
Use Option 1 or Option 2 above instead.

**Build still failing after installing Visual Studio Build Tools**:

1. Ensure you selected the "Desktop development with C++" workload
2. Completely close and reopen your terminal
3. Try cleaning npm cache:
   ```powershell
   npm cache clean --force
   rd /s /q node_modules
   npm install
   ```

**"MSBUILD : error MSB3428"**: Visual Studio Build Tools not fully installed.
Rerun the installer and ensure "MSVC" compiler is selected.

---

## Linux Installation

### Debian/Ubuntu

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3
npm install
```

### Fedora/RHEL/CentOS

```bash
sudo dnf groupinstall "Development Tools"
sudo dnf install python3
npm install
```

### Arch Linux

```bash
sudo pacman -S base-devel python
npm install
```

### Alpine Linux (Docker)

```bash
apk add --no-cache build-base python3
npm install
```

---

## Database Location

By default, the database file is created at:

```
./data/kingdom-builder.db
```

### Custom Location

Set the `KB_DATABASE_PATH` environment variable to use a different path:

```bash
# Linux/macOS
export KB_DATABASE_PATH=/var/lib/kingdom-builder/data.db

# Windows PowerShell
$env:KB_DATABASE_PATH = "C:\ProgramData\KingdomBuilder\data.db"

# Windows CMD
set KB_DATABASE_PATH=C:\ProgramData\KingdomBuilder\data.db
```

---

## Disabling Database Features

To run the server without database (useful for testing):

```bash
# Start server without visitor tracking
KB_VISITOR_TRACKING=0 npm run dev --workspace=@kingdom-builder/server
```

Or programmatically:

```typescript
import { startServer } from '@kingdom-builder/server';

await startServer({
	enableVisitorTracking: false,
});
```

---

## Database Management

### Location

The database file and WAL (Write-Ahead Log) files will be at:

```
./data/kingdom-builder.db       # Main database
./data/kingdom-builder.db-wal   # Write-ahead log
./data/kingdom-builder.db-shm   # Shared memory file
```

### Backup

To backup the database, copy all three files while the server is stopped:

```bash
# Stop server first, then:
cp ./data/kingdom-builder.db* /path/to/backup/
```

### Reset Database

To reset the database, delete the files and restart the server:

```bash
rm -f ./data/kingdom-builder.db*
npm run dev --workspace=@kingdom-builder/server
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
npm rebuild better-sqlite3
```

### "Python not found" during npm install

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
2. Check for zombie processes: `ps aux | grep kingdom`
3. Delete the `.db-shm` and `.db-wal` files (data is safe in main `.db`)

### Database locked after crash

If the server crashes, WAL files may need cleanup:

```bash
sqlite3 ./data/kingdom-builder.db "PRAGMA wal_checkpoint(TRUNCATE);"
```

Or simply delete the WAL files and restart.

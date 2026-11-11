package db

import (
	"database/sql"
	"embed"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

var migrations = "migrations"

func Open() (*sql.DB, error) {
	dbPath, err := DefaultDBPath()
	if err != nil {
		return nil, err
	}
	return OpenAt(dbPath)
}

func OpenAt(dbPath string) (*sql.DB, error) {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("creating db directory: %w", err)
	}

	db, err := sql.Open("sqlite", dbPath+"?_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)")
	if err != nil {
		return nil, fmt.Errorf("opening database: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("pinging database: %w", err)
	}

	if err := runMigrations(db, dir); err != nil {
		db.Close()
		return nil, fmt.Errorf("running migrations: %w", err)
	}

	return db, nil
}

func DefaultDBPath() (string, error) {
	dataDir, err := os.UserConfigDir()
	if err != nil {
		home, err2 := os.UserHomeDir()
		if err2 != nil {
			return "", fmt.Errorf("finding home directory: %w", err)
		}
		dataDir = filepath.Join(home, ".config")
	}
	return filepath.Join(dataDir, "taskboard", "taskboard.db"), nil
}

// backupBeforeMigration пишет копию базы в <dir>/backups перед применением миграции.
func backupBeforeMigration(database *sql.DB, dir, migration string) error {
	backupDir := filepath.Join(dir, "backups")
	if err := os.MkdirAll(backupDir, 0o755); err != nil {
		return fmt.Errorf("creating backup directory: %w", err)
	}
	name := fmt.Sprintf("pre-%s-%s.db", strings.TrimSuffix(migration, ".sql"), time.Now().Format("20060102-150405"))
	if _, err := database.Exec("VACUUM INTO ?", filepath.Join(backupDir, name)); err != nil {
		return fmt.Errorf("backing up database before %s: %w", migration, err)
	}
	return nil
}

func runMigrations(database *sql.DB, dir string) error {
	_, err := database.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version TEXT PRIMARY KEY,
		applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`)
	if err != nil {
		return fmt.Errorf("creating migrations table: %w", err)
	}

	entries, err := migrationsFS.ReadDir(migrations)
	if err != nil {
		return fmt.Errorf("reading migrations: %w", err)
	}

	var applied int
	if err := database.QueryRow("SELECT COUNT(*) FROM schema_migrations").Scan(&applied); err != nil {
		return fmt.Errorf("counting applied migrations: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()

		var count int
		err := database.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE version = ?", name).Scan(&count)
		if err != nil {
			return fmt.Errorf("checking migration %s: %w", name, err)
		}
		if count > 0 {
			continue
		}

		content, err := migrationsFS.ReadFile(path.Join(migrations, name))
		if err != nil {
			return fmt.Errorf("reading migration %s: %w", name, err)
		}

		// В новой пустой базе терять нечего, бэкап нужен только когда уже есть применённые миграции.
		if applied > 0 {
			if err := backupBeforeMigration(database, dir, name); err != nil {
				return err
			}
		}

		tx, err := database.Begin()
		if err != nil {
			return fmt.Errorf("beginning transaction for %s: %w", name, err)
		}

		if _, err := tx.Exec(string(content)); err != nil {
			tx.Rollback()
			return fmt.Errorf("executing migration %s: %w", name, err)
		}

		if _, err := tx.Exec("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)", name); err != nil {
			tx.Rollback()
			return fmt.Errorf("recording migration %s: %w", name, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("committing migration %s: %w", name, err)
		}
	}

	return nil
}

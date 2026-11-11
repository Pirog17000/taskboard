package db

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/tcarac/taskboard/internal/models"
)

func newTestStore(t *testing.T) (*Store, string) {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "test.db")
	database, err := OpenAt(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { database.Close() })
	return NewStore(database), dbPath
}

func mustTicket(t *testing.T, s *Store, projectID, title string) *models.Ticket {
	t.Helper()
	tk, err := s.CreateTicket(models.CreateTicketRequest{ProjectID: projectID, Title: title, Description: "Описание " + title})
	if err != nil {
		t.Fatal(err)
	}
	return tk
}

func TestMigrationBackup(t *testing.T) {
	s, dbPath := newTestStore(t)
	backups := filepath.Join(filepath.Dir(dbPath), "backups")
	if _, err := os.Stat(backups); err == nil {
		t.Fatal("fresh database must not produce a backup")
	}

	if _, err := s.db.Exec("DROP TABLE ticket_fields; DELETE FROM schema_migrations WHERE version = '003_ticket_fields.sql'"); err != nil {
		t.Fatal(err)
	}
	if err := runMigrations(s.db, filepath.Dir(dbPath)); err != nil {
		t.Fatal(err)
	}
	files, err := filepath.Glob(filepath.Join(backups, "pre-003_ticket_fields-*.db"))
	if err != nil || len(files) != 1 {
		t.Fatalf("expected one pre-migration backup, got %v (%v)", files, err)
	}
}

func TestMigrationStopsWhenBackupFails(t *testing.T) {
	s, dbPath := newTestStore(t)
	dir := filepath.Dir(dbPath)
	if _, err := s.db.Exec("DROP TABLE ticket_fields; DELETE FROM schema_migrations WHERE version = '003_ticket_fields.sql'"); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "backups"), []byte("not a dir"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := runMigrations(s.db, dir); err == nil {
		t.Fatal("migration must fail when backup cannot be written")
	}
	var n int
	s.db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE name = 'ticket_fields'").Scan(&n)
	if n != 0 {
		t.Fatal("migration ran despite failed backup")
	}
}

func TestTicketLookupFieldsDependenciesCompact(t *testing.T) {
	s, _ := newTestStore(t)
	p, err := s.CreateProject(models.CreateProjectRequest{Name: "Port", Prefix: "UE"})
	if err != nil {
		t.Fatal(err)
	}
	a := mustTicket(t, s, p.ID, "Первый")
	b := mustTicket(t, s, p.ID, "Второй")
	c := mustTicket(t, s, p.ID, "Third")

	id, err := s.ResolveTicketID("ue-2")
	if err != nil || id != b.ID {
		t.Fatalf("key lookup: %v %v", id, err)
	}
	if _, err := s.ResolveTicketID("UE-99"); !errors.Is(err, ErrTicketNotFound) {
		t.Fatalf("want not found, got %v", err)
	}
	if id, _ := s.ResolveTicketID(c.ID); id != c.ID {
		t.Fatal("id lookup")
	}

	if err := s.SetTicketFields(a.ID, map[string]string{"Class": "core", "stage": "3"}); err != nil {
		t.Fatal(err)
	}
	if err := s.SetTicketFields(a.ID, map[string]string{"stage": ""}); err != nil {
		t.Fatal(err)
	}
	got, _ := s.GetTicket(a.ID)
	if len(got.Fields) != 1 || got.Fields["class"] != "core" {
		t.Fatalf("fields: %v", got.Fields)
	}

	if err := s.AddDependency(b.ID, a.ID); err != nil {
		t.Fatal(err)
	}
	if err := s.AddDependency(a.ID, b.ID); !errors.Is(err, ErrInvalidDependency) {
		t.Fatalf("2-cycle must be rejected, got %v", err)
	}
	if err := s.AddDependency(c.ID, b.ID); err != nil {
		t.Fatal(err)
	}
	if err := s.AddDependency(a.ID, c.ID); !errors.Is(err, ErrInvalidDependency) {
		t.Fatalf("3-cycle must be rejected, got %v", err)
	}
	if err := s.AddDependency(a.ID, a.ID); !errors.Is(err, ErrInvalidDependency) {
		t.Fatalf("self-dependency must be rejected, got %v", err)
	}

	got, _ = s.GetTicket(b.ID)
	if got.OpenBlockers != 1 || len(got.BlockedByKeys) != 1 || got.BlockedByKeys[0] != "UE-1" {
		t.Fatalf("blockers: %+v", got)
	}

	unblocked, _ := s.ListTickets(models.TicketFilter{Unblocked: true})
	if len(unblocked) != 1 || unblocked[0].ID != a.ID {
		t.Fatalf("unblocked: %+v", unblocked)
	}
	if _, err := s.MoveTicket(a.ID, models.MoveTicketRequest{Status: "done"}); err != nil {
		t.Fatal(err)
	}
	unblocked, _ = s.ListTickets(models.TicketFilter{Unblocked: true, ProjectID: "ue"})
	if len(unblocked) != 2 {
		t.Fatalf("after done want 2 unblocked, got %d", len(unblocked))
	}

	if err := s.RemoveDependency(c.ID, b.ID); err != nil {
		t.Fatal(err)
	}
	got, _ = s.GetTicket(c.ID)
	if len(got.BlockedBy) != 0 {
		t.Fatal("dependency not removed")
	}

	found, _ := s.ListTickets(models.TicketFilter{Search: "ВТОРОЙ"})
	if len(found) != 1 || found[0].ID != b.ID {
		t.Fatalf("cyrillic search: %+v", found)
	}
	found, _ = s.ListTickets(models.TicketFilter{Search: "ue-3"})
	if len(found) != 1 || found[0].ID != c.ID {
		t.Fatalf("key search: %+v", found)
	}
	found, _ = s.ListTickets(models.TicketFilter{Field: "class=CORE"})
	if len(found) != 1 || found[0].ID != a.ID {
		t.Fatalf("field value filter: %+v", found)
	}
	found, _ = s.ListTickets(models.TicketFilter{Field: "stage"})
	if len(found) != 0 {
		t.Fatalf("field presence filter: %+v", found)
	}

	if _, err := s.AddSubtask(a.ID, models.CreateSubtaskRequest{Title: "x"}); err != nil {
		t.Fatal(err)
	}
	st, _ := s.AddSubtask(a.ID, models.CreateSubtaskRequest{Title: "y"})
	s.ToggleSubtask(st.ID)
	compact, _ := s.GetTicketCompact(a.ID)
	if compact.Description != "" || compact.Subtasks != nil || compact.SubtasksTotal != 2 || compact.SubtasksDone != 1 {
		t.Fatalf("compact: %+v", compact)
	}
	full, _ := s.GetTicket(a.ID)
	if full.Description == "" || len(full.Subtasks) != 2 {
		t.Fatalf("full: %+v", full)
	}

	board, err := s.GetBoard(models.TicketFilter{ProjectID: "UE", Compact: true})
	if err != nil || len(board.Columns) != 4 || len(board.Columns[3].Tickets) != 1 || len(board.Columns[0].Tickets) != 2 {
		t.Fatalf("board: %+v %v", board, err)
	}
}

func TestAppendToTicket(t *testing.T) {
	s, _ := newTestStore(t)
	p, _ := s.CreateProject(models.CreateProjectRequest{Name: "Port", Prefix: "UE"})
	a := mustTicket(t, s, p.ID, "A")
	if err := s.AppendToTicket(a.ID, "Новое"); err != nil {
		t.Fatal(err)
	}
	got, _ := s.GetTicket(a.ID)
	if !strings.HasSuffix(got.Description, "\n\nНовое") || !strings.HasPrefix(got.Description, "Описание A") {
		t.Fatalf("description: %q", got.Description)
	}
	if err := s.AppendToTicket("missing", "x"); !errors.Is(err, ErrTicketNotFound) {
		t.Fatalf("want not found, got %v", err)
	}
}

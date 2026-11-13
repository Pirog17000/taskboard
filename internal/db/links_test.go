package db

import (
	"errors"
	"path/filepath"
	"slices"
	"testing"

	"github.com/tcarac/taskboard/internal/models"
)

func countRows(t *testing.T, s *Store, query string) int {
	t.Helper()
	var n int
	if err := s.db.QueryRow(query).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func hasLink(links []models.LinkRef, want models.LinkRef) bool {
	return slices.Contains(links, want)
}

// Migration 004 must add the link table to a database that already has tickets and dependencies.
func TestLinkMigrationKeepsExistingRows(t *testing.T) {
	s, dbPath := newTestStore(t)
	dir := filepath.Dir(dbPath)
	p, _ := s.CreateProject(models.CreateProjectRequest{Name: "Port", Prefix: "UE"})
	a := mustTicket(t, s, p.ID, "A")
	b := mustTicket(t, s, p.ID, "B")
	if err := s.AddDependency(b.ID, a.ID); err != nil {
		t.Fatal(err)
	}

	// Make the database look like it was created before migration 004.
	if _, err := s.db.Exec("DROP TABLE ticket_links; DELETE FROM schema_migrations WHERE version = '004_ticket_links.sql'"); err != nil {
		t.Fatal(err)
	}
	if err := runMigrations(s.db, dir); err != nil {
		t.Fatal(err)
	}
	files, err := filepath.Glob(filepath.Join(dir, "backups", "pre-004_ticket_links-*.db"))
	if err != nil || len(files) != 1 {
		t.Fatalf("expected one pre-migration backup, got %v (%v)", files, err)
	}

	got, _ := s.GetTicket(b.ID)
	if got == nil || len(got.BlockedBy) != 1 || got.OpenBlockers != 1 {
		t.Fatalf("dependency lost: %+v", got)
	}
	if n := countRows(t, s, "SELECT COUNT(*) FROM tickets"); n != 2 {
		t.Fatalf("tickets: want 2, got %d", n)
	}
	if err := s.AddLink(a.ID, b.ID, "relates_to"); err != nil {
		t.Fatal(err)
	}
}

func TestLinks(t *testing.T) {
	s, _ := newTestStore(t)
	p, _ := s.CreateProject(models.CreateProjectRequest{Name: "Port", Prefix: "UE"})
	a := mustTicket(t, s, p.ID, "A")
	b := mustTicket(t, s, p.ID, "B")
	c := mustTicket(t, s, p.ID, "C")

	if err := s.AddLink(a.ID, b.ID, "duplicates"); err != nil {
		t.Fatal(err)
	}
	if err := s.AddLink(a.ID, b.ID, "duplicates"); err != nil {
		t.Fatalf("adding an existing link must not fail: %v", err)
	}
	if n := countRows(t, s, "SELECT COUNT(*) FROM ticket_links"); n != 1 {
		t.Fatalf("duplicate link stored twice: %d rows", n)
	}
	if err := s.AddLink(a.ID, a.ID, "relates_to"); !errors.Is(err, ErrInvalidLink) {
		t.Fatalf("self-link must be rejected, got %v", err)
	}
	if err := s.AddLink(a.ID, b.ID, "blocks"); !errors.Is(err, ErrInvalidLink) {
		t.Fatalf("unknown type must be rejected, got %v", err)
	}

	// relates_to is symmetric: both orders are one stored row.
	if err := s.AddLink(b.ID, a.ID, "relates_to"); err != nil {
		t.Fatal(err)
	}
	if err := s.AddLink(a.ID, b.ID, "relates_to"); err != nil {
		t.Fatal(err)
	}
	if n := countRows(t, s, "SELECT COUNT(*) FROM ticket_links WHERE type = 'relates_to'"); n != 1 {
		t.Fatalf("relates_to stored %d times", n)
	}

	// duplicates is directed: A duplicates B, shown as "duplicate of" on A and "duplicated by" on B.
	gotA, _ := s.GetTicket(a.ID)
	gotB, _ := s.GetTicket(b.ID)
	if !hasLink(gotA.Links, models.LinkRef{Type: "duplicates", Direction: "out", Key: "UE-2"}) {
		t.Fatalf("A links: %+v", gotA.Links)
	}
	if !hasLink(gotB.Links, models.LinkRef{Type: "duplicates", Direction: "in", Key: "UE-1"}) {
		t.Fatalf("B links: %+v", gotB.Links)
	}
	if !hasLink(gotA.Links, models.LinkRef{Type: "relates_to", Key: "UE-2"}) || !hasLink(gotB.Links, models.LinkRef{Type: "relates_to", Key: "UE-1"}) {
		t.Fatalf("relates_to not shown on both ends: %+v / %+v", gotA.Links, gotB.Links)
	}

	// Removing the reverse duplicates link does nothing; relates_to ignores the order.
	if err := s.RemoveLink(b.ID, a.ID, "duplicates"); err != nil {
		t.Fatal(err)
	}
	if n := countRows(t, s, "SELECT COUNT(*) FROM ticket_links WHERE type = 'duplicates'"); n != 1 {
		t.Fatalf("reverse removal must not touch a directed link, rows: %d", n)
	}
	if err := s.RemoveLink(b.ID, a.ID, "relates_to"); err != nil {
		t.Fatal(err)
	}
	if n := countRows(t, s, "SELECT COUNT(*) FROM ticket_links WHERE type = 'relates_to'"); n != 0 {
		t.Fatalf("relates_to not removed: %d rows", n)
	}

	if err := s.AddLink(c.ID, a.ID, "relates_to"); err != nil {
		t.Fatal(err)
	}
	// Deleting a ticket removes every link it takes part in.
	if err := s.DeleteTicket(a.ID); err != nil {
		t.Fatal(err)
	}
	if n := countRows(t, s, "SELECT COUNT(*) FROM ticket_links"); n != 0 {
		t.Fatalf("links of a deleted ticket remain: %d rows", n)
	}
}

func TestCancelledBlockerDoesNotBlock(t *testing.T) {
	s, _ := newTestStore(t)
	p, _ := s.CreateProject(models.CreateProjectRequest{Name: "Port", Prefix: "UE"})
	a := mustTicket(t, s, p.ID, "A")
	b := mustTicket(t, s, p.ID, "B")
	if err := s.AddDependency(b.ID, a.ID); err != nil {
		t.Fatal(err)
	}

	// Triage and backlog are still open, so they keep blocking.
	for _, status := range []string{"triage", "backlog"} {
		if _, err := s.MoveTicket(a.ID, models.MoveTicketRequest{Status: status}); err != nil {
			t.Fatal(err)
		}
		if got, _ := s.GetTicket(b.ID); got.OpenBlockers != 1 {
			t.Fatalf("%s blocker must still block, openBlockers=%d", status, got.OpenBlockers)
		}
	}

	if _, err := s.MoveTicket(a.ID, models.MoveTicketRequest{Status: "cancelled"}); err != nil {
		t.Fatal(err)
	}
	got, _ := s.GetTicket(b.ID)
	if got.OpenBlockers != 0 || len(got.OpenBlockerKeys) != 0 || len(got.BlockedByKeys) != 1 {
		t.Fatalf("cancelled blocker still blocks: %+v", got)
	}
	unblocked, _ := s.ListTickets(models.TicketFilter{Unblocked: true})
	if len(unblocked) != 2 {
		t.Fatalf("after cancel want 2 unblocked, got %d", len(unblocked))
	}
}

func TestNewStatuses(t *testing.T) {
	s, _ := newTestStore(t)
	p, _ := s.CreateProject(models.CreateProjectRequest{Name: "Port", Prefix: "UE"})
	for _, status := range []string{"triage", "backlog", "cancelled"} {
		if _, err := s.CreateTicket(models.CreateTicketRequest{ProjectID: p.ID, Title: status, Status: status}); err != nil {
			t.Fatalf("create with %s: %v", status, err)
		}
	}
	a := mustTicket(t, s, p.ID, "A")
	if _, err := s.MoveTicket(a.ID, models.MoveTicketRequest{Status: "bogus"}); !errors.Is(err, ErrInvalidStatus) {
		t.Fatalf("unknown status must be rejected, got %v", err)
	}

	board, err := s.GetBoard(models.TicketFilter{ProjectID: "UE"})
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"triage", "backlog", "todo", "in_progress", "ready_for_review", "done", "cancelled"}
	for i, col := range board.Columns {
		if col.Status != want[i] {
			t.Fatalf("column %d: want %s, got %s", i, want[i], col.Status)
		}
	}
	if len(board.Columns[0].Tickets) != 1 || len(board.Columns[1].Tickets) != 1 || len(board.Columns[6].Tickets) != 1 {
		t.Fatalf("new statuses not placed in their columns: %+v", board.Columns)
	}
}

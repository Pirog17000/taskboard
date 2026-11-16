package db

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/tcarac/taskboard/internal/models"
)

var (
	// ErrLiveCard is returned when a live card is moved by hand: only scripts change it.
	ErrLiveCard = errors.New("live card cannot be moved or edited by hand")
	// ErrInvalidLive is returned for a bad upsert_live_card request.
	ErrInvalidLive = errors.New("invalid live card")
)

const (
	maxLiveLines = 4
	maxLiveTitle = 120
	maxLiveText  = 160
)

// clip trims s and cuts it to n runes.
func clip(s string, n int) string {
	s = strings.TrimSpace(s)
	if r := []rune(s); len(r) > n {
		return string(r[:n])
	}
	return s
}

// UpsertLiveCard creates the live card (projectId, liveId) in in_progress, or updates the existing one in place.
func (s *Store) UpsertLiveCard(req models.UpsertLiveRequest) (*models.Ticket, error) {
	liveID := strings.TrimSpace(req.LiveID)
	title := clip(req.Title, maxLiveTitle)
	if req.ProjectID == "" || liveID == "" || title == "" {
		return nil, fmt.Errorf("%w: projectId, liveId and title are required", ErrInvalidLive)
	}
	state := req.State
	if state == "" {
		state = "running"
	}
	if !models.IsValidLiveState(state) {
		return nil, fmt.Errorf("%w: state must be one of %v", ErrInvalidLive, models.LiveStates)
	}
	projectID := s.resolveProjectID(req.ProjectID)
	if p, err := s.GetProject(projectID); err != nil {
		return nil, err
	} else if p == nil {
		return nil, fmt.Errorf("%w: project %q not found", ErrInvalidLive, req.ProjectID)
	}

	progress := min(max(req.Progress, 0), 100)
	var lines []string
	for _, l := range req.Lines {
		if l = clip(l, maxLiveText); l != "" && len(lines) < maxLiveLines {
			lines = append(lines, l)
		}
	}
	linesJSON, _ := json.Marshal(lines)
	now := time.Now()

	var id string
	err := s.db.QueryRow("SELECT id FROM tickets WHERE project_id = ? AND live_id = ?", projectID, liveID).Scan(&id)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	if err == sql.ErrNoRows {
		num, err := s.nextTicketNumber(projectID)
		if err != nil {
			return nil, fmt.Errorf("getting next ticket number: %w", err)
		}
		id = newID()
		var expires any
		if req.ExpiresInSeconds != nil && *req.ExpiresInSeconds > 0 {
			expires = now.Add(time.Duration(*req.ExpiresInSeconds) * time.Second)
		}
		_, err = s.db.Exec(
			`INSERT INTO tickets (id, project_id, number, title, description, status, priority, position, created_at, updated_at,
				kind, live_id, progress, progress_text, live_state, live_lines, expires_at)
			VALUES (?, ?, ?, ?, '', 'in_progress', 'medium', 0, ?, ?, 'live', ?, ?, ?, ?, ?, ?)`,
			id, projectID, num, title, now, now, liveID, progress, clip(req.ProgressText, maxLiveText), state, string(linesJSON), expires)
		if err != nil {
			return nil, err
		}
		return s.GetTicket(id)
	}

	_, err = s.db.Exec(
		`UPDATE tickets SET title=?, progress=?, progress_text=?, live_state=?, live_lines=?, updated_at=? WHERE id=?`,
		title, progress, clip(req.ProgressText, maxLiveText), state, string(linesJSON), now, id)
	if err != nil {
		return nil, err
	}
	if req.ExpiresInSeconds != nil {
		var expires any
		if *req.ExpiresInSeconds > 0 {
			expires = now.Add(time.Duration(*req.ExpiresInSeconds) * time.Second)
		}
		if _, err := s.db.Exec("UPDATE tickets SET expires_at=? WHERE id=?", expires, id); err != nil {
			return nil, err
		}
	}
	return s.GetTicket(id)
}

// RemoveLiveCard deletes the live card (projectId, liveId); it reports whether one existed.
func (s *Store) RemoveLiveCard(projectID, liveID string) (bool, error) {
	res, err := s.db.Exec("DELETE FROM tickets WHERE project_id = ? AND live_id = ?", s.resolveProjectID(projectID), strings.TrimSpace(liveID))
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

// SweepExpiredLive deletes live cards whose expiry has passed.
func (s *Store) SweepExpiredLive() error {
	rows, err := s.db.Query("SELECT id, expires_at FROM tickets WHERE live_id IS NOT NULL AND expires_at IS NOT NULL")
	if err != nil {
		return err
	}
	var expired []string
	now := time.Now()
	for rows.Next() {
		var id string
		var at time.Time
		if err := rows.Scan(&id, &at); err != nil {
			rows.Close()
			return err
		}
		if now.After(at) {
			expired = append(expired, id)
		}
	}
	rows.Close()
	for _, id := range expired {
		if _, err := s.db.Exec("DELETE FROM tickets WHERE id = ?", id); err != nil {
			return err
		}
	}
	return rows.Err()
}

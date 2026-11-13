package db

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/tcarac/taskboard/internal/models"
)

var ErrQuestionNotFound = errors.New("question not found")

const questionCols = "id, ticket_id, position, text, answer, created_at, answered_at"

func scanQuestion(row interface{ Scan(...any) error }) (models.Question, error) {
	var q models.Question
	var answeredAt sql.NullTime
	if err := row.Scan(&q.ID, &q.TicketID, &q.Position, &q.Text, &q.Answer, &q.CreatedAt, &answeredAt); err != nil {
		return q, err
	}
	if answeredAt.Valid {
		t := answeredAt.Time
		q.AnsweredAt = &t
	}
	return q, nil
}

// AddQuestion appends an unanswered question to the end of the ticket's list.
func (s *Store) AddQuestion(ticketID string, req models.CreateQuestionRequest) (*models.Question, error) {
	var maxPos int
	s.db.QueryRow("SELECT COALESCE(MAX(position), -1) + 1 FROM questions WHERE ticket_id = ?", ticketID).Scan(&maxPos)

	q := models.Question{
		ID:        newID(),
		TicketID:  ticketID,
		Position:  maxPos,
		Text:      req.Text,
		CreatedAt: time.Now().UTC(),
	}
	_, err := s.db.Exec("INSERT INTO questions (id, ticket_id, position, text, answer, created_at) VALUES (?, ?, ?, ?, '', ?)",
		q.ID, q.TicketID, q.Position, q.Text, q.CreatedAt)
	return &q, err
}

// AnswerQuestion stores the answer; a blank answer marks the question unanswered again.
func (s *Store) AnswerQuestion(id, answer string) (*models.Question, error) {
	var answeredAt any
	if strings.TrimSpace(answer) != "" {
		answeredAt = time.Now().UTC()
	}
	res, err := s.db.Exec("UPDATE questions SET answer = ?, answered_at = ? WHERE id = ?", answer, answeredAt, id)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrQuestionNotFound
	}
	q, err := scanQuestion(s.db.QueryRow("SELECT "+questionCols+" FROM questions WHERE id = ?", id))
	return &q, err
}

func (s *Store) DeleteQuestion(id string) error {
	_, err := s.db.Exec("DELETE FROM questions WHERE id = ?", id)
	return err
}

func (s *Store) populateQuestions(index map[string]*models.Ticket, in string, args []any, compact bool) error {
	if compact {
		rows, err := s.db.Query(
			"SELECT ticket_id, COUNT(*), COALESCE(SUM(CASE WHEN TRIM(answer) = '' THEN 1 ELSE 0 END), 0) FROM questions WHERE ticket_id IN ("+in+") GROUP BY ticket_id",
			args...)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var ticketID string
			var total, open int
			if err := rows.Scan(&ticketID, &total, &open); err != nil {
				return err
			}
			index[ticketID].QuestionsTotal = total
			index[ticketID].QuestionsOpen = open
		}
		return rows.Err()
	}

	rows, err := s.db.Query(
		"SELECT "+questionCols+" FROM questions WHERE ticket_id IN ("+in+") ORDER BY ticket_id, position",
		args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		q, err := scanQuestion(rows)
		if err != nil {
			return err
		}
		index[q.TicketID].Questions = append(index[q.TicketID].Questions, q)
	}
	return rows.Err()
}

package db

import (
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/tcarac/taskboard/internal/models"
)

var (
	// ErrTicketNotFound возвращается, когда ID или ключ тикета ничему не соответствует.
	ErrTicketNotFound = errors.New("ticket not found")
	// ErrInvalidDependency возвращается для зависимости тикета от самого себя и для циклов.
	ErrInvalidDependency = errors.New("invalid dependency")
	// ErrInvalidField возвращается для пустого имени поля.
	ErrInvalidField = errors.New("invalid field")
)

const (
	ticketColumns = `t.id, t.project_id, t.team_id, t.number, t.title, t.description,
		t.status, t.priority, t.due_date, t.position, t.created_at, t.updated_at,
		COALESCE(p.prefix, '') as project_prefix`
	ticketFrom = " FROM tickets t LEFT JOIN projects p ON t.project_id = p.id"

	populateChunk = 500
)

func placeholders(n int) string {
	return strings.TrimSuffix(strings.Repeat("?,", n), ",")
}

func scanTickets(rows *sql.Rows) ([]models.Ticket, error) {
	defer rows.Close()
	var tickets []models.Ticket
	for rows.Next() {
		var t models.Ticket
		if err := rows.Scan(&t.ID, &t.ProjectID, &t.TeamID, &t.Number, &t.Title, &t.Description,
			&t.Status, &t.Priority, &t.DueDate, &t.Position, &t.CreatedAt, &t.UpdatedAt,
			&t.ProjectPrefix); err != nil {
			return nil, err
		}
		tickets = append(tickets, t)
	}
	return tickets, rows.Err()
}

// ResolveTicketID превращает ID тикета или ключ вида "UE-71" (префикс проекта без учёта регистра) в ID.
func (s *Store) ResolveTicketID(ref string) (string, error) {
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return "", fmt.Errorf("ticket id or key is required")
	}
	var id string
	err := s.db.QueryRow("SELECT id FROM tickets WHERE id = ?", ref).Scan(&id)
	if err == nil {
		return id, nil
	}
	if err != sql.ErrNoRows {
		return "", err
	}
	if i := strings.LastIndex(ref, "-"); i > 0 {
		if num, convErr := strconv.Atoi(ref[i+1:]); convErr == nil {
			err = s.db.QueryRow(
				`SELECT t.id FROM tickets t JOIN projects p ON p.id = t.project_id
				WHERE p.prefix = ? COLLATE NOCASE AND t.number = ?`, ref[:i], num).Scan(&id)
			if err == nil {
				return id, nil
			}
			if err != sql.ErrNoRows {
				return "", err
			}
		}
	}
	return "", fmt.Errorf("%w: %s", ErrTicketNotFound, ref)
}

// ResolveTicketIDs применяет ResolveTicketID к списку ссылок.
func (s *Store) ResolveTicketIDs(refs []string) ([]string, error) {
	ids := make([]string, 0, len(refs))
	for _, ref := range refs {
		id, err := s.ResolveTicketID(ref)
		if err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

// resolveProjectID принимает ID проекта или его префикс (без учёта регистра); неизвестное значение возвращает как есть.
func (s *Store) resolveProjectID(ref string) string {
	var id string
	if err := s.db.QueryRow("SELECT id FROM projects WHERE id = ? OR prefix = ? COLLATE NOCASE LIMIT 1", ref, ref).Scan(&id); err != nil {
		return ref
	}
	return id
}

// GetTicketsByIDs возвращает существующие тикеты в порядке ids.
func (s *Store) GetTicketsByIDs(ids []string, compact bool) ([]models.Ticket, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	if len(ids) > populateChunk {
		return nil, fmt.Errorf("too many tickets requested (max %d)", populateChunk)
	}
	args := make([]any, len(ids))
	for i, id := range ids {
		args[i] = id
	}
	rows, err := s.db.Query("SELECT "+ticketColumns+ticketFrom+" WHERE t.id IN ("+placeholders(len(ids))+")", args...)
	if err != nil {
		return nil, err
	}
	found, err := scanTickets(rows)
	if err != nil {
		return nil, err
	}
	if err := s.populate(found, compact); err != nil {
		return nil, err
	}
	byID := make(map[string]models.Ticket, len(found))
	for _, t := range found {
		byID[t.ID] = t
	}
	ordered := make([]models.Ticket, 0, len(ids))
	for _, id := range ids {
		if t, ok := byID[id]; ok {
			ordered = append(ordered, t)
		}
	}
	return ordered, nil
}

// GetTicketCompact возвращает тикет без описания и с подзадачами только счётчиками.
func (s *Store) GetTicketCompact(id string) (*models.Ticket, error) {
	tickets, err := s.GetTicketsByIDs([]string{id}, true)
	if err != nil || len(tickets) == 0 {
		return nil, err
	}
	return &tickets[0], nil
}

// populate одним пакетом запросов на чанк заполняет теги, подзадачи, поля и зависимости тикетов.
func (s *Store) populate(tickets []models.Ticket, compact bool) error {
	for start := 0; start < len(tickets); start += populateChunk {
		chunk := tickets[start:min(start+populateChunk, len(tickets))]
		index := make(map[string]*models.Ticket, len(chunk))
		args := make([]any, len(chunk))
		for i := range chunk {
			index[chunk[i].ID] = &chunk[i]
			args[i] = chunk[i].ID
			if compact {
				chunk[i].Description = ""
			}
		}
		in := placeholders(len(chunk))

		if err := s.populateLabels(index, in, args); err != nil {
			return err
		}
		if err := s.populateSubtasks(index, in, args, compact); err != nil {
			return err
		}
		if err := s.populateQuestions(index, in, args, compact); err != nil {
			return err
		}
		if err := s.populateFields(index, in, args); err != nil {
			return err
		}
		if err := s.populateDependencies(index, in, args); err != nil {
			return err
		}
		if err := s.populateLinks(index, in, args); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) populateLabels(index map[string]*models.Ticket, in string, args []any) error {
	rows, err := s.db.Query(
		"SELECT tl.ticket_id, l.id, l.name, l.color FROM ticket_labels tl JOIN labels l ON l.id = tl.label_id WHERE tl.ticket_id IN ("+in+")",
		args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var ticketID string
		var l models.Label
		if err := rows.Scan(&ticketID, &l.ID, &l.Name, &l.Color); err != nil {
			return err
		}
		index[ticketID].Labels = append(index[ticketID].Labels, l)
	}
	return rows.Err()
}

func (s *Store) populateSubtasks(index map[string]*models.Ticket, in string, args []any, compact bool) error {
	if compact {
		rows, err := s.db.Query(
			"SELECT ticket_id, COUNT(*), COALESCE(SUM(CASE WHEN completed THEN 1 ELSE 0 END), 0) FROM subtasks WHERE ticket_id IN ("+in+") GROUP BY ticket_id",
			args...)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var ticketID string
			var total, done int
			if err := rows.Scan(&ticketID, &total, &done); err != nil {
				return err
			}
			index[ticketID].SubtasksTotal = total
			index[ticketID].SubtasksDone = done
		}
		return rows.Err()
	}

	rows, err := s.db.Query(
		"SELECT id, ticket_id, title, completed, position FROM subtasks WHERE ticket_id IN ("+in+") ORDER BY ticket_id, position",
		args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var st models.Subtask
		if err := rows.Scan(&st.ID, &st.TicketID, &st.Title, &st.Completed, &st.Position); err != nil {
			return err
		}
		index[st.TicketID].Subtasks = append(index[st.TicketID].Subtasks, st)
	}
	return rows.Err()
}

func (s *Store) populateFields(index map[string]*models.Ticket, in string, args []any) error {
	rows, err := s.db.Query("SELECT ticket_id, key, value FROM ticket_fields WHERE ticket_id IN ("+in+")", args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var ticketID, key, value string
		if err := rows.Scan(&ticketID, &key, &value); err != nil {
			return err
		}
		t := index[ticketID]
		if t.Fields == nil {
			t.Fields = map[string]string{}
		}
		t.Fields[key] = value
	}
	return rows.Err()
}

func (s *Store) populateDependencies(index map[string]*models.Ticket, in string, args []any) error {
	rows, err := s.db.Query(
		`SELECT d.ticket_id, b.id, COALESCE(bp.prefix, ''), b.number, b.status
		FROM ticket_dependencies d
		JOIN tickets b ON b.id = d.blocked_by_id
		LEFT JOIN projects bp ON bp.id = b.project_id
		WHERE d.ticket_id IN (`+in+`) ORDER BY bp.prefix, b.number`, args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var ticketID, blockerID, prefix, status string
		var number int
		if err := rows.Scan(&ticketID, &blockerID, &prefix, &number, &status); err != nil {
			return err
		}
		key := models.Ticket{ProjectPrefix: prefix, Number: number}.DisplayKey()
		t := index[ticketID]
		t.BlockedBy = append(t.BlockedBy, blockerID)
		t.BlockedByKeys = append(t.BlockedByKeys, key)
		if !models.IsClosedTicketStatus(status) {
			t.OpenBlockers++
			t.OpenBlockerKeys = append(t.OpenBlockerKeys, key)
		}
	}
	return rows.Err()
}

// matchesSearch проверяет подстроку без учёта регистра (в том числе кириллицы) в ключе, заголовке и описании.
func matchesSearch(t models.Ticket, query string) bool {
	return strings.Contains(strings.ToLower(t.DisplayKey()), query) ||
		strings.Contains(strings.ToLower(t.Title), query) ||
		strings.Contains(strings.ToLower(t.Description), query)
}

// matchesField проверяет фильтр "имя=значение" или "имя" по уже заполненным полям тикета.
func matchesField(t models.Ticket, filter string) bool {
	name, value, hasValue := strings.Cut(filter, "=")
	have, ok := t.Fields[normalizeFieldName(name)]
	if !ok {
		return false
	}
	return !hasValue || strings.EqualFold(have, strings.TrimSpace(value))
}

func normalizeFieldName(name string) string {
	return strings.ToLower(strings.TrimSpace(name))
}

// SetTicketFields задаёт пользовательские поля тикета; пустое значение удаляет поле. Имена приводятся к нижнему регистру.
func (s *Store) SetTicketFields(ticketID string, fields map[string]string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	for name, value := range fields {
		key := normalizeFieldName(name)
		if key == "" {
			tx.Rollback()
			return fmt.Errorf("%w: empty field name", ErrInvalidField)
		}
		value = strings.TrimSpace(value)
		if value == "" {
			_, err = tx.Exec("DELETE FROM ticket_fields WHERE ticket_id = ? AND key = ?", ticketID, key)
		} else {
			_, err = tx.Exec(
				"INSERT INTO ticket_fields (ticket_id, key, value) VALUES (?, ?, ?) ON CONFLICT(ticket_id, key) DO UPDATE SET value = excluded.value",
				ticketID, key, value)
		}
		if err != nil {
			tx.Rollback()
			return err
		}
	}
	if _, err := tx.Exec("UPDATE tickets SET updated_at = ? WHERE id = ?", time.Now(), ticketID); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}

// AddDependency делает blockerID блокирующим для ticketID; самоблокировка и циклы любой длины отклоняются.
func (s *Store) AddDependency(ticketID, blockerID string) error {
	if ticketID == blockerID {
		return fmt.Errorf("%w: a ticket cannot block itself", ErrInvalidDependency)
	}
	var cycle int
	err := s.db.QueryRow(
		`WITH RECURSIVE up(id) AS (
			SELECT blocked_by_id FROM ticket_dependencies WHERE ticket_id = ?
			UNION
			SELECT d.blocked_by_id FROM ticket_dependencies d JOIN up ON d.ticket_id = up.id
		) SELECT COUNT(*) FROM up WHERE id = ?`, blockerID, ticketID).Scan(&cycle)
	if err != nil {
		return err
	}
	if cycle > 0 {
		return fmt.Errorf("%w: the blocker is already blocked by this ticket (cycle)", ErrInvalidDependency)
	}
	_, err = s.db.Exec("INSERT OR IGNORE INTO ticket_dependencies (ticket_id, blocked_by_id) VALUES (?, ?)", ticketID, blockerID)
	return err
}

func (s *Store) RemoveDependency(ticketID, blockerID string) error {
	_, err := s.db.Exec("DELETE FROM ticket_dependencies WHERE ticket_id = ? AND blocked_by_id = ?", ticketID, blockerID)
	return err
}

// AppendToTicket дописывает text к описанию одним SQL-запросом, без чтения и записи в приложении.
func (s *Store) AppendToTicket(ticketID, text string) error {
	res, err := s.db.Exec(
		`UPDATE tickets SET
			description = CASE WHEN COALESCE(description, '') = '' THEN ? ELSE description || ? END,
			updated_at = ? WHERE id = ?`,
		text, "\n\n"+text, time.Now(), ticketID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return fmt.Errorf("%w: %s", ErrTicketNotFound, ticketID)
	}
	return nil
}

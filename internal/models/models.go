package models

import (
	"slices"
	"time"
)

// TicketStatuses — статусы тикетов в порядке колонок на доске.
var TicketStatuses = []string{"triage", "backlog", "todo", "in_progress", "ready_for_review", "done", "cancelled"}

// ClosedTicketStatuses — статусы закрытого тикета: он не блокирует зависимые тикеты.
var ClosedTicketStatuses = []string{"done", "cancelled"}

// IsValidTicketStatus сообщает, является ли s допустимым статусом тикета.
func IsValidTicketStatus(s string) bool {
	return slices.Contains(TicketStatuses, s)
}

// IsClosedTicketStatus сообщает, закрыт ли тикет с таким статусом (done или cancelled).
func IsClosedTicketStatus(s string) bool {
	return slices.Contains(ClosedTicketStatuses, s)
}

// LinkTypes — допустимые типы связей между тикетами.
// relates_to is symmetric; duplicates is directed: A duplicates B.
var LinkTypes = []string{"relates_to", "duplicates"}

// IsValidLinkType сообщает, является ли t допустимым типом связи между тикетами.
func IsValidLinkType(t string) bool {
	return slices.Contains(LinkTypes, t)
}

type Project struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Prefix      string    `json:"prefix"`
	Description string    `json:"description,omitempty"`
	Icon        string    `json:"icon,omitempty"`
	Color       string    `json:"color,omitempty"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Team struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Color     string    `json:"color,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

type Ticket struct {
	ID          string     `json:"id"`
	ProjectID   string     `json:"projectId"`
	TeamID      *string    `json:"teamId,omitempty"`
	Number      int        `json:"number"`
	Title       string     `json:"title"`
	Description string     `json:"description,omitempty"`
	Status      string     `json:"status"`
	Priority    string     `json:"priority"`
	DueDate     *time.Time `json:"dueDate,omitempty"`
	Position    float64    `json:"position"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`

	// Populated fields (not stored directly)
	ProjectPrefix string     `json:"projectPrefix,omitempty"`
	Labels        []Label    `json:"labels,omitempty"`
	Subtasks      []Subtask  `json:"subtasks,omitempty"`
	Questions     []Question `json:"questions,omitempty"`
	BlockedBy     []string   `json:"blockedBy,omitempty"`

	Fields          map[string]string `json:"fields,omitempty"`
	BlockedByKeys   []string          `json:"blockedByKeys,omitempty"`
	OpenBlockers    int               `json:"openBlockers,omitempty"`
	OpenBlockerKeys []string          `json:"openBlockerKeys,omitempty"`
	SubtasksDone    int               `json:"subtasksDone,omitempty"`
	SubtasksTotal   int               `json:"subtasksTotal,omitempty"`
	QuestionsOpen   int               `json:"questionsOpen,omitempty"`
	QuestionsTotal  int               `json:"questionsTotal,omitempty"`
	Links           []LinkRef         `json:"links,omitempty"`
}

// LinkRef is a link seen from one ticket: the other ticket's key and the link type.
// Direction is set only for duplicates: "out" = this ticket duplicates Key, "in" = Key duplicates this ticket.
type LinkRef struct {
	Type      string `json:"type"`
	Direction string `json:"direction,omitempty"`
	Key       string `json:"key"`
}

// DisplayKey returns the human-readable ticket key like "AUTH-1"
func (t Ticket) DisplayKey() string {
	if t.ProjectPrefix != "" {
		return t.ProjectPrefix + "-" + itoa(t.Number)
	}
	return itoa(t.Number)
}

func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	s := ""
	neg := false
	if i < 0 {
		neg = true
		i = -i
	}
	for i > 0 {
		s = string(rune('0'+i%10)) + s
		i /= 10
	}
	if neg {
		s = "-" + s
	}
	return s
}

type Label struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

type Subtask struct {
	ID        string `json:"id"`
	TicketID  string `json:"ticketId"`
	Title     string `json:"title"`
	Completed bool   `json:"completed"`
	Position  int    `json:"position"`
}

// Question is a question on a ticket; an empty Answer means it is still unanswered.
type Question struct {
	ID         string     `json:"id"`
	TicketID   string     `json:"ticketId"`
	Position   int        `json:"position"`
	Text       string     `json:"text"`
	Answer     string     `json:"answer"`
	CreatedAt  time.Time  `json:"createdAt"`
	AnsweredAt *time.Time `json:"answeredAt,omitempty"`
}

type TicketDependency struct {
	TicketID    string `json:"ticketId"`
	BlockedByID string `json:"blockedById"`
}

// Board represents the kanban board view
type Board struct {
	ProjectID string   `json:"projectId,omitempty"`
	Columns   []Column `json:"columns"`
}

type Column struct {
	Status  string   `json:"status"`
	Tickets []Ticket `json:"tickets"`
}

type CreateProjectRequest struct {
	Name        string `json:"name"`
	Prefix      string `json:"prefix"`
	Description string `json:"description,omitempty"`
	Icon        string `json:"icon,omitempty"`
	Color       string `json:"color,omitempty"`
}

type UpdateProjectRequest struct {
	Name        *string `json:"name,omitempty"`
	Prefix      *string `json:"prefix,omitempty"`
	Description *string `json:"description,omitempty"`
	Icon        *string `json:"icon,omitempty"`
	Color       *string `json:"color,omitempty"`
	Status      *string `json:"status,omitempty"`
}

type CreateTeamRequest struct {
	Name  string `json:"name"`
	Color string `json:"color,omitempty"`
}

type UpdateTeamRequest struct {
	Name  *string `json:"name,omitempty"`
	Color *string `json:"color,omitempty"`
}

type CreateTicketRequest struct {
	ProjectID   string   `json:"projectId"`
	TeamID      *string  `json:"teamId,omitempty"`
	Title       string   `json:"title"`
	Description string   `json:"description,omitempty"`
	Status      string   `json:"status,omitempty"`
	Priority    string   `json:"priority,omitempty"`
	DueDate     *string  `json:"dueDate,omitempty"`
	Labels      []string `json:"labels,omitempty"`
	BlockedBy   []string `json:"blockedBy,omitempty"`
}

type UpdateTicketRequest struct {
	TeamID      *string  `json:"teamId,omitempty"`
	Title       *string  `json:"title,omitempty"`
	Description *string  `json:"description,omitempty"`
	Status      *string  `json:"status,omitempty"`
	Priority    *string  `json:"priority,omitempty"`
	DueDate     *string  `json:"dueDate,omitempty"`
	Position    *float64 `json:"position,omitempty"`
	Labels      []string `json:"labels,omitempty"`
	BlockedBy   []string `json:"blockedBy,omitempty"`
}

type MoveTicketRequest struct {
	Status   string   `json:"status"`
	Position *float64 `json:"position,omitempty"`
}

type CreateSubtaskRequest struct {
	Title string `json:"title"`
}

type CreateQuestionRequest struct {
	Text string `json:"text"`
}

type AnswerQuestionRequest struct {
	Answer string `json:"answer"`
}

type CreateLabelRequest struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

type UpdateLabelRequest struct {
	Name  *string `json:"name,omitempty"`
	Color *string `json:"color,omitempty"`
}

type TicketFilter struct {
	ProjectID string
	TeamID    string
	Status    string
	Priority  string
	Label     string // ID или имя тега
	Search    string // подстрока в ключе, заголовке или описании, без учёта регистра
	Field     string // "имя=значение" или "имя" (поле задано)
	Unblocked bool   // только тикеты, у которых все блокирующие тикеты закрыты (done или cancelled)
	Compact   bool   // без описания, подзадачи только счётчиками
}

type AddDependencyRequest struct {
	BlockedBy string `json:"blockedBy"` // ID или ключ блокирующего тикета
}

type AddLinkRequest struct {
	Target string `json:"target"` // ID или ключ второго тикета
	Type   string `json:"type"`   // relates_to или duplicates
}

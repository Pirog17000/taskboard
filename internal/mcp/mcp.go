package mcp

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"

	"github.com/tcarac/taskboard/internal/db"
	"github.com/tcarac/taskboard/internal/models"
)

type MCPServer struct {
	store *db.Store
}

func NewServer(store *db.Store) *MCPServer {
	return &MCPServer{store: store}
}

type jsonrpcRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      any             `json:"id,omitempty"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

type jsonrpcResponse struct {
	JSONRPC string    `json:"jsonrpc"`
	ID      any       `json:"id,omitempty"`
	Result  any       `json:"result,omitempty"`
	Error   *rpcError `json:"error,omitempty"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type toolDef struct {
	Name        string     `json:"name"`
	Description string     `json:"description"`
	InputSchema jsonSchema `json:"inputSchema"`
}

type jsonSchema struct {
	Type       string                `json:"type"`
	Properties map[string]schemaProp `json:"properties,omitempty"`
	Required   []string              `json:"required,omitempty"`
}

type schemaProp struct {
	Type        string      `json:"type"`
	Description string      `json:"description"`
	Enum        []string    `json:"enum,omitempty"`
	Items       *jsonSchema `json:"items,omitempty"`

	AdditionalProperties *schemaProp `json:"additionalProperties,omitempty"`
}

// ticketProps добавляет к схеме инструмента поля id и key, по которым определяется тикет.
func ticketProps(extra map[string]schemaProp) map[string]schemaProp {
	props := map[string]schemaProp{
		"id":  {Type: "string", Description: "Ticket ID (a key such as UE-71 is accepted too)"},
		"key": {Type: "string", Description: "Ticket key: project prefix + number, e.g. UE-71 (case-insensitive); alternative to id"},
	}
	for k, v := range extra {
		props[k] = v
	}
	return props
}

type textContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

func (s *MCPServer) Run() error {
	reader := bufio.NewReader(os.Stdin)
	writer := os.Stdout

	for {
		line, err := reader.ReadBytes('\n')
		if err != nil {
			if err == io.EOF {
				return nil
			}
			return fmt.Errorf("reading stdin: %w", err)
		}

		var req jsonrpcRequest
		if err := json.Unmarshal(line, &req); err != nil {
			continue
		}

		resp := s.handleRequest(req)
		if resp == nil {
			continue
		}

		data, err := json.Marshal(resp)
		if err != nil {
			continue
		}
		data = append(data, '\n')
		writer.Write(data)
	}
}

func (s *MCPServer) handleRequest(req jsonrpcRequest) *jsonrpcResponse {
	switch req.Method {
	case "initialize":
		return &jsonrpcResponse{
			JSONRPC: "2.0",
			ID:      req.ID,
			Result: map[string]any{
				"protocolVersion": "2024-11-05",
				"capabilities": map[string]any{
					"tools": map[string]any{},
				},
				"serverInfo": map[string]any{
					"name":    "taskboard",
					"version": "0.6.0",
				},
			},
		}

	case "notifications/initialized":
		return nil

	case "tools/list":
		return &jsonrpcResponse{
			JSONRPC: "2.0",
			ID:      req.ID,
			Result: map[string]any{
				"tools": s.toolDefinitions(),
			},
		}

	case "tools/call":
		return s.handleToolCall(req)

	default:
		return &jsonrpcResponse{
			JSONRPC: "2.0",
			ID:      req.ID,
			Error:   &rpcError{Code: -32601, Message: "method not found: " + req.Method},
		}
	}
}

func (s *MCPServer) handleToolCall(req jsonrpcRequest) *jsonrpcResponse {
	var params struct {
		Name      string          `json:"name"`
		Arguments json.RawMessage `json:"arguments"`
	}
	if err := json.Unmarshal(req.Params, &params); err != nil {
		return &jsonrpcResponse{JSONRPC: "2.0", ID: req.ID, Error: &rpcError{Code: -32602, Message: "invalid params"}}
	}

	result, err := s.callTool(params.Name, params.Arguments)
	if err != nil {
		return &jsonrpcResponse{
			JSONRPC: "2.0",
			ID:      req.ID,
			Result: map[string]any{
				"content": []textContent{{Type: "text", Text: fmt.Sprintf("Error: %s", err.Error())}},
				"isError": true,
			},
		}
	}

	data, _ := json.Marshal(result)
	return &jsonrpcResponse{
		JSONRPC: "2.0",
		ID:      req.ID,
		Result: map[string]any{
			"content": []textContent{{Type: "text", Text: string(data)}},
		},
	}
}

// ticketRef — ссылка на тикет: ID или ключ вида "UE-71" в любом из полей id, key, ticketId.
type ticketRef struct {
	ID       string `json:"id"`
	Key      string `json:"key"`
	TicketID string `json:"ticketId"`
}

func (s *MCPServer) resolve(r ticketRef) (string, error) {
	for _, v := range []string{r.ID, r.Key, r.TicketID} {
		if v != "" {
			return s.store.ResolveTicketID(v)
		}
	}
	return "", fmt.Errorf("ticket id or key is required")
}

// ticketAck — короткий ответ инструментов записи: ключ, заголовок, статус, имена тегов, поля, блокеры и счётчики подзадач.
type ticketAck struct {
	Key             string            `json:"key"`
	Title           string            `json:"title"`
	Status          string            `json:"status"`
	Labels          []string          `json:"labels,omitempty"`
	Fields          map[string]string `json:"fields,omitempty"`
	BlockedByKeys   []string          `json:"blockedByKeys,omitempty"`
	OpenBlockerKeys []string          `json:"openBlockerKeys,omitempty"`
	SubtasksDone    int               `json:"subtasksDone,omitempty"`
	SubtasksTotal   int               `json:"subtasksTotal,omitempty"`
}

const ackNote = "Returns a short acknowledgement: key, title, status, tag names, fields, blockedByKeys, openBlockerKeys and subtask counts (use get_ticket for the description)."

func (s *MCPServer) ack(id string) (any, error) {
	t, err := s.store.GetTicketCompact(id)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, fmt.Errorf("ticket not found")
	}
	a := ticketAck{
		Key:             t.DisplayKey(),
		Title:           t.Title,
		Status:          t.Status,
		Fields:          t.Fields,
		BlockedByKeys:   t.BlockedByKeys,
		OpenBlockerKeys: t.OpenBlockerKeys,
		SubtasksDone:    t.SubtasksDone,
		SubtasksTotal:   t.SubtasksTotal,
	}
	for _, l := range t.Labels {
		a.Labels = append(a.Labels, l.Name)
	}
	return a, nil
}

func (s *MCPServer) callTool(name string, args json.RawMessage) (any, error) {
	switch name {
	case "list_projects":
		var a struct {
			Status string `json:"status"`
		}
		json.Unmarshal(args, &a)
		return s.store.ListProjects(a.Status)

	case "get_project":
		var a struct {
			ID string `json:"id"`
		}
		json.Unmarshal(args, &a)
		p, err := s.store.GetProject(a.ID)
		if p == nil && err == nil {
			return nil, fmt.Errorf("project not found")
		}
		return p, err

	case "create_project":
		var a models.CreateProjectRequest
		json.Unmarshal(args, &a)
		return s.store.CreateProject(a)

	case "update_project":
		var a struct {
			ID string `json:"id"`
			models.UpdateProjectRequest
		}
		json.Unmarshal(args, &a)
		return s.store.UpdateProject(a.ID, a.UpdateProjectRequest)

	case "delete_project":
		var a struct {
			ID string `json:"id"`
		}
		json.Unmarshal(args, &a)
		return map[string]bool{"deleted": true}, s.store.DeleteProject(a.ID)

	case "list_teams":
		return s.store.ListTeams()

	case "get_team":
		var a struct {
			ID string `json:"id"`
		}
		json.Unmarshal(args, &a)
		t, err := s.store.GetTeam(a.ID)
		if t == nil && err == nil {
			return nil, fmt.Errorf("team not found")
		}
		return t, err

	case "create_team":
		var a models.CreateTeamRequest
		json.Unmarshal(args, &a)
		return s.store.CreateTeam(a)

	case "update_team":
		var a struct {
			ID string `json:"id"`
			models.UpdateTeamRequest
		}
		json.Unmarshal(args, &a)
		return s.store.UpdateTeam(a.ID, a.UpdateTeamRequest)

	case "delete_team":
		var a struct {
			ID string `json:"id"`
		}
		json.Unmarshal(args, &a)
		return map[string]bool{"deleted": true}, s.store.DeleteTeam(a.ID)

	case "list_tickets":
		var a models.TicketFilter
		json.Unmarshal(args, &a)
		return s.store.ListTickets(a)

	case "get_ticket":
		var a struct {
			ticketRef
			Compact bool `json:"compact"`
		}
		json.Unmarshal(args, &a)
		id, err := s.resolve(a.ticketRef)
		if err != nil {
			return nil, err
		}
		if a.Compact {
			return s.store.GetTicketCompact(id)
		}
		return s.store.GetTicket(id)

	case "get_tickets":
		var a struct {
			Keys    []string `json:"keys"`
			Compact bool     `json:"compact"`
		}
		json.Unmarshal(args, &a)
		if len(a.Keys) == 0 {
			return nil, fmt.Errorf("keys is required")
		}
		ids, err := s.store.ResolveTicketIDs(a.Keys)
		if err != nil {
			return nil, err
		}
		return s.store.GetTicketsByIDs(ids, a.Compact)

	case "create_ticket":
		var a models.CreateTicketRequest
		json.Unmarshal(args, &a)
		blockers, err := s.store.ResolveTicketIDs(a.BlockedBy)
		if err != nil {
			return nil, err
		}
		a.BlockedBy = blockers
		t, err := s.store.CreateTicket(a)
		if err != nil {
			return nil, err
		}
		return s.ack(t.ID)

	case "update_ticket":
		var a struct {
			ticketRef
			models.UpdateTicketRequest
		}
		json.Unmarshal(args, &a)
		id, err := s.resolve(a.ticketRef)
		if err != nil {
			return nil, err
		}
		if a.BlockedBy != nil {
			if a.BlockedBy, err = s.store.ResolveTicketIDs(a.BlockedBy); err != nil {
				return nil, err
			}
		}
		if _, err := s.store.UpdateTicket(id, a.UpdateTicketRequest); err != nil {
			return nil, err
		}
		return s.ack(id)

	case "move_ticket":
		var a struct {
			ticketRef
			models.MoveTicketRequest
		}
		json.Unmarshal(args, &a)
		id, err := s.resolve(a.ticketRef)
		if err != nil {
			return nil, err
		}
		if _, err := s.store.MoveTicket(id, a.MoveTicketRequest); err != nil {
			return nil, err
		}
		return s.ack(id)

	case "delete_ticket":
		var a ticketRef
		json.Unmarshal(args, &a)
		id, err := s.resolve(a)
		if err != nil {
			return nil, err
		}
		return map[string]bool{"deleted": true}, s.store.DeleteTicket(id)

	case "append_to_ticket":
		var a struct {
			ticketRef
			Text string `json:"text"`
		}
		json.Unmarshal(args, &a)
		if a.Text == "" {
			return nil, fmt.Errorf("text is required")
		}
		id, err := s.resolve(a.ticketRef)
		if err != nil {
			return nil, err
		}
		if err := s.store.AppendToTicket(id, a.Text); err != nil {
			return nil, err
		}
		return s.ack(id)

	case "set_ticket_fields":
		var a struct {
			ticketRef
			Fields map[string]string `json:"fields"`
		}
		json.Unmarshal(args, &a)
		if len(a.Fields) == 0 {
			return nil, fmt.Errorf("fields is required")
		}
		id, err := s.resolve(a.ticketRef)
		if err != nil {
			return nil, err
		}
		if err := s.store.SetTicketFields(id, a.Fields); err != nil {
			return nil, err
		}
		return s.ack(id)

	case "add_dependency", "remove_dependency":
		var a struct {
			ticketRef
			BlockedBy string `json:"blockedBy"`
		}
		json.Unmarshal(args, &a)
		id, err := s.resolve(a.ticketRef)
		if err != nil {
			return nil, err
		}
		blockerID, err := s.store.ResolveTicketID(a.BlockedBy)
		if err != nil {
			return nil, err
		}
		if name == "add_dependency" {
			err = s.store.AddDependency(id, blockerID)
		} else {
			err = s.store.RemoveDependency(id, blockerID)
		}
		if err != nil {
			return nil, err
		}
		return s.ack(id)

	case "get_board":
		var a models.TicketFilter
		json.Unmarshal(args, &a)
		return s.store.GetBoard(a)

	case "list_labels":
		return s.store.ListLabels()

	case "create_label":
		var a models.CreateLabelRequest
		json.Unmarshal(args, &a)
		return s.store.CreateLabel(a)

	case "add_label":
		var a struct {
			ticketRef
			Label string `json:"label"`
		}
		json.Unmarshal(args, &a)
		id, err := s.resolve(a.ticketRef)
		if err != nil {
			return nil, err
		}
		if _, err := s.store.AddLabelToTicket(id, a.Label); err != nil {
			return nil, err
		}
		return s.ack(id)

	case "remove_label":
		var a struct {
			ticketRef
			Label string `json:"label"`
		}
		json.Unmarshal(args, &a)
		id, err := s.resolve(a.ticketRef)
		if err != nil {
			return nil, err
		}
		if _, err := s.store.RemoveLabelFromTicket(id, a.Label); err != nil {
			return nil, err
		}
		return s.ack(id)

	case "create_subtask":
		var a struct {
			ticketRef
			Title string `json:"title"`
		}
		json.Unmarshal(args, &a)
		if a.Title == "" {
			return nil, fmt.Errorf("ticketId (or key) and title are required")
		}
		id, err := s.resolve(a.ticketRef)
		if err != nil {
			return nil, err
		}
		return s.store.AddSubtask(id, models.CreateSubtaskRequest{Title: a.Title})

	case "batch_create_subtasks":
		var a struct {
			ticketRef
			Subtasks []struct {
				Title string `json:"title"`
			} `json:"subtasks"`
		}
		json.Unmarshal(args, &a)
		if len(a.Subtasks) == 0 {
			return nil, fmt.Errorf("ticketId (or key) and at least one subtask are required")
		}
		ticketID, err := s.resolve(a.ticketRef)
		if err != nil {
			return nil, err
		}
		type createdSubtask struct {
			ID    string `json:"id"`
			Title string `json:"title"`
		}
		var created []createdSubtask
		for _, sub := range a.Subtasks {
			st, err := s.store.AddSubtask(ticketID, models.CreateSubtaskRequest{Title: sub.Title})
			if err != nil {
				return nil, fmt.Errorf("creating subtask %q: %w", sub.Title, err)
			}
			created = append(created, createdSubtask{ID: st.ID, Title: st.Title})
		}
		return created, nil

	case "delete_subtask":
		var a struct {
			ID string `json:"id"`
		}
		json.Unmarshal(args, &a)
		return map[string]bool{"deleted": true}, s.store.DeleteSubtask(a.ID)

	case "toggle_subtask":
		var a struct {
			ID string `json:"id"`
		}
		json.Unmarshal(args, &a)
		return s.store.ToggleSubtask(a.ID)

	default:
		return nil, fmt.Errorf("unknown tool: %s", name)
	}
}

func (s *MCPServer) toolDefinitions() []toolDef {
	return []toolDef{
		// --- Projects (top-level grouping) ---
		{
			Name:        "list_projects",
			Description: "List all projects with optional status filter. Projects are the top-level grouping — use them like epics or initiatives to organize related work.",
			InputSchema: jsonSchema{
				Type: "object",
				Properties: map[string]schemaProp{
					"status": {Type: "string", Description: "Filter by status", Enum: []string{"active", "archived"}},
				},
			},
		},
		{
			Name:        "get_project",
			Description: "Get detailed project information by ID",
			InputSchema: jsonSchema{
				Type:       "object",
				Properties: map[string]schemaProp{"id": {Type: "string", Description: "Project ID"}},
				Required:   []string{"id"},
			},
		},
		{
			Name: "create_project",
			Description: "Create a new project. Projects are the top-level organizational unit (like epics/initiatives). " +
				"Create a new project for each distinct body of work instead of creating umbrella tickets. " +
				"Hierarchy: Project → Ticket → Subtask. Never create 'epic' or 'umbrella' tickets — use a project for that. " +
				"Use the description field to capture the project's goals, scope, and any high-level context.",
			InputSchema: jsonSchema{
				Type: "object",
				Properties: map[string]schemaProp{
					"name":        {Type: "string", Description: "Project name"},
					"prefix":      {Type: "string", Description: "Short prefix for ticket keys (e.g. AUTH)"},
					"description": {Type: "string", Description: "Project description — goals, scope, context, and any high-level details about this body of work"},
					"icon":        {Type: "string", Description: "Emoji icon"},
					"color":       {Type: "string", Description: "Hex color code"},
				},
				Required: []string{"name", "prefix"},
			},
		},
		{
			Name:        "update_project",
			Description: "Update project properties",
			InputSchema: jsonSchema{
				Type: "object",
				Properties: map[string]schemaProp{
					"id":          {Type: "string", Description: "Project ID"},
					"name":        {Type: "string", Description: "Project name"},
					"prefix":      {Type: "string", Description: "Short prefix"},
					"description": {Type: "string", Description: "Project description — goals, scope, context"},
					"icon":        {Type: "string", Description: "Emoji icon"},
					"color":       {Type: "string", Description: "Hex color"},
					"status":      {Type: "string", Description: "Status", Enum: []string{"active", "archived"}},
				},
				Required: []string{"id"},
			},
		},
		{
			Name:        "delete_project",
			Description: "Delete a project and all its tickets",
			InputSchema: jsonSchema{
				Type:       "object",
				Properties: map[string]schemaProp{"id": {Type: "string", Description: "Project ID"}},
				Required:   []string{"id"},
			},
		},
		// --- Teams ---
		{
			Name:        "list_teams",
			Description: "List all teams",
			InputSchema: jsonSchema{Type: "object"},
		},
		{
			Name:        "get_team",
			Description: "Get detailed team information by ID",
			InputSchema: jsonSchema{
				Type:       "object",
				Properties: map[string]schemaProp{"id": {Type: "string", Description: "Team ID"}},
				Required:   []string{"id"},
			},
		},
		{
			Name:        "create_team",
			Description: "Create a new team",
			InputSchema: jsonSchema{
				Type: "object",
				Properties: map[string]schemaProp{
					"name":  {Type: "string", Description: "Team name"},
					"color": {Type: "string", Description: "Hex color"},
				},
				Required: []string{"name"},
			},
		},
		{
			Name:        "update_team",
			Description: "Update team properties",
			InputSchema: jsonSchema{
				Type: "object",
				Properties: map[string]schemaProp{
					"id":    {Type: "string", Description: "Team ID"},
					"name":  {Type: "string", Description: "Team name"},
					"color": {Type: "string", Description: "Hex color"},
				},
				Required: []string{"id"},
			},
		},
		{
			Name:        "delete_team",
			Description: "Delete a team",
			InputSchema: jsonSchema{
				Type:       "object",
				Properties: map[string]schemaProp{"id": {Type: "string", Description: "Team ID"}},
				Required:   []string{"id"},
			},
		},
		// --- Labels (tags for grouping tickets into sections, e.g. "wave 1") ---
		{
			Name:        "list_labels",
			Description: "List all tags (labels). Tags group tickets into sections such as waves or plan stages.",
			InputSchema: jsonSchema{Type: "object"},
		},
		{
			Name:        "create_label",
			Description: "Create a tag. If a tag with this name already exists, the existing tag is returned.",
			InputSchema: jsonSchema{
				Type: "object",
				Properties: map[string]schemaProp{
					"name":  {Type: "string", Description: "Tag name, e.g. \"первая волна работ\""},
					"color": {Type: "string", Description: "Hex color, e.g. #3B82F6 (optional)"},
				},
				Required: []string{"name"},
			},
		},
		{
			Name:        "add_label",
			Description: "Attach a tag to a ticket without removing its other tags. The tag is looked up by ID or name (case-insensitive) and created if it does not exist. " + ackNote,
			InputSchema: jsonSchema{
				Type: "object",
				Properties: ticketProps(map[string]schemaProp{
					"ticketId": {Type: "string", Description: "Ticket ID or key (alternative to id / key)"},
					"label":    {Type: "string", Description: "Tag name or tag ID"},
				}),
				Required: []string{"label"},
			},
		},
		{
			Name:        "remove_label",
			Description: "Detach a tag from a ticket. The tag itself is kept. " + ackNote,
			InputSchema: jsonSchema{
				Type: "object",
				Properties: ticketProps(map[string]schemaProp{
					"ticketId": {Type: "string", Description: "Ticket ID or key (alternative to id / key)"},
					"label":    {Type: "string", Description: "Tag name or tag ID"},
				}),
				Required: []string{"label"},
			},
		},
		// --- Tickets (tasks within a project) ---
		{
			Name: "list_tickets",
			Description: "List tickets with optional filters by project, team, status, priority, tag, text search, custom field and readiness. " +
				"Each ticket shows blockedBy (IDs), blockedByKeys (e.g. \"UE-80\"), openBlockers (count of blockers not yet done) and openBlockerKeys. " +
				"Use compact=true to save tokens: no description, subtasks only as subtasksDone/subtasksTotal.",
			InputSchema: jsonSchema{
				Type: "object",
				Properties: map[string]schemaProp{
					"projectId": {Type: "string", Description: "Filter by project ID or project prefix (e.g. UE)"},
					"teamId":    {Type: "string", Description: "Filter by team ID"},
					"status":    {Type: "string", Description: "Filter by status", Enum: models.TicketStatuses},
					"priority":  {Type: "string", Description: "Filter by priority", Enum: []string{"urgent", "high", "medium", "low"}},
					"label":     {Type: "string", Description: "Filter by tag name or ID"},
					"search":    {Type: "string", Description: "Case-insensitive substring over key, title and description"},
					"field":     {Type: "string", Description: "Custom field filter: \"name=value\" (value compared case-insensitively) or \"name\" (field is present)"},
					"unblocked": {Type: "boolean", Description: "If true, only tickets whose blockers are all done (or that have none)"},
					"compact":   {Type: "boolean", Description: "If true, omit description and return subtasks only as counts (default false)"},
				},
			},
		},
		{
			Name:        "get_ticket",
			Description: "Get detailed ticket information including subtasks, labels, custom fields and dependencies. Accepts the ticket ID or its key (e.g. UE-71).",
			InputSchema: jsonSchema{
				Type: "object",
				Properties: ticketProps(map[string]schemaProp{
					"compact": {Type: "boolean", Description: "If true, omit description and return subtasks only as counts (default false)"},
				}),
			},
		},
		{
			Name:        "get_tickets",
			Description: "Get several tickets at once by key (e.g. UE-71) or ID, returned in the given order. Fails if any of them does not exist.",
			InputSchema: jsonSchema{
				Type: "object",
				Properties: map[string]schemaProp{
					"keys":    {Type: "array", Description: "Ticket keys such as UE-71 (case-insensitive) or ticket IDs", Items: &jsonSchema{Type: "string"}},
					"compact": {Type: "boolean", Description: "If true, omit description and return subtasks only as counts (default false)"},
				},
				Required: []string{"keys"},
			},
		},
		{
			Name: "create_ticket",
			Description: "Create a ticket (task) within a project. Tickets are concrete, actionable units of work. " +
				"Do NOT create 'epic' or 'umbrella' tickets — use create_project for that level of grouping. " +
				"Use create_subtask or batch_create_subtasks to break tickets into steps. " +
				"Hierarchy: Project → Ticket → Subtask. " + ackNote,
			InputSchema: jsonSchema{
				Type: "object",
				Properties: map[string]schemaProp{
					"projectId":   {Type: "string", Description: "Project ID or project prefix (e.g. UE)"},
					"title":       {Type: "string", Description: "Ticket title"},
					"description": {Type: "string", Description: "Rich text description"},
					"status":      {Type: "string", Description: "Initial status", Enum: models.TicketStatuses},
					"priority":    {Type: "string", Description: "Priority level", Enum: []string{"urgent", "high", "medium", "low"}},
					"teamId":      {Type: "string", Description: "Team ID"},
					"dueDate":     {Type: "string", Description: "Due date (YYYY-MM-DD)"},
					"labels":      {Type: "array", Description: "Tag names (created automatically if new). Replaces existing tags on update.", Items: &jsonSchema{Type: "string"}},
					"blockedBy":   {Type: "array", Description: "Keys (e.g. UE-80) or IDs of tickets that block this one", Items: &jsonSchema{Type: "string"}},
				},
				Required: []string{"projectId", "title"},
			},
		},
		{
			Name:        "update_ticket",
			Description: "Update ticket properties. Accepts the ticket ID or its key (e.g. UE-71). blockedBy, if given, replaces all dependencies (prefer add_dependency / remove_dependency). " + ackNote,
			InputSchema: jsonSchema{
				Type: "object",
				Properties: ticketProps(map[string]schemaProp{
					"title":       {Type: "string", Description: "Ticket title"},
					"description": {Type: "string", Description: "Description (replaces the whole text; use append_to_ticket to add to it)"},
					"status":      {Type: "string", Description: "Status", Enum: models.TicketStatuses},
					"priority":    {Type: "string", Description: "Priority", Enum: []string{"urgent", "high", "medium", "low"}},
					"teamId":      {Type: "string", Description: "Team ID"},
					"dueDate":     {Type: "string", Description: "Due date (YYYY-MM-DD)"},
					"labels":      {Type: "array", Description: "Tag names (created automatically if new). Replaces existing tags on update.", Items: &jsonSchema{Type: "string"}},
					"blockedBy":   {Type: "array", Description: "Keys or IDs of blocking tickets; replaces existing dependencies", Items: &jsonSchema{Type: "string"}},
				}),
			},
		},
		{
			Name:        "move_ticket",
			Description: "Move ticket to a different status column. Accepts the ticket ID or its key (e.g. UE-71). " + ackNote,
			InputSchema: jsonSchema{
				Type: "object",
				Properties: ticketProps(map[string]schemaProp{
					"status": {Type: "string", Description: "Target status", Enum: models.TicketStatuses},
				}),
				Required: []string{"status"},
			},
		},
		{
			Name:        "delete_ticket",
			Description: "Delete a ticket. Accepts the ticket ID or its key (e.g. UE-71).",
			InputSchema: jsonSchema{
				Type:       "object",
				Properties: ticketProps(nil),
			},
		},
		{
			Name: "append_to_ticket",
			Description: "Append text to the ticket description atomically in a single SQL statement (no read-modify-write race): the text is added after a blank line. " +
				"Prefer this over update_ticket when only adding notes. " + ackNote,
			InputSchema: jsonSchema{
				Type: "object",
				Properties: ticketProps(map[string]schemaProp{
					"text": {Type: "string", Description: "Text to append"},
				}),
				Required: []string{"text"},
			},
		},
		{
			Name: "set_ticket_fields",
			Description: "Set custom key/value fields on a ticket (e.g. class, stage). Field names are case-insensitive (stored lowercase). " +
				"An empty value deletes the field. Other fields are left untouched. " + ackNote,
			InputSchema: jsonSchema{
				Type: "object",
				Properties: ticketProps(map[string]schemaProp{
					"fields": {Type: "object", Description: "Map of field name to value, e.g. {\"class\": \"core\", \"stage\": \"3\"}; \"\" deletes the field", AdditionalProperties: &schemaProp{Type: "string"}},
				}),
				Required: []string{"fields"},
			},
		},
		{
			Name: "add_dependency",
			Description: "Make a ticket blocked by another one. Both are given by ID or key (e.g. UE-80). Self-dependencies and dependency cycles are rejected. " +
				ackNote,
			InputSchema: jsonSchema{
				Type: "object",
				Properties: ticketProps(map[string]schemaProp{
					"blockedBy": {Type: "string", Description: "ID or key of the ticket that blocks this one"},
				}),
				Required: []string{"blockedBy"},
			},
		},
		{
			Name:        "remove_dependency",
			Description: "Remove a dependency: the ticket is no longer blocked by the given ticket. Both are given by ID or key. " + ackNote,
			InputSchema: jsonSchema{
				Type: "object",
				Properties: ticketProps(map[string]schemaProp{
					"blockedBy": {Type: "string", Description: "ID or key of the blocking ticket to remove"},
				}),
				Required: []string{"blockedBy"},
			},
		},
		// --- Board ---
		{
			Name: "get_board",
			Description: "Get full Kanban board grouped by status columns (todo, in_progress, ready_for_review, done). " +
				"Use compact=true to save tokens: no description, subtasks only as subtasksDone/subtasksTotal.",
			InputSchema: jsonSchema{
				Type: "object",
				Properties: map[string]schemaProp{
					"projectId": {Type: "string", Description: "Filter by project ID or project prefix, e.g. UE (optional)"},
					"label":     {Type: "string", Description: "Show only tickets with this tag name or ID (optional)"},
					"search":    {Type: "string", Description: "Case-insensitive substring over key, title and description (optional)"},
					"field":     {Type: "string", Description: "Custom field filter: \"name=value\" or \"name\" (optional)"},
					"unblocked": {Type: "boolean", Description: "If true, only tickets whose blockers are all done (default false)"},
					"compact":   {Type: "boolean", Description: "If true, omit description and return subtasks only as counts (default false)"},
				},
			},
		},
		// --- Subtasks (steps within a ticket) ---
		{
			Name: "create_subtask",
			Description: "Create a subtask (checklist item) on a ticket. Subtasks break a ticket into verifiable steps. " +
				"Hierarchy: Project → Ticket → Subtask. Use batch_create_subtasks when adding multiple subtasks at once.",
			InputSchema: jsonSchema{
				Type: "object",
				Properties: ticketProps(map[string]schemaProp{
					"ticketId": {Type: "string", Description: "Parent ticket ID or key (alternative to id / key)"},
					"title":    {Type: "string", Description: "Subtask description"},
				}),
				Required: []string{"title"},
			},
		},
		{
			Name: "batch_create_subtasks",
			Description: "Create multiple subtasks on a ticket at once. More efficient than calling create_subtask repeatedly. " +
				"Use this when breaking a ticket into its implementation steps.",
			InputSchema: jsonSchema{
				Type: "object",
				Properties: ticketProps(map[string]schemaProp{
					"ticketId": {Type: "string", Description: "Parent ticket ID or key (alternative to id / key)"},
					"subtasks": {Type: "array", Description: "Array of subtask objects, each with a 'title' field", Items: &jsonSchema{
						Type: "object",
						Properties: map[string]schemaProp{
							"title": {Type: "string", Description: "Subtask description"},
						},
						Required: []string{"title"},
					}},
				}),
				Required: []string{"subtasks"},
			},
		},
		{
			Name:        "toggle_subtask",
			Description: "Toggle subtask completion status",
			InputSchema: jsonSchema{
				Type:       "object",
				Properties: map[string]schemaProp{"id": {Type: "string", Description: "Subtask ID"}},
				Required:   []string{"id"},
			},
		},
		{
			Name:        "delete_subtask",
			Description: "Delete a subtask from a ticket",
			InputSchema: jsonSchema{
				Type:       "object",
				Properties: map[string]schemaProp{"id": {Type: "string", Description: "Subtask ID"}},
				Required:   []string{"id"},
			},
		},
	}
}

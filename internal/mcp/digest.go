package mcp

import (
	"encoding/json"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/tcarac/taskboard/internal/models"
)

// Compact read tools: one call per question, bounded output.
// tag_overview / tags_overview: counts and one line per ticket.
// ticket_sections: one section (task, questions, fields) for many tickets, paged.

const (
	digestTitleMax     = 100  // title length in the one-line view
	sectionLimitDef    = 20   // tickets per page of ticket_sections
	sectionLimitMax    = 100  // hard cap per page
	sectionCharsDef    = 1500 // text cut per value in ticket_sections
	sectionTaskHeading = "Задача"
)

type digestTicket struct {
	Key    string `json:"key"`
	Status string `json:"status"`
	Title  string `json:"title"`
}

type tagDigest struct {
	Label   string         `json:"label"`
	Total   int            `json:"total"`
	Counts  map[string]int `json:"counts"`
	Tickets []digestTicket `json:"tickets"`
}

// ticketKey returns the human key of a ticket, e.g. UE-846.
func ticketKey(t models.Ticket) string {
	return fmt.Sprintf("%s-%d", t.ProjectPrefix, t.Number)
}

// cutText shortens s to at most n runes and reports whether it was cut.
func cutText(s string, n int) (string, bool) {
	if utf8.RuneCountInString(s) <= n {
		return s, false
	}
	return string([]rune(s)[:n]) + "…", true
}

func isClosedStatus(status string) bool {
	return status == "done" || status == "cancelled"
}

// digestOf builds the counts and the one-line list for one tag.
// Counts cover every ticket; the lines skip done and cancelled unless includeClosed is set.
func (s *MCPServer) digestOf(label string, includeClosed bool) (tagDigest, error) {
	tickets, err := s.store.ListTickets(models.TicketFilter{Label: label, Compact: true})
	if err != nil {
		return tagDigest{}, err
	}
	d := tagDigest{Label: label, Total: len(tickets), Counts: map[string]int{}, Tickets: []digestTicket{}}
	for _, t := range tickets {
		d.Counts[t.Status]++
		if !includeClosed && isClosedStatus(t.Status) {
			continue
		}
		title, _ := cutText(t.Title, digestTitleMax)
		d.Tickets = append(d.Tickets, digestTicket{Key: ticketKey(t), Status: t.Status, Title: title})
	}
	return d, nil
}

func (s *MCPServer) tagOverview(args json.RawMessage) (any, error) {
	var a struct {
		Label         string `json:"label"`
		IncludeClosed bool   `json:"includeClosed"`
	}
	json.Unmarshal(args, &a)
	if a.Label == "" {
		return nil, fmt.Errorf("label is required (a tag name such as W01:Lamps)")
	}
	return s.digestOf(a.Label, a.IncludeClosed)
}

func (s *MCPServer) tagsOverview(args json.RawMessage) (any, error) {
	var a struct {
		Prefix        string `json:"prefix"`
		IncludeClosed bool   `json:"includeClosed"`
	}
	json.Unmarshal(args, &a)
	if a.Prefix == "" {
		return nil, fmt.Errorf("prefix is required (for example W01:); the whole board is not returned")
	}
	labels, err := s.store.ListLabels()
	if err != nil {
		return nil, err
	}
	out := struct {
		Tags []tagDigest `json:"tags"`
	}{Tags: []tagDigest{}}
	for _, l := range labels {
		if !strings.HasPrefix(l.Name, a.Prefix) {
			continue
		}
		d, err := s.digestOf(l.Name, a.IncludeClosed)
		if err != nil {
			return nil, err
		}
		out.Tags = append(out.Tags, d)
	}
	return out, nil
}

// taskSection returns the text under the top-level "# Задача" heading of a description.
// A section ends at the next top-level heading ("# "); "## " subheadings stay inside it.
func taskSection(description string) string {
	var lines []string
	in := false
	for _, ln := range strings.Split(description, "\n") {
		trimmed := strings.TrimRight(ln, " \r\t")
		if strings.HasPrefix(trimmed, "# ") || trimmed == "#" {
			if in {
				break
			}
			in = strings.TrimSpace(strings.TrimPrefix(trimmed, "#")) == sectionTaskHeading
			continue
		}
		if in {
			lines = append(lines, ln)
		}
	}
	return strings.TrimSpace(strings.Join(lines, "\n"))
}

type sectionQA struct {
	Question string `json:"q"`
	Answer   string `json:"a"`
}

type sectionItem struct {
	Key       string            `json:"key"`
	Status    string            `json:"status"`
	Title     string            `json:"title"`
	Text      string            `json:"text,omitempty"`
	Questions []sectionQA       `json:"questions,omitempty"`
	Fields    map[string]string `json:"fields,omitempty"`
	Truncated bool              `json:"truncated,omitempty"`
}

type sectionPage struct {
	Section string        `json:"section"`
	Total   int           `json:"total"` // tickets that have this section, before paging
	Offset  int           `json:"offset"`
	Limit   int           `json:"limit"`
	Items   []sectionItem `json:"items"`
}

// sectionOf fills one item with the requested section; ok is false when the ticket has none.
func sectionOf(section string, t models.Ticket, maxChars int) (sectionItem, bool) {
	item := sectionItem{Key: ticketKey(t), Status: t.Status}
	item.Title, _ = cutText(t.Title, digestTitleMax)
	cut := func(s string) string {
		c, was := cutText(s, maxChars)
		if was {
			item.Truncated = true
		}
		return c
	}
	switch section {
	case "task":
		text := taskSection(t.Description)
		if text == "" {
			return item, false
		}
		item.Text = cut(text)
	case "questions":
		if len(t.Questions) == 0 {
			return item, false
		}
		for _, q := range t.Questions {
			item.Questions = append(item.Questions, sectionQA{Question: cut(q.Text), Answer: cut(q.Answer)})
		}
	case "fields":
		if len(t.Fields) == 0 {
			return item, false
		}
		item.Fields = map[string]string{}
		for k, v := range t.Fields {
			item.Fields[k] = cut(v)
		}
	}
	return item, true
}

func (s *MCPServer) ticketSections(args json.RawMessage) (any, error) {
	var a struct {
		Section  string   `json:"section"`
		Label    string   `json:"label"`
		Status   string   `json:"status"`
		Keys     []string `json:"keys"`
		Offset   int      `json:"offset"`
		Limit    int      `json:"limit"`
		MaxChars int      `json:"maxChars"`
	}
	json.Unmarshal(args, &a)
	if a.Section != "task" && a.Section != "questions" && a.Section != "fields" {
		return nil, fmt.Errorf("section must be one of: task, questions, fields")
	}
	if a.Label == "" && len(a.Keys) == 0 {
		return nil, fmt.Errorf("give label (a tag name) or keys (ticket keys such as UE-846); the whole board is not returned")
	}
	if a.Limit <= 0 {
		a.Limit = sectionLimitDef
	}
	if a.Limit > sectionLimitMax {
		a.Limit = sectionLimitMax
	}
	if a.MaxChars <= 0 {
		a.MaxChars = sectionCharsDef
	}
	if a.Offset < 0 {
		a.Offset = 0
	}

	// Tickets come with descriptions, questions and fields (not compact).
	var tickets []models.Ticket
	if len(a.Keys) > 0 {
		for _, k := range a.Keys {
			id, err := s.resolve(ticketRef{Key: k})
			if err != nil {
				return nil, err
			}
			t, err := s.store.GetTicket(id)
			if err != nil {
				return nil, err
			}
			if t != nil {
				tickets = append(tickets, *t)
			}
		}
	} else {
		listed, err := s.store.ListTickets(models.TicketFilter{Label: a.Label, Status: a.Status})
		if err != nil {
			return nil, err
		}
		tickets = listed
	}

	var matched []sectionItem
	for _, t := range tickets {
		if item, ok := sectionOf(a.Section, t, a.MaxChars); ok {
			matched = append(matched, item)
		}
	}

	page := sectionPage{Section: a.Section, Total: len(matched), Offset: a.Offset, Limit: a.Limit, Items: []sectionItem{}}
	if a.Offset < len(matched) {
		end := a.Offset + a.Limit
		if end > len(matched) {
			end = len(matched)
		}
		page.Items = matched[a.Offset:end]
	}
	return page, nil
}

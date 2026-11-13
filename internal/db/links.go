package db

import (
	"errors"
	"fmt"

	"github.com/tcarac/taskboard/internal/models"
)

// ErrInvalidLink is returned for an unknown link type or a link from a ticket to itself.
var ErrInvalidLink = errors.New("invalid link")

// normalizeLink puts a relates_to pair into canonical order (lower ID first), so the symmetric link is stored once.
func normalizeLink(fromID, toID, linkType string) (string, string, error) {
	if !models.IsValidLinkType(linkType) {
		return "", "", fmt.Errorf("%w: unknown type %q (use relates_to or duplicates)", ErrInvalidLink, linkType)
	}
	if fromID == toID {
		return "", "", fmt.Errorf("%w: a ticket cannot link to itself", ErrInvalidLink)
	}
	if linkType == "relates_to" && fromID > toID {
		fromID, toID = toID, fromID
	}
	return fromID, toID, nil
}

// AddLink links fromID to toID with linkType. For duplicates, fromID is the duplicate of toID.
// Adding an existing link is a no-op.
func (s *Store) AddLink(fromID, toID, linkType string) error {
	fromID, toID, err := normalizeLink(fromID, toID, linkType)
	if err != nil {
		return err
	}
	_, err = s.db.Exec("INSERT OR IGNORE INTO ticket_links (from_id, to_id, type) VALUES (?, ?, ?)", fromID, toID, linkType)
	return err
}

// RemoveLink removes the link fromID -> toID of linkType; for relates_to the order of the IDs does not matter.
func (s *Store) RemoveLink(fromID, toID, linkType string) error {
	fromID, toID, err := normalizeLink(fromID, toID, linkType)
	if err != nil {
		return err
	}
	_, err = s.db.Exec("DELETE FROM ticket_links WHERE from_id = ? AND to_id = ? AND type = ?", fromID, toID, linkType)
	return err
}

// populateLinks fills Links for the tickets in index; each ticket gets its links from both ends.
func (s *Store) populateLinks(index map[string]*models.Ticket, in string, args []any) error {
	rows, err := s.db.Query(
		`SELECT ticket_id, type, dir, prefix, number FROM (
			SELECT l.from_id AS ticket_id, l.type, 'out' AS dir, COALESCE(p.prefix, '') AS prefix, t.number
			FROM ticket_links l
			JOIN tickets t ON t.id = l.to_id
			LEFT JOIN projects p ON p.id = t.project_id
			WHERE l.from_id IN (`+in+`)
			UNION ALL
			SELECT l.to_id, l.type, 'in', COALESCE(p.prefix, ''), t.number
			FROM ticket_links l
			JOIN tickets t ON t.id = l.from_id
			LEFT JOIN projects p ON p.id = t.project_id
			WHERE l.to_id IN (`+in+`)
		) ORDER BY ticket_id, type, prefix, number`,
		append(append([]any{}, args...), args...)...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var ticketID, linkType, dir, prefix string
		var number int
		if err := rows.Scan(&ticketID, &linkType, &dir, &prefix, &number); err != nil {
			return err
		}
		ref := models.LinkRef{
			Type: linkType,
			Key:  models.Ticket{ProjectPrefix: prefix, Number: number}.DisplayKey(),
		}
		if linkType == "duplicates" {
			ref.Direction = dir
		}
		index[ticketID].Links = append(index[ticketID].Links, ref)
	}
	return rows.Err()
}

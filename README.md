# Taskboard

A local, self-hosted project management tool with a Kanban UI, full CLI, and a built-in [MCP](https://modelcontextprotocol.io/) server that lets AI assistants manage your projects, tickets, and teams directly.

Single binary. SQLite-backed. No Docker, no external database, no runtime dependencies.

## Screenshots

![Kanban Board](screenshots/board.png)

![Ticket Detail](screenshots/ticket-detail.png)

## Features

- **Kanban Board** — drag-and-drop ticket management across Todo, In Progress, Ready for Review, and Done columns
- **Projects** — organize work with customizable projects (icons, colors, prefixes)
- **Teams** — assign tickets to teams
- **Tickets** — priority levels, due dates, tags (labels) for grouping into sections such as waves or plan stages, subtasks, dependencies (blocked by)
- **Embedded Terminal** — run AI coding agents (opencode, Claude Code) directly from the web UI (macOS and Linux only)
- **CLI** — manage everything from the terminal
- **MCP Server** — 30 tools for AI-native project management via Model Context Protocol
- **Self-Hosted** — your data stays on your machine in a SQLite database
- **Single Binary** — `brew install` on macOS/Linux, or build one `taskboard.exe` on Windows
- **Cross-platform** — macOS, Linux, and Windows

## Install

### Homebrew

```bash
brew tap tcarac/taskboard
brew install taskboard
```

### From source

```bash
git clone https://github.com/tcarac/taskboard.git
cd taskboard
make build
```

Requires Go 1.24+ and Node.js 22+.

### Windows

Homebrew is not available. Build from source in PowerShell (or use `make build` from Git Bash/MSYS2 if you have `make`):

```powershell
git clone https://github.com/tcarac/taskboard.git
cd taskboard

# frontend
cd web
npm install
npm run build
cd ..

# embed the frontend into the binary
New-Item -ItemType Directory -Force cmd	askboard\web\dist | Out-Null
Copy-Item -Recurse -Force web\dist\* cmd	askboard\web\dist
# backend
go build -o taskboard.exe .\cmd	askboard
.	askboard.exe start
```

On Windows the web UI, CLI, MCP server, and `start`/`stop` work. The embedded terminal does not (it needs a Unix pseudo-terminal).

## Usage

### Web UI

```bash
taskboard start
# => http://localhost:3010

taskboard start --port 8080
```

### CLI

```bash
taskboard project create "Auth System" --prefix AUTH --icon "🔐"
taskboard project list

taskboard ticket create --project <ID> --title "Implement login" --priority high
taskboard ticket list --project <ID> --status todo
taskboard ticket move <ID> --status done

taskboard team create "Backend"
taskboard team list
```

### MCP Server (for AI assistants)

```bash
taskboard mcp
```

#### Claude Code

```bash
claude mcp add taskboard -- /path/to/taskboard mcp
```

#### Claude Desktop

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "taskboard": {
      "command": "/path/to/taskboard",
      "args": ["mcp"]
    }
  }
}
```

#### Data Hierarchy

```
Project → Ticket → Subtask
(initiative)  (task)    (step)
```

- **Projects** are the top-level grouping (like epics/initiatives). Create one per body of work.
- **Tickets** are concrete, actionable tasks within a project. Don't create "epic" tickets — use projects.
- **Subtasks** are checklist steps within a ticket, for breaking work into verifiable pieces.

#### Available MCP Tools (30)

| Tool                    | Description                                      |
| ----------------------- | ------------------------------------------------ |
| **Projects**            |                                                  |
| `list_projects`         | List all projects with optional status filter    |
| `get_project`           | Get project details by ID                        |
| `create_project`        | Create a new project (use for epics/initiatives) |
| `update_project`        | Update project properties                        |
| `delete_project`        | Delete a project and all its tickets             |
| **Teams**               |                                                  |
| `list_teams`            | List all teams                                   |
| `get_team`              | Get team details by ID                           |
| `create_team`           | Create a new team                                |
| `update_team`           | Update team properties                           |
| `delete_team`           | Delete a team                                    |
| **Tickets**             |                                                  |
| `list_tickets`          | List tickets with filters: project (ID or prefix), team, status, priority, tag, `search` (substring over key/title/description), `field` (`name=value` or `name`), `unblocked` (all blockers done), `compact` |
| `get_ticket`            | Get ticket details by ID or key (`UE-71`); `compact` omits description and returns subtask counts |
| `get_tickets`           | Get several tickets by `keys` in the given order (optional `compact`) |
| `create_ticket`         | Create a ticket (task) within a project          |
| `update_ticket`         | Update ticket properties                         |
| `move_ticket`           | Move ticket to different status column           |
| `delete_ticket`         | Delete a ticket                                  |
| `append_to_ticket`      | Atomically append text to the description (single SQL statement) |
| `set_ticket_fields`     | Set custom key/value fields (e.g. `class`, `stage`); an empty value deletes the field |
| `add_dependency`        | Block a ticket by another one (self-dependencies and cycles are rejected) |
| `remove_dependency`     | Remove a dependency                              |
| **Labels (tags)**       |                                                  |
| `list_labels`           | List all tags                                    |
| `create_label`          | Create a tag (returns the existing one if the name exists) |
| `add_label`             | Attach a tag to a ticket by name or ID (created if missing) |
| `remove_label`          | Detach a tag from a ticket                       |
| **Board**               |                                                  |
| `get_board`             | Get full Kanban board grouped by status (optionally filtered by project, tag, `search`, `field`, `unblocked`; `compact` saves tokens) |
| **Subtasks**            |                                                  |
| `create_subtask`        | Add a subtask to a ticket                        |
| `batch_create_subtasks` | Add multiple subtasks to a ticket at once        |
| `toggle_subtask`        | Toggle subtask completion                        |
| `delete_subtask`        | Remove a subtask from a ticket                   |

Every tool that takes a ticket `id` (or `ticketId`) also accepts a `key` such as `UE-71` (project prefix + number, case-insensitive). Tickets show `blockedBy` (IDs), `blockedByKeys`, `openBlockers` (blockers not yet `done`), `openBlockerKeys` and custom `fields`. `compact: true` drops the description and returns subtasks only as `subtasksDone` / `subtasksTotal` (omitted when zero).

Write tools (`create_ticket`, `update_ticket`, `move_ticket`, `append_to_ticket`, `set_ticket_fields`, `add_dependency`, `remove_dependency`, `add_label`, `remove_label`) return a short acknowledgement instead of the whole ticket: `key`, `title`, `status`, tag names, `fields`, `blockedByKeys`, `openBlockerKeys` and subtask counts; use `get_ticket` for the description. `batch_create_subtasks` returns only `id` and `title` of each new subtask. All MCP results are compact JSON (no indentation).

Before applying a pending database migration, taskboard writes a backup next to the database: `backups/pre-<migration>-<timestamp>.db`. If the backup fails, no migration runs.

The web UI remembers the last opened project and tag filter, shows `class` / `stage` fields and a «заблокирован» badge on cards, and has board search plus quick filters by those fields. The left sidebar collapses to an icon rail (the button next to the logo); the state is remembered.

#### Example Prompts

Once the MCP is connected, you can talk to your AI assistant in high-level terms and let it figure out the breakdown:

```
I'm building a SaaS billing system. Set up the project and break the work
into tickets covering Stripe integration, usage metering, invoice generation,
and a customer billing portal. Prioritize accordingly.
```

```
I need to ship a password reset flow. Think through what's involved — API
endpoints, email templates, token handling, UI screens, tests — and create
tickets with subtasks for each piece.
```

```
Look at my board and figure out what's blocking progress. If anything in
"in progress" has been sitting there without subtasks, break it down into
concrete next steps.
```

Here's what that looks like — a project and tickets created entirely by an AI assistant via MCP:

![Project created by AI](screenshots/project.png)

![Tickets list](screenshots/tickets.png)

### Embedded Terminal

The web UI includes a built-in terminal (macOS and Linux only; not available on Windows). Click **Terminal** in the sidebar to open a full PTY shell with color support and a resizable panel. Run `opencode`, `claude`, or any command directly from the browser.

![Embedded Terminal](screenshots/terminal.png)

The agent shares the same SQLite database via MCP, so tickets it creates show up on your board immediately.

## Data Storage

All data is stored in a SQLite database at:

- **macOS**: `~/Library/Application Support/taskboard/taskboard.db`
- **Linux**: `~/.config/taskboard/taskboard.db`
- **Windows**: `%AppData%	askboard	askboard.db`

Migrations run automatically on first start.

### Custom Database Path

Use `--db` to point any command at a different database file:

```bash
taskboard --db /path/to/other.db start
taskboard --db /path/to/other.db mcp
taskboard --db /path/to/other.db ticket list
```

### Clearing Data

To wipe all projects, tickets, teams, and labels while keeping the schema intact:

```bash
taskboard clear        # prompts for confirmation
taskboard clear -f     # skip confirmation
```

This also respects `--db`, so you can clear a specific database file:

```bash
taskboard --db /tmp/test.db clear -f
```

## Tech Stack

| Layer        | Technology                                          |
| ------------ | --------------------------------------------------- |
| Language     | Go                                                  |
| Database     | SQLite (via modernc.org/sqlite, pure Go)            |
| CLI          | cobra                                               |
| HTTP         | chi                                                 |
| Frontend     | React, TypeScript, Tailwind CSS v4, dnd-kit         |
| Terminal     | xterm.js, gorilla/websocket, creack/pty             |
| MCP          | JSON-RPC over stdio                                 |
| Distribution | Single binary with embedded frontend via `embed.FS` |

## Development

```bash
# Run backend (serves API on :3010)
go run ./cmd/taskboard start

# Run frontend dev server (proxies API to :3010)
cd web && npm run dev

# Build everything
make build

# Clean
make clean
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar,
  AlertTriangle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Users,
  Plus,
  Lock,
  Search,
  HelpCircle,
  Activity,
  SlidersHorizontal,
  ListChecks,
  MoreHorizontal,
} from "lucide-react";
import { api, type Ticket, type TicketInput, type Project, type Team, type BoardColumn } from "../api/client";
import TicketPanel from "../components/TicketPanel";
import CreateTicketModal from "../components/CreateTicketModal";
import { STATUSES, statusLabel, priorityLabel, STATUS_COLORS } from "../lib/statuses";
import { t, formatDate, type TKey } from "../lib/i18n";
import { allTags, tagNames } from "../lib/tags";
import { duplicateOfKeys } from "../lib/links";
import { CARD_FIELDS, fieldValues, matchesSearch } from "../lib/fields";
import {
  DEFAULT_DISPLAY,
  DEFAULT_SORT,
  EMPTY_FILTERS,
  SORT_KEYS,
  activeFilterCount,
  boardFieldNames,
  cardFieldEntries,
  matchesFilters,
  sortTickets,
  type CardDisplay,
  type SortKey,
  type ViewFilters,
  type ViewSort,
} from "../lib/boardView";
import ViewMenu, { Row, SELECT_CLASS } from "../components/ViewMenu";
import BulkMenu from "../components/BulkMenu";

const STORAGE_PROJECT = "taskboard.board.project";
const STORAGE_TAG = "taskboard.board.tag";
const STORAGE_SORT = "taskboard.board.sort";
const STORAGE_DISPLAY = "taskboard.board.display";
const STORAGE_COLUMN_ORDER = "taskboard.columnOrder";
const STORAGE_COLLAPSED = "taskboard.collapsedColumns";
const COLUMN_ID_PREFIX = "column:";

// Второстепенные кнопки шапки: одна высота с полями ввода, на узком экране — только иконка
const HEADER_BUTTON =
  "inline-flex h-8 min-w-8 items-center justify-center gap-1.5 bg-slate-800 text-xs text-slate-300 rounded-md border border-slate-700 px-2 hover:border-slate-500 hover:text-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500";

// Подписи быстрых фильтров по полям внутри меню фильтров
const FIELD_ROW_KEYS: Record<string, TKey> = { class: "board.field.class", stage: "board.field.stage" };

interface MoreMenuItem {
  icon: typeof Plus;
  label: string;
  hint: string;
  onClick: () => void;
}

// Меню «⋯» для редких действий шапки. Закрывается по клику вне, по Esc и после выбора пункта.
function MoreMenu({ items }: { items: MoreMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("board.moreActions")}
        aria-label={t("board.moreActions")}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${HEADER_BUTTON} ${open ? "border-blue-500/60 text-blue-300" : ""}`}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-40 w-72 max-w-[calc(100vw-1rem)] rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-slate-800 transition-colors"
            >
              <item.icon className="mt-0.5 w-4 h-4 shrink-0 text-slate-400" />
              <span className="min-w-0">
                <span className="block text-sm text-slate-200">{item.label}</span>
                <span className="block text-xs text-slate-500">{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Column drags and ticket drags share one DndContext; this tells them apart by data.current.type
const COLUMN_DRAG = "column";

function readStored(key: string): string {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeStored(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // localStorage недоступен: просто не запоминаем
  }
}

function readList(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // localStorage недоступен: просто не запоминаем
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage недоступен: просто не запоминаем
  }
}

function readJsonObject(key: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || "null");
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}


// Сортировка из localStorage: неизвестный ключ сбрасывается на значение по умолчанию
function readSort(): ViewSort {
  const saved = readJsonObject(STORAGE_SORT);
  if (!saved) return DEFAULT_SORT;
  const key = SORT_KEYS.includes(saved.key as SortKey) ? (saved.key as SortKey) : DEFAULT_SORT.key;
  return { key, desc: saved.desc === true };
}

// Настройки карточки из localStorage: только булевы значения
function readDisplay(): CardDisplay {
  const saved = readJsonObject(STORAGE_DISPLAY);
  if (!saved) return DEFAULT_DISPLAY;
  const fields: Record<string, boolean> = {};
  const savedFields = saved.fields;
  if (savedFields && typeof savedFields === "object" && !Array.isArray(savedFields)) {
    for (const [name, shown] of Object.entries(savedFields as Record<string, unknown>)) {
      if (typeof shown === "boolean") fields[name] = shown;
    }
  }
  return {
    showTags: typeof saved.showTags === "boolean" ? saved.showTags : DEFAULT_DISPLAY.showTags,
    fields,
  };
}

// Saved order first (unknown and repeated ids dropped), then the columns it does not mention in default order
function normalizeColumnOrder(saved: string[]): string[] {
  const known = saved.filter((status, i) => STATUSES.includes(status) && saved.indexOf(status) === i);
  return [...known, ...STATUSES.filter((status) => !known.includes(status))];
}

const columnId = (status: string) => `${COLUMN_ID_PREFIX}${status}`;
const statusOfColumnId = (id: UniqueIdentifier) => String(id).slice(COLUMN_ID_PREFIX.length);

// Column drags only collide with columns; ticket drags only with drop zones and never with columns
const collisionByDragKind: CollisionDetection = (args) => {
  const draggingColumn = args.active.data.current?.type === COLUMN_DRAG;
  return closestCorners({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) => (container.data.current?.type === COLUMN_DRAG) === draggingColumn
    ),
  });
};

const PRIORITY_CONFIG: Record<string, { color: string; icon: typeof ArrowUp }> = {
  urgent: { color: "text-red-500", icon: AlertTriangle },
  high: { color: "text-orange-500", icon: ArrowUp },
  medium: { color: "text-yellow-500", icon: ArrowRight },
  low: { color: "text-green-500", icon: ArrowDown },
};

function PriorityBadge({ priority }: { priority: string }) {
  const config = PRIORITY_CONFIG[priority];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${config.color}`}>
      <Icon className="w-3 h-3" />
      {priorityLabel(priority)}
    </span>
  );
}

function SubtaskProgress({ subtasks }: { subtasks: Ticket["subtasks"] }) {
  if (!subtasks || subtasks.length === 0) return null;
  const done = subtasks.filter((s) => s.completed).length;
  const pct = Math.round((done / subtasks.length) * 100);
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <CheckCircle2 className="w-3 h-3" />
      <div className="flex-1 h-1 rounded-full bg-slate-700 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span>
        {done}/{subtasks.length}
      </span>
    </div>
  );
}

function QuestionCounter({ questions }: { questions: Ticket["questions"] }) {
  const open = (questions || []).filter((q) => !q.answer.trim()).length;
  if (open === 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-amber-400">
      <HelpCircle className="w-3 h-3" />
      {t("board.openQuestions", { count: open })}
    </div>
  );
}

const LIVE_STYLES: Record<string, { box: string; chip: string; bar: string; text: string; labelKey: TKey }> = {
  running: {
    box: "border-blue-500/60 bg-blue-950/40",
    chip: "bg-blue-500/20 text-blue-300",
    bar: "bg-blue-500",
    text: "text-blue-300",
    labelKey: "board.live.running",
  },
  ok: {
    box: "border-green-500/60 bg-green-950/40",
    chip: "bg-green-500/20 text-green-300",
    bar: "bg-green-500",
    text: "text-green-300",
    labelKey: "board.live.done",
  },
  failed: {
    box: "border-red-500/60 bg-red-950/40",
    chip: "bg-red-500/20 text-red-300",
    bar: "bg-red-500",
    text: "text-red-300",
    labelKey: "board.live.error",
  },
};

// Live progress card: not draggable, not editable, refreshed by the board poll.
function LiveCard({ ticket }: { ticket: Ticket }) {
  const state = ticket.liveState && LIVE_STYLES[ticket.liveState] ? ticket.liveState : "running";
  const st = LIVE_STYLES[state];
  const pct = Math.min(100, Math.max(0, ticket.progress ?? 0));
  return (
    <div className={`rounded-lg border-2 p-3 space-y-2 ${st.box}`}>
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${st.chip} ${
            state === "running" ? "animate-pulse" : ""
          }`}
        >
          <Activity className="w-3 h-3" />
          {t(st.labelKey)}
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100" title={ticket.title}>
          {ticket.title}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${st.bar}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`w-10 text-right text-sm font-bold tabular-nums ${st.text}`}>{pct}%</span>
      </div>
      {ticket.progressText && <p className="text-xs text-slate-300">{ticket.progressText}</p>}
      {(ticket.liveLines || []).slice(0, 4).map((line, i) => (
        <p key={i} className="truncate text-xs text-slate-400" title={line}>
          {line}
        </p>
      ))}
      <div className="text-right text-[10px] font-mono text-slate-600">
        {ticket.projectPrefix}-{ticket.number}
      </div>
    </div>
  );
}

function TicketCard({
  ticket,
  projects,
  teams,
  display,
  isDragging,
  onClick,
}: {
  ticket: Ticket;
  projects: Project[];
  teams: Team[];
  display: CardDisplay;
  isDragging?: boolean;
  onClick?: () => void;
}) {
  const project = projects.find((p) => p.id === ticket.projectId);
  const team = teams.find((t) => t.id === ticket.teamId);
  const fieldEntries = cardFieldEntries(ticket, display);
  const labels = ticket.labels || [];

  return (
    <div
      onClick={onClick}
      className={`rounded-lg border border-slate-700/50 bg-slate-900 p-2.5 space-y-1.5 transition-colors hover:border-slate-600 cursor-pointer ${
        isDragging ? "opacity-90 shadow-xl shadow-blue-500/10 rotate-2" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-mono text-slate-500">
          {ticket.projectPrefix}-{ticket.number}
        </span>
        <PriorityBadge priority={ticket.priority} />
      </div>
      <p className="text-sm text-slate-200 leading-snug">{ticket.title}</p>
      {display.showTags && labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {labels.map((label) => (
            <span
              key={label.id}
              className="inline-flex rounded px-1.5 py-0.5 text-[11px]"
              style={{
                backgroundColor: (label.color || "#64748b") + "1a",
                color: label.color || "#64748b",
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}
      {duplicateOfKeys(ticket).map((key) => (
        <span
          key={key}
          className="inline-flex items-center rounded bg-orange-500/10 px-1.5 py-0.5 text-[11px] font-medium text-orange-400"
        >
          duplicate of {key}
        </span>
      ))}
      {(ticket.openBlockers ?? 0) > 0 && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-400"
          title={t("board.blockedHint")}
        >
          <Lock className="w-3 h-3" />
          {t("board.blockedBy", { keys: (ticket.openBlockerKeys || []).join(", ") })}
        </span>
      )}
      {fieldEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {fieldEntries.map(([name, value]) => (
            <span
              key={name}
              title={name}
              className="inline-flex items-center rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300"
            >
              {(CARD_FIELDS as readonly string[]).includes(name) ? value : `${name}: ${value}`}
            </span>
          ))}
        </div>
      )}
      {(project || team) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {project && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: (project.color || "#3b82f6") + "1a",
                color: project.color || "#3b82f6",
              }}
            >
              <FolderKanban className="w-3 h-3" />
              {project.name}
            </span>
          )}
          {team && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: (team.color || "#8b5cf6") + "1a",
                color: team.color || "#8b5cf6",
              }}
            >
              <Users className="w-3 h-3" />
              {team.name}
            </span>
          )}
        </div>
      )}
      {ticket.dueDate && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar className="w-3 h-3" />
          {formatDate(ticket.dueDate)}
        </div>
      )}
      <SubtaskProgress subtasks={ticket.subtasks} />
      <QuestionCounter questions={ticket.questions} />
    </div>
  );
}

function DraggableTicket({
  ticket,
  projects,
  teams,
  display,
  onClick,
}: {
  ticket: Ticket;
  projects: Project[];
  teams: Team[];
  display: CardDisplay;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    data: { ticket },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}
    >
      <TicketCard ticket={ticket} projects={projects} teams={teams} display={display} onClick={onClick} />
    </div>
  );
}

function Column({
  status,
  tickets,
  projects,
  teams,
  display,
  collapsed,
  onToggleCollapsed,
  onTicketClick,
  onAddTicket,
}: {
  status: string;
  tickets: Ticket[];
  projects: Project[];
  teams: Team[];
  display: CardDisplay;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onTicketClick: (ticket: Ticket) => void;
  onAddTicket: (status: string) => void;
}) {
  // Ticket drop zone: the body when expanded, the strip when collapsed
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: status, data: { kind: "zone" } });
  // The header (or the strip) is the only drag handle of a column
  const {
    attributes,
    listeners,
    setNodeRef: setSortRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnId(status), data: { type: COLUMN_DRAG } });
  const setStripRef = useCallback(
    (node: HTMLElement | null) => {
      setDropRef(node);
      setActivatorNodeRef(node);
    },
    [setDropRef, setActivatorNodeRef]
  );
  const sortStyle = { transform: CSS.Transform.toString(transform), transition };
  const liveCount = tickets.filter((t) => t.kind === "live").length;

  if (collapsed) {
    return (
      <div
        ref={setSortRef}
        style={sortStyle}
        className={`flex flex-col w-11 shrink-0 self-stretch ${isDragging ? "opacity-40" : ""}`}
      >
        <div
          ref={setStripRef}
          {...attributes}
          {...listeners}
          onClick={onToggleCollapsed}
          title={t("board.expandColumnNamed", { name: statusLabel(status) })}
          className={`flex flex-1 flex-col items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 py-3 cursor-pointer transition-colors hover:border-slate-600 ${
            isOver ? "bg-blue-500/5 ring-1 ring-blue-500/20" : ""
          }`}
        >
          <div className={`w-2 h-2 shrink-0 rounded-full ${STATUS_COLORS[status]}`} />
          <span className="text-sm font-medium text-slate-300 whitespace-nowrap [writing-mode:vertical-rl]">
            {statusLabel(status)}
          </span>
          <span className="text-xs text-slate-600 tabular-nums">{tickets.length}</span>
          <button type="button" aria-label={t("board.expandColumn")} className="mt-auto text-slate-600 hover:text-slate-300 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setSortRef}
      style={sortStyle}
      className={`flex flex-col w-80 shrink-0 ${isDragging ? "opacity-40" : ""}`}
    >
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="flex items-center gap-2 px-1 pb-3 cursor-grab active:cursor-grabbing"
      >
        <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
        <h3 className="text-sm font-medium text-slate-300">
          {statusLabel(status)}
        </h3>
        <span className="text-xs text-slate-600 ml-auto">
          {tickets.length - liveCount}
          {liveCount > 0 && ` ${t("board.liveCount", { count: liveCount })}`}
        </span>
        <button
          type="button"
          onClick={() => onAddTicket(status)}
          title={t("board.addToColumn")}
          aria-label={t("board.addToColumn")}
          className="text-slate-500 hover:text-slate-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={t("board.collapseColumn")}
          aria-label={t("board.collapseColumn")}
          className="text-slate-600 hover:text-slate-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
      <div
        ref={setDropRef}
        className={`flex-1 space-y-2 rounded-lg p-2 transition-colors min-h-32 ${
          isOver ? "bg-blue-500/5 ring-1 ring-blue-500/20" : ""
        }`}
      >
        {tickets.map((ticket) =>
          ticket.kind === "live" ? (
            <LiveCard key={ticket.id} ticket={ticket} />
          ) : (
            <DraggableTicket
              key={ticket.id}
              ticket={ticket}
              projects={projects}
              teams={teams}
              display={display}
              onClick={() => onTicketClick(ticket)}
            />
          )
        )}
        {tickets.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-slate-700 border border-dashed border-slate-800 rounded-lg">
            {t("board.dropHere")}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Board() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(() => readStored(STORAGE_PROJECT));
  const [selectedTag, setSelectedTag] = useState<string>(() => readStored(STORAGE_TAG));
  const [search, setSearch] = useState("");
  const [fieldFilters, setFieldFilters] = useState<Record<string, string>>({});
  // Фильтры вида не сохраняются; сортировка и настройки карточки — в localStorage
  const [filters, setFilters] = useState<ViewFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<ViewSort>(readSort);
  const [display, setDisplay] = useState<CardDisplay>(readDisplay);
  const [viewOpen, setViewOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    normalizeColumnOrder(readList(STORAGE_COLUMN_ORDER))
  );
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>(() =>
    readList(STORAGE_COLLAPSED).filter((status) => STATUSES.includes(status))
  );
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [createForStatus, setCreateForStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    writeList(STORAGE_COLUMN_ORDER, columnOrder);
  }, [columnOrder]);

  useEffect(() => {
    writeList(STORAGE_COLLAPSED, collapsedColumns);
  }, [collapsedColumns]);

  useEffect(() => {
    writeJson(STORAGE_SORT, sort);
  }, [sort]);

  useEffect(() => {
    writeJson(STORAGE_DISPLAY, display);
  }, [display]);

  const loadBoard = useCallback(async () => {
    try {
      const board = await api.board.get(selectedProject || undefined);
      setColumns(board.columns || []);
    } catch {
      setColumns(
        STATUSES.map((status) => ({ status, tickets: [] }))
      );
    }
    setLoading(false);
  }, [selectedProject]);

  useEffect(() => {
    api.projects
      .list()
      .then((list) => {
        setProjects(list);
        // Запомненный проект мог быть удалён
        setSelectedProject((current) => (current && !list.some((p) => p.id === current) ? "" : current));
      })
      .catch(() => setProjects([]));
    api.teams.list().then(setTeams).catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    writeStored(STORAGE_PROJECT, selectedProject);
    writeStored(STORAGE_TAG, selectedTag);
  }, [selectedProject, selectedTag]);

  useEffect(() => {
    setLoading(true);
    loadBoard();
  }, [loadBoard]);

  // Poll every 5 s so live cards update without a reload; paused while dragging a ticket or a column, or when the tab is hidden
  useEffect(() => {
    if (activeTicket || activeColumn) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      api.board
        .get(selectedProject || undefined)
        .then((board) => setColumns(board.columns || []))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [selectedProject, activeTicket, activeColumn]);

  const allBoardTickets = columns.flatMap((c) => c.tickets);
  const boardTags = allTags(allBoardTickets);
  // Запомненного тега может уже не быть на доске
  const activeTag = boardTags.includes(selectedTag) ? selectedTag : "";

  // Живые карточки не фильтруются; остальные проходят фильтры вида, затем сортировку
  const getColumnTickets = (status: string) => {
    const list = (columns.find((c) => c.status === status)?.tickets || []).filter(
      (t) =>
        t.kind === "live" ||
        ((!activeTag || tagNames(t).includes(activeTag)) &&
        matchesSearch(t, search) &&
        CARD_FIELDS.every((name) => !fieldFilters[name] || t.fields?.[name] === fieldFilters[name]) &&
        matchesFilters(t, filters))
    );
    return sortTickets(list, sort);
  };

  // Видимые на доске тикеты (после всех фильтров, без живых карточек) — для массовой обработки
  const visibleTickets = columns
    .flatMap((c) => getColumnTickets(c.status))
    .filter((t) => t.kind !== "live");
  const totalFilterCount =
    activeFilterCount(filters) + (activeTag ? 1 : 0) + CARD_FIELDS.filter((name) => fieldFilters[name]).length;

  const toggleCollapsed = (status: string) => {
    setCollapsedColumns((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  // Empty means no tickets at all on the board for that status (live cards count, filters do not matter)
  const collapseEmptyColumns = () => {
    setCollapsedColumns(
      STATUSES.filter((status) => {
        const count = columns.find((c) => c.status === status)?.tickets.length ?? 0;
        return collapsedColumns.includes(status) || count === 0;
      })
    );
  };

  const findTicketById = (id: UniqueIdentifier): Ticket | undefined => {
    for (const col of columns) {
      const found = col.tickets.find((t) => t.id === id);
      if (found) return found;
    }
    return undefined;
  };

  const findColumnByTicketId = (id: UniqueIdentifier): string | undefined => {
    for (const col of columns) {
      if (col.tickets.find((t) => t.id === id)) return col.status;
    }
    return undefined;
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === COLUMN_DRAG) {
      setActiveColumn(statusOfColumnId(event.active.id));
      return;
    }
    const ticket = findTicketById(event.active.id);
    setActiveTicket(ticket ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.data.current?.type === COLUMN_DRAG) return;

    const activeStatus = findColumnByTicketId(active.id);
    const overStatus = STATUSES.includes(over.id as string)
      ? (over.id as string)
      : findColumnByTicketId(over.id);

    if (!activeStatus || !overStatus || activeStatus === overStatus) return;

    setColumns((prev) =>
      prev.map((col) => {
        if (col.status === activeStatus) {
          return { ...col, tickets: col.tickets.filter((t) => t.id !== active.id) };
        }
        if (col.status === overStatus) {
          const ticket = findTicketById(active.id);
          if (!ticket) return col;
          return { ...col, tickets: [...col.tickets, { ...ticket, status: overStatus }] };
        }
        return col;
      })
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.data.current?.type === COLUMN_DRAG) {
      setActiveColumn(null);
      const from = statusOfColumnId(active.id);
      const to = over?.data.current?.type === COLUMN_DRAG ? statusOfColumnId(over.id) : null;
      if (to && to !== from) {
        setColumnOrder((prev) => arrayMove(prev, prev.indexOf(from), prev.indexOf(to)));
      }
      return;
    }

    setActiveTicket(null);

    if (!over) return;

    const targetStatus = STATUSES.includes(over.id as string)
      ? (over.id as string)
      : findColumnByTicketId(over.id);

    if (!targetStatus) return;

    try {
      await api.tickets.move(active.id as string, targetStatus);
    } catch {
      loadBoard();
    }
  };

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const handleUpdate = async (id: string, data: TicketInput) => {
    await api.tickets.update(id, data);
    loadBoard();
  };

  const handleDelete = async (id: string) => {
    await api.tickets.delete(id);
    loadBoard();
  };

  const handleCreate = async (data: TicketInput) => {
    await api.tickets.create(data);
    setCreateForStatus(null);
    loadBoard();
  };

  return (
    <div className="h-full flex flex-col">
      <header className="shrink-0 flex flex-wrap sm:flex-nowrap items-center gap-2 px-3 sm:px-6 min-h-14 py-2 border-b border-slate-800">
        {/* Слева — самое частое: создать, выбрать проект, найти. Справа — фильтры и редкие действия в меню «⋯». */}
        <button
          type="button"
          onClick={() => setCreateForStatus(STATUSES[0])}
          title={t("board.newTicket")}
          aria-label={t("board.newTicket")}
          className="shrink-0 inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-2.5 lg:px-3 text-xs font-medium text-white hover:bg-blue-500 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden lg:inline">{t("board.newTicket")}</span>
        </button>
        <select
          value={selectedProject}
          onChange={(e) => {
            setSelectedProject(e.target.value);
            setSelectedTag("");
            setFieldFilters({});
            setFilters(EMPTY_FILTERS);
          }}
          title={t("board.projectHint")}
          className="h-8 min-w-0 flex-1 sm:flex-none sm:w-40 lg:w-48 truncate bg-slate-800 text-sm text-slate-300 rounded-md border border-slate-700 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">{t("board.allProjects")}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.icon} {p.name}
            </option>
          ))}
        </select>
        <div className="relative order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-md sm:min-w-[9rem]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("board.search")}
            title={t("board.searchHint")}
            className="h-8 w-full bg-slate-800 text-xs text-slate-300 placeholder:text-slate-500 rounded-md border border-slate-700 pl-8 pr-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="relative shrink-0 sm:ml-auto">
          <button
            type="button"
            onClick={() => setViewOpen((open) => !open)}
            title={t("board.filtersHint")}
            aria-label={t("board.filtersAria")}
            aria-expanded={viewOpen}
            className={`${HEADER_BUTTON} ${viewOpen || totalFilterCount > 0 ? "border-blue-500/60 text-blue-300" : ""}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden lg:inline">{t("board.filters")}</span>
            {totalFilterCount > 0 && (
              <span className="rounded bg-blue-500/20 px-1.5 text-[10px] font-medium text-blue-300 tabular-nums">
                {totalFilterCount}
              </span>
            )}
          </button>
          {viewOpen && (
            <ViewMenu
              filters={filters}
              onFiltersChange={setFilters}
              sort={sort}
              onSortChange={setSort}
              display={display}
              onDisplayChange={setDisplay}
              teams={teams}
              fieldNames={boardFieldNames(allBoardTickets, display)}
              onResetFilters={() => {
                setFilters(EMPTY_FILTERS);
                setSelectedTag("");
                setFieldFilters({});
              }}
              quickFilters={
                <>
                  <Row label={t("board.field.tag")}>
                    <select value={activeTag} onChange={(e) => setSelectedTag(e.target.value)} className={SELECT_CLASS}>
                      <option value="">{t("board.anyTag")}</option>
                      {boardTags.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  </Row>
                  {CARD_FIELDS.map((name) => {
                    const values = fieldValues(allBoardTickets, name);
                    if (values.length === 0 && !fieldFilters[name]) return null;
                    return (
                      <Row key={name} label={FIELD_ROW_KEYS[name] ? t(FIELD_ROW_KEYS[name]) : name}>
                        <select
                          value={fieldFilters[name] || ""}
                          onChange={(e) => setFieldFilters((prev) => ({ ...prev, [name]: e.target.value }))}
                          className={SELECT_CLASS}
                        >
                          <option value="">{t("board.anyValue")}</option>
                          {values.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </Row>
                    );
                  })}
                </>
              }
              onClose={() => setViewOpen(false)}
            />
          )}
        </div>
        <MoreMenu
          items={[
            {
              icon: ListChecks,
              label: t("board.bulkEdit"),
              hint: t("board.bulkEditHint"),
              onClick: () => setBulkOpen(true),
            },
            {
              icon: ChevronLeft,
              label: t("board.collapseEmpty"),
              hint: t("board.collapseEmptyHint"),
              onClick: collapseEmptyColumns,
            },
          ]}
        />
      </header>

      <div className="flex-1 overflow-x-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-600">
            {t("board.loading")}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            // Без компенсации сдвига макета: иначе страница прокручивается при переносе карточки между колонками
            autoScroll={{ layoutShiftCompensation: false }}
            collisionDetection={collisionByDragKind}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={columnOrder.map(columnId)} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-6 h-full">
                {columnOrder.map((status) => (
                  <Column
                    key={status}
                    status={status}
                    tickets={getColumnTickets(status)}
                    projects={projects}
                    teams={teams}
                    display={display}
                    collapsed={collapsedColumns.includes(status)}
                    onToggleCollapsed={() => toggleCollapsed(status)}
                    onTicketClick={handleTicketClick}
                    onAddTicket={setCreateForStatus}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeTicket ? (
                <div className="w-80">
                  <TicketCard ticket={activeTicket} projects={projects} teams={teams} display={display} isDragging />
                </div>
              ) : null}
            </DragOverlay>
           </DndContext>
        )}
      </div>

      {bulkOpen && (
        <BulkMenu
          tickets={visibleTickets}
          allTickets={allBoardTickets}
          onClose={() => setBulkOpen(false)}
          onDone={loadBoard}
        />
      )}

      {createForStatus && (
        <CreateTicketModal
          projects={projects}
          teams={teams}
          defaultStatus={createForStatus}
          onClose={() => setCreateForStatus(null)}
          onCreate={handleCreate}
        />
      )}

      {selectedTicket && (
        <TicketPanel
          ticket={selectedTicket}
          projects={projects}
          teams={teams}
          onClose={() => {
            setSelectedTicket(null);
            loadBoard();
          }}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

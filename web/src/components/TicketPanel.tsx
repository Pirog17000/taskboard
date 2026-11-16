import { useRef, useState } from "react";
import { X, Trash2, CheckCircle2, Circle, Pencil, Eye } from "lucide-react";
import Markdown from "react-markdown";
import { api, type Ticket, type TicketInput, type Project, type Team, type Subtask, type Question, type TicketLink } from "../api/client";
import { STATUSES, STATUS_LABELS } from "../lib/statuses";
import { parseTags, tagNames } from "../lib/tags";
import { linkLabel } from "../lib/links";

const PRIORITIES = ["urgent", "high", "medium", "low"];

// Ширина панели: по умолчанию 640px, хранится в localStorage.
const WIDTH_KEY = "taskboard.ticketPanelWidth";
const DEFAULT_WIDTH = 640;
const MIN_WIDTH = 420;

function clampWidth(w: number): number {
  const max = Math.max(MIN_WIDTH, window.innerWidth - 80);
  return Math.min(max, Math.max(MIN_WIDTH, Math.round(w)));
}

function readStoredWidth(): number {
  try {
    const raw = localStorage.getItem(WIDTH_KEY);
    if (raw !== null && Number.isFinite(Number(raw))) return clampWidth(Number(raw));
  } catch {
    // localStorage недоступен — используем значение по умолчанию
  }
  return clampWidth(DEFAULT_WIDTH);
}

function saveWidth(w: number) {
  try {
    localStorage.setItem(WIDTH_KEY, String(w));
  } catch {
    // localStorage недоступен — ширина просто не сохранится
  }
}

// Заголовок секции: цветная полоска слева, счётчик справа.
function SectionHeader({
  title,
  count,
  warning,
}: {
  title: string;
  count?: number | string;
  warning?: string;
}) {
  return (
    <h4 className="mb-2 flex items-center gap-2 border-l-2 border-blue-500/60 pl-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
      <span>{title}</span>
      {warning && (
        <span className="normal-case tracking-normal font-normal text-amber-400">{warning}</span>
      )}
      {count !== undefined && (
        <span className="ml-auto normal-case tracking-normal font-normal text-slate-500">{count}</span>
      )}
    </h4>
  );
}

// Все секции, кроме первой, отделяются линией сверху.
const SECTION = "border-t border-slate-800 pt-3";

export default function TicketPanel({
  ticket,
  projects,
  teams,
  onClose,
  onUpdate,
  onDelete,
}: {
  ticket: Ticket;
  projects: Project[];
  teams: Team[];
  onClose: () => void;
  onUpdate: (id: string, data: TicketInput) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description);
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [dueDate, setDueDate] = useState(ticket.dueDate || "");
  const [teamId, setTeamId] = useState(ticket.teamId || "");
  const [subtasks, setSubtasks] = useState<Subtask[]>(ticket.subtasks || []);
  const [newSubtask, setNewSubtask] = useState("");
  const [questions, setQuestions] = useState<Question[]>(ticket.questions || []);
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries((ticket.questions || []).map((q) => [q.id, q.answer])),
  );
  const [newQuestion, setNewQuestion] = useState("");
  const [tags, setTags] = useState(tagNames(ticket).join(", "));
  const [newTag, setNewTag] = useState("");
  const [fields, setFields] = useState<Record<string, string>>(ticket.fields || {});
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [blockedByKeys, setBlockedByKeys] = useState<string[]>(ticket.blockedByKeys || []);
  const [openBlockerKeys, setOpenBlockerKeys] = useState<string[]>(ticket.openBlockerKeys || []);
  const [newBlocker, setNewBlocker] = useState("");
  const [depError, setDepError] = useState("");
  const [links, setLinks] = useState<TicketLink[]>(ticket.links || []);
  const [newLinkTarget, setNewLinkTarget] = useState("");
  const [newLinkType, setNewLinkType] = useState("relates_to");
  const [linkError, setLinkError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [descMode, setDescMode] = useState<"preview" | "write">(description ? "preview" : "write");

  // Ширина панели: перетаскивание левой ручки, значение сохраняется в localStorage.
  const [width, setWidth] = useState<number>(readStoredWidth);
  const widthRef = useRef(width);
  const dragRef = useRef(false);

  const markDirty = () => setDirty(true);

  const tagList = parseTags(tags);
  const unansweredCount = questions.filter((q) => !q.answer.trim()).length;
  const subtasksDone = subtasks.filter((s) => s.completed).length;

  const labelFor = (name: string) => ticket.labels?.find((l) => l.name === name);

  const removeTag = (name: string) => {
    setTags(tagList.filter((t) => t !== name).join(", "));
    markDirty();
  };

  const addTag = () => {
    const t = newTag.trim();
    if (t && !tagList.includes(t)) {
      setTags([...tagList, t].join(", "));
      markDirty();
    }
    setNewTag("");
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && newTag === "" && tagList.length > 0) {
      removeTag(tagList[tagList.length - 1]);
    }
  };

  const onResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    // Панель прижата к правому краю окна, поэтому ширина = расстояние от курсора до правого края.
    const next = clampWidth(window.innerWidth - e.clientX);
    widthRef.current = next;
    setWidth(next);
  };

  const onResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    saveWidth(widthRef.current);
  };

  const onResizeReset = () => {
    const next = clampWidth(DEFAULT_WIDTH);
    widthRef.current = next;
    setWidth(next);
    saveWidth(next);
  };

  const handleSave = () => {
    onUpdate(ticket.id, {
      title,
      description,
      status,
      priority,
      dueDate: dueDate || undefined,
      teamId: teamId || undefined,
      labels: parseTags(tags),
    });
    setDirty(false);
  };

  const applyFields = (t: Ticket) => setFields(t.fields || {});

  const applyDependencies = (t: Ticket) => {
    setBlockedByKeys(t.blockedByKeys || []);
    setOpenBlockerKeys(t.openBlockerKeys || []);
  };

  // Пустое значение удаляет поле.
  const handleSaveField = async (name: string, value: string) => {
    if ((ticket.fields?.[name] ?? "") === value.trim() && value) return;
    applyFields(await api.tickets.setFields(ticket.id, { [name]: value }));
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim() || !newFieldValue.trim()) return;
    applyFields(await api.tickets.setFields(ticket.id, { [newFieldName]: newFieldValue }));
    setNewFieldName("");
    setNewFieldValue("");
  };

  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlocker.trim()) return;
    try {
      applyDependencies(await api.tickets.addDependency(ticket.id, newBlocker.trim()));
      setNewBlocker("");
      setDepError("");
    } catch (err) {
      setDepError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRemoveDependency = async (key: string) => {
    applyDependencies(await api.tickets.removeDependency(ticket.id, key));
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkTarget.trim()) return;
    try {
      // The ticket in this panel is the source of the new link, so the response is this ticket.
      const updated = await api.tickets.addLink(ticket.id, newLinkTarget.trim(), newLinkType);
      setLinks(updated.links || []);
      setNewLinkTarget("");
      setLinkError("");
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRemoveLink = async (link: TicketLink) => {
    // The link is stored from its source ticket: for "in" the other ticket is the source.
    const [from, to] = link.direction === "in" ? [link.key, ticket.id] : [ticket.id, link.key];
    try {
      await api.tickets.removeLink(from, to, link.type);
      setLinks((prev) => prev.filter((l) => l !== link));
      setLinkError("");
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    const sub = await api.tickets.addSubtask(ticket.id, newSubtask);
    setSubtasks((prev) => [...prev, sub]);
    setNewSubtask("");
  };

  const handleToggleSubtask = async (id: string) => {
    const updated = await api.subtasks.toggle(id);
    setSubtasks((prev) => prev.map((s) => (s.id === id ? updated : s)));
  };

  const handleDeleteSubtask = async (id: string) => {
    await api.subtasks.delete(id);
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  // Saves on blur like custom fields; skipped when the answer did not change.
  const handleSaveAnswer = async (id: string) => {
    const value = answers[id] ?? "";
    const current = questions.find((q) => q.id === id);
    if (!current || current.answer === value) return;
    const updated = await api.questions.answer(id, value);
    setQuestions((prev) => prev.map((q) => (q.id === id ? updated : q)));
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    const q = await api.tickets.addQuestion(ticket.id, newQuestion);
    setQuestions((prev) => [...prev, q]);
    setAnswers((prev) => ({ ...prev, [q.id]: q.answer }));
    setNewQuestion("");
  };

  const handleDeleteQuestion = async (id: string) => {
    await api.questions.delete(id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative h-full bg-slate-900 border-l border-slate-700"
        style={{ width, maxWidth: "100vw" }}
      >
        {/* Ручка изменения ширины: перетаскивание, двойной клик — сброс на 640px. */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Изменить ширину панели"
          title="Перетащите, чтобы изменить ширину. Двойной клик — сброс"
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
          onDoubleClick={onResizeReset}
          className="absolute inset-y-0 left-0 z-20 w-1.5 -translate-x-1/2 cursor-col-resize touch-none hover:bg-blue-500/50"
        />

        <div className="h-full overflow-y-auto">
          <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">
                {ticket.projectPrefix}-{ticket.number}
              </span>
              {links
                .filter((l) => l.type === "duplicates" && l.direction === "out")
                .map((l) => (
                  <span
                    key={l.key}
                    className="inline-flex items-center rounded bg-orange-500/10 px-1.5 py-0.5 text-[11px] font-medium text-orange-400"
                  >
                    duplicate of {l.key}
                  </span>
                ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onDelete(ticket.id);
                  onClose();
                }}
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="px-4 py-3 space-y-3">
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                markDirty();
              }}
              className="w-full bg-transparent text-lg font-semibold text-white focus:outline-none"
            />

            <div>
              <SectionHeader title="Описание" />
              <div className="flex items-center gap-1 mb-1">
                <button
                  type="button"
                  onClick={() => setDescMode("write")}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                    descMode === "write"
                      ? "bg-slate-700 text-white"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Pencil className="w-3 h-3" />
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setDescMode("preview")}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                    descMode === "preview"
                      ? "bg-slate-700 text-white"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
              </div>
              {descMode === "write" ? (
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    markDirty();
                  }}
                  rows={8}
                  placeholder="Add a description (supports markdown)…"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y font-mono min-h-[10.5rem]"
                />
              ) : description ? (
                <div className="prose-card bg-slate-800/50 border border-slate-700 rounded-lg px-2.5 py-1.5 min-h-[10.5rem] overflow-y-auto">
                  <Markdown>{description}</Markdown>
                </div>
              ) : (
                <div
                  onClick={() => setDescMode("write")}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg px-2.5 py-1.5 min-h-[10.5rem] text-sm text-slate-600 cursor-text"
                >
                  Add a description…
                </div>
              )}
            </div>

            <div className={SECTION}>
              <SectionHeader
                title="Вопросы"
                count={questions.length}
                warning={unansweredCount > 0 ? `без ответа: ${unansweredCount}` : undefined}
              />
              <div className="space-y-2">
                {questions.map((q) => {
                  const unanswered = !q.answer.trim();
                  return (
                    <div
                      key={q.id}
                      className={`group rounded-lg border px-2.5 py-1.5 ${
                        unanswered
                          ? "border-amber-500/50 bg-amber-500/5"
                          : "border-slate-700 bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-sm text-slate-200 whitespace-pre-wrap">{q.text}</p>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        value={answers[q.id] ?? ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        onBlur={() => handleSaveAnswer(q.id)}
                        rows={2}
                        placeholder="Ваш ответ…"
                        className="mt-1.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                      />
                    </div>
                  );
                })}
              </div>
              <form onSubmit={handleAddQuestion} className="mt-2 flex gap-2">
                <input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Добавить вопрос…"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                >
                  Add
                </button>
              </form>
            </div>

            <div className={SECTION}>
              <SectionHeader title="Tags" count={tagList.length} />
              <div className="flex flex-wrap gap-1 mb-1">
                {tagList.map((name) => {
                  const label = labelFor(name);
                  return (
                    <span
                      key={name}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                        label?.color ? "" : "bg-blue-500/15 text-blue-300"
                      }`}
                      style={label?.color ? { backgroundColor: label.color + "1a", color: label.color } : undefined}
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => removeTag(name)}
                        aria-label={`Убрать тег ${name}`}
                        className="opacity-70 hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Добавить тег, Enter или запятая…"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className={SECTION}>
              <SectionHeader title="Свойства" />
              <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      markDirty();
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => {
                      setPriority(e.target.value);
                      markDirty();
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 capitalize"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      markDirty();
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Team
                  </label>
                  <select
                    value={teamId}
                    onChange={(e) => {
                      setTeamId(e.target.value);
                      markDirty();
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Project
                  </label>
                  <div className="text-sm text-slate-400 px-2.5 py-1.5">
                    {projects.find((p) => p.id === ticket.projectId)?.name || "—"}
                  </div>
                </div>
              </div>
            </div>

            {dirty && (
              <button
                onClick={handleSave}
                className="w-full px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                Save Changes
              </button>
            )}

            <div className={SECTION}>
              <SectionHeader title="Поля" />
              <div className="space-y-1">
                {Object.keys(fields)
                  .sort()
                  .map((name) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className="w-28 shrink-0 truncate text-sm text-slate-500" title={name}>
                        {name}
                      </span>
                      <input
                        value={fields[name]}
                        onChange={(e) => setFields((prev) => ({ ...prev, [name]: e.target.value }))}
                        onBlur={() => handleSaveField(name, fields[name])}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleSaveField(name, "")}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
              <form onSubmit={handleAddField} className="mt-2 flex gap-2">
                <input
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="Поле (например, class)"
                  className="w-40 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  value={newFieldValue}
                  onChange={(e) => setNewFieldValue(e.target.value)}
                  placeholder="Значение"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                >
                  Add
                </button>
              </form>
            </div>

            <div className={SECTION}>
              <SectionHeader title="Зависимости" />
              <div className="space-y-1">
                {blockedByKeys.map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-2.5 group px-2 py-1.5 rounded-md hover:bg-slate-800/50"
                  >
                    <span className="text-sm font-mono text-slate-300">{key}</span>
                    <span
                      className={`text-xs ${openBlockerKeys.includes(key) ? "text-red-400" : "text-green-500"}`}
                    >
                      {openBlockerKeys.includes(key) ? "блокирует" : "готово"}
                    </span>
                    <button
                      onClick={() => handleRemoveDependency(key)}
                      className="ml-auto opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {blockedByKeys.length === 0 && (
                  <div className="px-2 text-sm text-slate-600">Тикет ничем не заблокирован</div>
                )}
              </div>
              <form onSubmit={handleAddDependency} className="mt-2 flex gap-2">
                <input
                  value={newBlocker}
                  onChange={(e) => setNewBlocker(e.target.value)}
                  placeholder="Заблокирован тикетом (например, UE-80)"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                >
                  Add
                </button>
              </form>
              {depError && <p className="mt-1 text-xs text-red-400">{depError}</p>}
            </div>

            <div className={SECTION}>
              <SectionHeader title="Links" />
              <div className="space-y-1">
                {links.map((link) => (
                  <div
                    key={`${link.type}-${link.direction ?? ""}-${link.key}`}
                    className="flex items-center gap-2.5 group px-2 py-1.5 rounded-md hover:bg-slate-800/50"
                  >
                    <span className="text-xs text-slate-500">{linkLabel(link)}</span>
                    <span className="text-sm font-mono text-slate-300">{link.key}</span>
                    <button
                      onClick={() => handleRemoveLink(link)}
                      className="ml-auto opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {links.length === 0 && <div className="px-2 text-sm text-slate-600">No links</div>}
              </div>
              <form onSubmit={handleAddLink} className="mt-2 flex gap-2">
                <select
                  value={newLinkType}
                  onChange={(e) => setNewLinkType(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="relates_to">relates to</option>
                  <option value="duplicates">is a duplicate of</option>
                </select>
                <input
                  value={newLinkTarget}
                  onChange={(e) => setNewLinkTarget(e.target.value)}
                  placeholder="Ticket key (e.g. UE-80)"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                >
                  Add
                </button>
              </form>
              {linkError && <p className="mt-1 text-xs text-red-400">{linkError}</p>}
            </div>

            <div className={SECTION}>
              <SectionHeader
                title="Subtasks"
                count={subtasks.length > 0 ? `${subtasksDone}/${subtasks.length}` : undefined}
              />
              <div className="space-y-1">
                {subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-2.5 group px-2 py-1.5 rounded-md hover:bg-slate-800/50"
                  >
                    <button
                      onClick={() => handleToggleSubtask(sub.id)}
                      className="shrink-0"
                    >
                      {sub.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                    <span
                      className={`flex-1 text-sm ${
                        sub.completed
                          ? "text-slate-600 line-through"
                          : "text-slate-300"
                      }`}
                    >
                      {sub.title}
                    </span>
                    <button
                      onClick={() => handleDeleteSubtask(sub.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddSubtask} className="mt-2 flex gap-2">
                <input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Add subtask…"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                >
                  Add
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

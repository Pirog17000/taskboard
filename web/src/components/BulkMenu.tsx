import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Ticket } from "../api/client";
import { STATUSES, statusLabel, priorityLabel } from "../lib/statuses";
import { t } from "../lib/i18n";
import { allTags } from "../lib/tags";
import {
  PRIORITY_ORDER,
  bulkPatch,
  type BulkOp,
  type BulkPatch,
  type BulkSource,
  type BulkTarget,
} from "../lib/boardView";

interface BulkMenuProps {
  tickets: Ticket[]; // видимые на доске тикеты после фильтров (без живых карточек)
  allTickets: Ticket[];
  onClose: () => void;
  onDone: () => void; // вызывается после применения, чтобы доска перезагрузилась
}

type SourceKind = "tag" | "field";
type TargetKind = "status" | "priority" | "tag" | "field";

interface FormState {
  srcKind: SourceKind;
  srcTag: string;
  srcField: string;
  srcValue: string;
  tgtKind: TargetKind;
  tgtStatus: string;
  tgtPriority: string;
  tgtTag: string;
  tgtField: string;
  tgtValue: string;
  removeSource: boolean;
}

const SELECT_CLASS =
  "bg-slate-800 text-xs text-slate-300 rounded-md border border-slate-700 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500";
const INPUT_CLASS =
  "bg-slate-800 text-xs text-slate-300 placeholder:text-slate-600 rounded-md border border-slate-700 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500";
const PRESET_CLASS =
  "bg-slate-800 text-xs text-slate-300 rounded-md border border-slate-700 px-2 py-1 hover:border-slate-500 transition-colors";

function buildOp(f: FormState): BulkOp {
  const source: BulkSource =
    f.srcKind === "tag" ? { kind: "tag", tag: f.srcTag } : { kind: "field", name: f.srcField, value: f.srcValue };
  let target: BulkTarget;
  switch (f.tgtKind) {
    case "status":
      target = { kind: "status", status: f.tgtStatus };
      break;
    case "priority":
      target = { kind: "priority", priority: f.tgtPriority };
      break;
    case "tag":
      target = { kind: "tag", tag: f.tgtTag };
      break;
    default:
      target = { kind: "field", name: f.tgtField, value: f.tgtValue };
  }
  return { source, target, removeSource: f.removeSource };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

// Массовая конвертация: «Если источник → то цель» для видимых тикетов доски
export default function BulkMenu({ tickets, allTickets, onClose, onDone }: BulkMenuProps) {
  const tagOptions = useMemo(() => allTags(allTickets), [allTickets]);
  const fieldNames = useMemo(() => {
    const set = new Set<string>();
    allTickets.forEach((t) => Object.keys(t.fields || {}).forEach((n) => set.add(n)));
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allTickets]);

  const [form, setForm] = useState<FormState>(() => ({
    srcKind: "tag",
    srcTag: tagOptions[0] ?? "",
    srcField: "",
    srcValue: "",
    tgtKind: "priority",
    tgtStatus: "done",
    tgtPriority: "urgent",
    tgtTag: "",
    tgtField: "",
    tgtValue: "",
    removeSource: false,
  }));
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ changed: number; errors: number } | null>(null);

  // Escape закрывает окно, кроме времени применения
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !running) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, running]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const matching = useMemo(() => {
    const op = buildOp(form);
    return tickets
      .map((t) => ({ ticket: t, patch: bulkPatch(t, op) }))
      .filter((x): x is { ticket: Ticket; patch: BulkPatch } => x.patch !== null);
  }, [form, tickets]);

  const applyPresets = {
    tagToPriority: () => setForm((prev) => ({ ...prev, srcKind: "tag", tgtKind: "priority", tgtPriority: "urgent" })),
    fieldToStatus: () => setForm((prev) => ({ ...prev, srcKind: "field", tgtKind: "status", tgtStatus: "done" })),
    tagToField: () => setForm((prev) => ({ ...prev, srcKind: "tag", tgtKind: "field" })),
    fieldToTag: () => setForm((prev) => ({ ...prev, srcKind: "field", tgtKind: "tag" })),
  };

  const run = async () => {
    if (matching.length === 0 || running) return;
    if (!window.confirm(t("bulk.confirm", { count: matching.length }))) return;

    setRunning(true);
    setResult(null);
    setProgress(0);
    let errors = 0;
    for (let i = 0; i < matching.length; i++) {
      const { ticket, patch } = matching[i];
      try {
        if (patch.update) await api.tickets.update(ticket.id, patch.update);
        if (patch.fields) await api.tickets.setFields(ticket.id, patch.fields);
        if (patch.status) await api.tickets.move(ticket.id, patch.status);
      } catch {
        errors++;
      }
      setProgress(i + 1);
    }
    setRunning(false);
    setResult({ changed: matching.length - errors, errors });
    onDone();
  };

  const fieldListId = "bulk-field-names";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !running) onClose();
      }}
    >
      <div className="w-full max-w-lg space-y-4 rounded-lg border border-slate-700 bg-slate-900 p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">{t("bulk.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
          >
            {t("common.close")}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">{t("bulk.presets")}</span>
          <button type="button" onClick={applyPresets.tagToPriority} className={PRESET_CLASS}>
            {t("bulk.preset.tagToPriority")}
          </button>
          <button type="button" onClick={applyPresets.fieldToStatus} className={PRESET_CLASS}>
            {t("bulk.preset.fieldToStatus")}
          </button>
          <button type="button" onClick={applyPresets.tagToField} className={PRESET_CLASS}>
            {t("bulk.preset.tagToField")}
          </button>
          <button type="button" onClick={applyPresets.fieldToTag} className={PRESET_CLASS}>
            {t("bulk.preset.fieldToTag")}
          </button>
        </div>

        <Section title={t("bulk.which")}>
          <select
            value={form.srcKind}
            onChange={(e) => set("srcKind", e.target.value as SourceKind)}
            className={SELECT_CLASS}
          >
            <option value="tag">{t("bulk.src.tag")}</option>
            <option value="field">{t("bulk.src.field")}</option>
          </select>
          {form.srcKind === "tag" ? (
            <select value={form.srcTag} onChange={(e) => set("srcTag", e.target.value)} className={SELECT_CLASS}>
              <option value="">{t("bulk.pickTag")}</option>
              {tagOptions.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          ) : (
            <>
              <select
                value={form.srcField}
                onChange={(e) => set("srcField", e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">{t("bulk.pickField")}</option>
                {fieldNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <input
                value={form.srcValue}
                onChange={(e) => set("srcValue", e.target.value)}
                placeholder={t("bulk.anyValue")}
                className={`${INPUT_CLASS} w-36`}
              />
            </>
          )}
        </Section>

        <Section title={t("bulk.what")}>
          <select
            value={form.tgtKind}
            onChange={(e) => set("tgtKind", e.target.value as TargetKind)}
            className={SELECT_CLASS}
          >
            <option value="status">{t("bulk.tgt.status")}</option>
            <option value="priority">{t("bulk.tgt.priority")}</option>
            <option value="tag">{t("bulk.tgt.tag")}</option>
            <option value="field">{t("bulk.tgt.field")}</option>
          </select>
          {form.tgtKind === "status" && (
            <select value={form.tgtStatus} onChange={(e) => set("tgtStatus", e.target.value)} className={SELECT_CLASS}>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          )}
          {form.tgtKind === "priority" && (
            <select value={form.tgtPriority} onChange={(e) => set("tgtPriority", e.target.value)} className={SELECT_CLASS}>
              {PRIORITY_ORDER.map((priority) => (
                <option key={priority} value={priority}>
                  {priorityLabel(priority)}
                </option>
              ))}
            </select>
          )}
          {form.tgtKind === "tag" && (
            <input
              value={form.tgtTag}
              onChange={(e) => set("tgtTag", e.target.value)}
              placeholder={t("bulk.tagPlaceholder")}
              className={`${INPUT_CLASS} w-64`}
            />
          )}
          {form.tgtKind === "field" && (
            <>
              <input
                value={form.tgtField}
                onChange={(e) => set("tgtField", e.target.value)}
                placeholder={t("bulk.fieldPlaceholder")}
                list={fieldListId}
                className={`${INPUT_CLASS} w-32`}
              />
              <datalist id={fieldListId}>
                {fieldNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <input
                value={form.tgtValue}
                onChange={(e) => set("tgtValue", e.target.value)}
                placeholder={t("bulk.valuePlaceholder")}
                className={`${INPUT_CLASS} w-44`}
              />
            </>
          )}
        </Section>

        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={form.removeSource}
            onChange={(e) => set("removeSource", e.target.checked)}
            className="accent-blue-500"
          />
          {t("bulk.removeSource")}
        </label>

        <div className="rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-400">
          {t("bulk.matching", { count: matching.length, total: tickets.length })}
        </div>

        {running && (
          <div className="text-xs text-slate-400 tabular-nums">
            {t("bulk.progress", { done: progress, count: matching.length })}
          </div>
        )}
        {result && (
          <div className="text-xs text-slate-300 tabular-nums">
            {t("bulk.result", { changed: result.changed, errors: result.errors })}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={run}
            disabled={matching.length === 0 || running}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("bulk.apply", { count: matching.length })}
          </button>
        </div>
      </div>
    </div>
  );
}

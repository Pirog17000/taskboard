import { useEffect, useRef, type ReactNode } from "react";
import type { Team } from "../api/client";
import {
  DEFAULT_DISPLAY,
  SORT_KEYS,
  sortLabel,
  isFieldShown,
  type CardDisplay,
  type SortKey,
  type ViewFilters,
  type ViewSort,
} from "../lib/boardView";
import { t } from "../lib/i18n";
import { priorityLabel } from "../lib/statuses";

interface ViewMenuProps {
  filters: ViewFilters;
  onFiltersChange: (filters: ViewFilters) => void;
  sort: ViewSort;
  onSortChange: (sort: ViewSort) => void;
  display: CardDisplay;
  onDisplayChange: (display: CardDisplay) => void;
  teams: Team[];
  fieldNames: string[];
  // Быстрые фильтры доски (тег, класс, стадия) — рендерит Board, они живут в его состоянии
  quickFilters?: ReactNode;
  // Сбрасывает и фильтры меню, и быстрые фильтры
  onResetFilters: () => void;
  onClose: () => void;
}

export const SELECT_CLASS =
  "w-full bg-slate-800 text-xs text-slate-300 rounded-md border border-slate-700 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500";
const SECTION_TITLE = "text-[11px] font-semibold uppercase tracking-wide text-slate-500";

const PRIORITY_OPTIONS = ["urgent", "high", "medium", "low"];

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-center gap-2">
      <span className="text-xs text-slate-400">{label}</span>
      {children}
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-blue-500"
      />
      {children}
    </label>
  );
}

// Выпадающая панель вида. Рендерится внутри relative-контейнера, где лежит и кнопка-триггер.
export default function ViewMenu({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  display,
  onDisplayChange,
  teams,
  fieldNames,
  quickFilters,
  onResetFilters,
  onClose,
}: ViewMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Закрытие по клику вне контейнера (кнопка-триггер внутри контейнера, поэтому её клик не считается «вне») и по Esc
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const wrapper = panelRef.current?.parentElement;
      if (wrapper && !wrapper.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const setFilter = <K extends keyof ViewFilters>(key: K, value: ViewFilters[K]) =>
    onFiltersChange({ ...filters, [key]: value });

  return (
    <div
      ref={panelRef}
      className="fixed inset-x-2 top-14 z-40 max-h-[calc(100dvh-4.5rem)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1 sm:w-80 sm:max-h-[75vh] overflow-y-auto space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl"
    >
      <section className="space-y-2">
        <h3 className={SECTION_TITLE}>{t("view.onlyTickets")}</h3>
        {quickFilters}
        <Row label={t("view.priority")}>
          <select value={filters.priority} onChange={(e) => setFilter("priority", e.target.value)} className={SELECT_CLASS}>
            <option value="">{t("view.anyPriority")}</option>
            {PRIORITY_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {priorityLabel(value)}
              </option>
            ))}
          </select>
        </Row>
        <Row label={t("view.questions")}>
          <select
            value={filters.questions}
            onChange={(e) => setFilter("questions", e.target.value as ViewFilters["questions"])}
            className={SELECT_CLASS}
          >
            <option value="">{t("view.any")}</option>
            <option value="open">{t("view.questions.open")}</option>
            <option value="none">{t("view.questions.none")}</option>
          </select>
        </Row>
        <Row label={t("view.blocked")}>
          <select
            value={filters.blocked}
            onChange={(e) => setFilter("blocked", e.target.value as ViewFilters["blocked"])}
            className={SELECT_CLASS}
          >
            <option value="">{t("view.any")}</option>
            <option value="blocked">{t("view.blocked.blocked")}</option>
            <option value="free">{t("view.blocked.free")}</option>
          </select>
        </Row>
        <Row label={t("view.due")}>
          <select
            value={filters.due}
            onChange={(e) => setFilter("due", e.target.value as ViewFilters["due"])}
            className={SELECT_CLASS}
          >
            <option value="">{t("view.any")}</option>
            <option value="overdue">{t("view.due.overdue")}</option>
            <option value="has">{t("view.due.has")}</option>
            <option value="none">{t("view.due.none")}</option>
          </select>
        </Row>
        <Row label={t("view.team")}>
          <select value={filters.team} onChange={(e) => setFilter("team", e.target.value)} className={SELECT_CLASS}>
            <option value="">{t("view.anyTeam")}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </Row>
        <Row label={t("view.subtasks")}>
          <select
            value={filters.subtasks}
            onChange={(e) => setFilter("subtasks", e.target.value as ViewFilters["subtasks"])}
            className={SELECT_CLASS}
          >
            <option value="">{t("view.any")}</option>
            <option value="open">{t("view.subtasks.open")}</option>
            <option value="none">{t("view.subtasks.none")}</option>
          </select>
        </Row>
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {t("view.resetFilters")}
        </button>
      </section>

      <section className="space-y-2 border-t border-slate-800 pt-3">
        <h3 className={SECTION_TITLE}>{t("view.sortTitle")}</h3>
        <Row label={t("view.sortBy")}>
          <select
            value={sort.key}
            onChange={(e) => onSortChange({ ...sort, key: e.target.value as SortKey })}
            className={SELECT_CLASS}
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {sortLabel(key)}
              </option>
            ))}
          </select>
        </Row>
        <Check checked={sort.desc} onChange={(desc) => onSortChange({ ...sort, desc })}>
          {t("view.reverse")}
        </Check>
      </section>

      <section className="space-y-2 border-t border-slate-800 pt-3">
        <h3 className={SECTION_TITLE}>{t("view.cardTitle")}</h3>
        <Check checked={display.showTags} onChange={(showTags) => onDisplayChange({ ...display, showTags })}>
          {t("view.tags")}
        </Check>
        {fieldNames.length === 0 ? (
          <p className="text-xs text-slate-600">{t("view.noFields")}</p>
        ) : (
          <div className="space-y-1.5">
            {fieldNames.map((name) => (
              <Check
                key={name}
                checked={isFieldShown(name, display)}
                onChange={(checked) =>
                  onDisplayChange({ ...display, fields: { ...display.fields, [name]: checked } })
                }
              >
                <span className="truncate" title={name}>
                  {name}
                </span>
              </Check>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => onDisplayChange(DEFAULT_DISPLAY)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {t("view.resetDisplay")}
        </button>
      </section>
    </div>
  );
}

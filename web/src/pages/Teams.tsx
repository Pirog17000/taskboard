import { useEffect, useState } from "react";
import { Plus, Trash2, X, Users } from "lucide-react";
import { api, type Team } from "../api/client";
import { t, formatDate } from "../lib/i18n";

const TEAM_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#eab308",
  "#ef4444",
  "#06b6d4",
];

function TeamModal({
  team,
  onClose,
  onSave,
}: {
  team?: Team;
  onClose: () => void;
  onSave: (data: Partial<Team>) => void;
}) {
  const isEdit = !!team;
  const [name, setName] = useState(team?.name || "");
  const [color, setColor] = useState(team?.color || TEAM_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name, color });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? t("pages.teams.editTitle") : t("pages.teams.newTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              {t("pages.teams.name")}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("pages.teams.namePlaceholder")}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              {t("pages.color")}
            </label>
            <div className="flex gap-2">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    color === c
                      ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            {isEdit ? t("pages.saveChanges") : t("pages.teams.create")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api.teams.list();
      setTeams(data || []);
    } catch {
      setTeams([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (data: Partial<Team>) => {
    await api.teams.create(data);
    setShowCreate(false);
    load();
  };

  const handleUpdate = async (data: Partial<Team>) => {
    if (!editTeam) return;
    await api.teams.update(editTeam.id, data);
    setEditTeam(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.teams.delete(id);
    load();
  };

  return (
    <div className="h-full flex flex-col">
      <header className="shrink-0 flex items-center justify-between px-6 h-14 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-white">{t("pages.teams.title")}</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("pages.teams.new")}
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-600">
            {t("pages.teams.loading")}
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-600 space-y-3">
            <Users className="w-10 h-10 text-slate-700" />
            <p className="text-sm">{t("pages.teams.empty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {teams.map((team) => (
              <div
                key={team.id}
                onClick={() => setEditTeam(team)}
                className="group relative bg-slate-900 border border-slate-700/50 hover:border-slate-600 rounded-xl p-5 transition-colors cursor-pointer"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
                  style={{ backgroundColor: team.color }}
                />
                <div className="flex items-start justify-between">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: team.color + "33" }}
                  >
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(team.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-white">
                  {team.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {t("pages.teams.created", { date: formatDate(team.createdAt) })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <TeamModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}

      {editTeam && (
        <TeamModal
          team={editTeam}
          onClose={() => setEditTeam(null)}
          onSave={handleUpdate}
        />
      )}
    </div>
  );
}

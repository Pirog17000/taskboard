import { Check } from "lucide-react";
import { LANGUAGES, setLang, t, useLang } from "../lib/i18n";

// Настройки интерфейса. Пока здесь только язык; настройки хранятся в браузере.
export default function Settings() {
  const lang = useLang();

  return (
    <div className="h-full flex flex-col">
      <header className="shrink-0 flex items-center px-3 sm:px-6 h-14 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-white">{t("settings.title")}</h1>
      </header>

      <div className="p-3 sm:p-6 max-w-xl space-y-6">
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-medium text-slate-200">{t("settings.language")}</h2>
            <p className="text-xs text-slate-500">{t("settings.languageHint")}</p>
          </div>
          <div role="radiogroup" aria-label={t("settings.language")} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LANGUAGES.map((l) => {
              const active = l.code === lang;
              return (
                <button
                  key={l.code}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  lang={l.code}
                  onClick={() => setLang(l.code)}
                  className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    active
                      ? "border-blue-500/60 bg-blue-500/10 text-blue-300"
                      : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {l.name}
                  {active && <Check className="w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

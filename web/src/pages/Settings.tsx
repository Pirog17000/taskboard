import { useEffect, useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { api, type AppInfo } from "../api/client";
import { LANGUAGES, setLang, t, useLang } from "../lib/i18n";

// Настройки интерфейса и сведения о программе. Язык хранится в браузере, версия и ссылка приходят с сервера.
export default function Settings() {
  const lang = useLang();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [infoFailed, setInfoFailed] = useState(false);

  useEffect(() => {
    api.info().then(setInfo, () => setInfoFailed(true));
  }, []);

  return (
    <div className="h-full flex flex-col">
      <header className="shrink-0 flex items-center px-3 sm:px-6 h-14 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-white">{t("settings.title")}</h1>
      </header>

      <div className="p-3 sm:p-6 max-w-xl space-y-8">
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

        <section className="space-y-3 border-t border-slate-800 pt-6">
          <h2 className="text-sm font-medium text-slate-200">{t("settings.about")}</h2>
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="" className="w-10 h-10 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">Taskboard</div>
              <div className="text-xs text-slate-400 tabular-nums">
                {t("settings.version")}{" "}
                {info ? info.version : infoFailed ? t("settings.versionUnknown") : "…"}
              </div>
            </div>
          </div>
          {info && (
            <a
              href={info.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:border-slate-500 hover:text-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" className="w-4 h-4 shrink-0 fill-current">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              <span className="truncate">{t("settings.source")}</span>
              <span className="hidden sm:inline truncate text-slate-500">{info.repo.replace(/^https:\/\//, "")}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            </a>
          )}
        </section>
      </div>
    </div>
  );
}

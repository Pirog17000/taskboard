import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Ticket,
  Zap,
  TerminalSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import TerminalPanel from "./TerminalPanel";

const navItems = [
  // По частоте использования: доска и список тикетов — каждый день, проекты и команды — при настройке.
  { to: "/", icon: LayoutDashboard, label: "Доска" },
  { to: "/tickets", icon: Ticket, label: "Список тикетов" },
  { to: "/projects", icon: FolderKanban, label: "Проекты" },
  { to: "/teams", icon: Users, label: "Команды" },
];

// Ключ localStorage, в котором хранится свёрнутость боковой панели между сессиями.
const SIDEBAR_KEY = "taskboard.sidebarCollapsed";
const NARROW_QUERY = "(max-width: 767px)";

export default function Layout() {
  const [terminalOpen, setTerminalOpen] = useState(false);
  // Свёрнутость на широком экране запоминается между сессиями
  const [wideCollapsed, setWideCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === "1",
  );
  // На узком экране (телефон) меню всегда свёрнуто в полоску иконок и раскрывается поверх доски
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, wideCollapsed ? "1" : "0");
  }, [wideCollapsed]);

  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const onChange = () => {
      setNarrow(mq.matches);
      setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const overlay = narrow && mobileOpen;
  const collapsed = narrow ? !mobileOpen : wideCollapsed;
  const toggleSidebar = () => (narrow ? setMobileOpen((v) => !v) : setWideCollapsed((v) => !v));
  const closeOverlay = () => setMobileOpen(false);

  const itemClass = (active: boolean) =>
    `flex items-center gap-2.5 py-2 rounded-md text-sm transition-colors ${
      collapsed ? "justify-center px-0" : "px-2.5"
    } ${
      active
        ? "bg-blue-500/15 text-blue-400"
        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
    }`;

  return (
    <div className="flex h-dvh overflow-hidden">
      {overlay && (
        <>
          {/* Место полоски иконок, пока меню раскрыто поверх доски, и затемнение для закрытия по тапу */}
          <div className="w-14 shrink-0 bg-slate-900 border-r border-slate-800" />
          <div className="fixed inset-0 z-40 bg-black/50" onClick={closeOverlay} />
        </>
      )}
      <aside
        className={`${
          overlay ? "fixed inset-y-0 left-0 z-50 w-56 shadow-2xl" : collapsed ? "w-14" : "w-56"
        } shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col transition-[width] duration-150`}
      >
        <div
          className={`h-14 flex items-center gap-2.5 border-b border-slate-800 ${
            collapsed ? "justify-center px-0" : "px-5"
          }`}
        >
          {!collapsed && (
            <>
              <Zap className="w-5 h-5 text-blue-400" />
              <span className="flex-1 text-sm font-semibold tracking-wide text-white">
                Taskboard
              </span>
            </>
          )}
          <button
            onClick={toggleSidebar}
            title={collapsed ? "Развернуть меню" : "Свернуть меню"}
            aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 py-3 px-2.5 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              title={collapsed ? item.label : undefined}
              onClick={closeOverlay}
              className={({ isActive }) => itemClass(isActive)}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-2.5 pb-2">
          <button
            onClick={() => {
              closeOverlay();
              setTerminalOpen((v) => !v);
            }}
            title="Открыть или закрыть терминал внизу экрана"
            className={`${itemClass(terminalOpen)} w-full`}
          >
            <TerminalSquare className="w-4 h-4 shrink-0" />
            {!collapsed && "Терминал"}
          </button>
        </div>

        {!collapsed && (
          <div className="px-5 py-3 border-t border-slate-800">
            <p className="text-[10px] text-slate-600 tracking-wider uppercase">
              Версия 0.6.0
            </p>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto bg-slate-950">
          <Outlet />
        </main>
        <TerminalPanel
          isOpen={terminalOpen}
          onClose={() => setTerminalOpen(false)}
        />
      </div>
    </div>
  );
}

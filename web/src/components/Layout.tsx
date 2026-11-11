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
  { to: "/", icon: LayoutDashboard, label: "Board" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/teams", icon: Users, label: "Teams" },
  { to: "/tickets", icon: Ticket, label: "Tickets" },
];

// Ключ localStorage, в котором хранится свёрнутость боковой панели между сессиями.
const SIDEBAR_KEY = "taskboard.sidebarCollapsed";

export default function Layout() {
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === "1",
  );

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const itemClass = (active: boolean) =>
    `flex items-center gap-2.5 py-2 rounded-md text-sm transition-colors ${
      collapsed ? "justify-center px-0" : "px-2.5"
    } ${
      active
        ? "bg-blue-500/15 text-blue-400"
        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
    }`;

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={`${
          collapsed ? "w-14" : "w-56"
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
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
              className={({ isActive }) => itemClass(isActive)}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-2.5 pb-2">
          <button
            onClick={() => setTerminalOpen((v) => !v)}
            title={collapsed ? "Terminal" : undefined}
            className={`${itemClass(terminalOpen)} w-full`}
          >
            <TerminalSquare className="w-4 h-4 shrink-0" />
            {!collapsed && "Terminal"}
          </button>
        </div>

        {!collapsed && (
          <div className="px-5 py-3 border-t border-slate-800">
            <p className="text-[10px] text-slate-600 tracking-wider uppercase">
              v0.6.0
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

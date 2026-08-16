import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  BarChart3,
  ClipboardList,
  HeartPulse,
  BookOpen,
  Wallet,
  Settings as SettingsIcon,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
} from "lucide-react";
import { LogoMark } from "./LogoMark";

interface CategoryDef {
  key: string;
  label: string;
  icon: typeof BarChart3;
  rootPath: string;
  items: { to: string; label: string }[];
}

const CATEGORIES: CategoryDef[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: BarChart3,
    rootPath: "/",
    items: [],
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: BarChart3,
    rootPath: "/analytics",
    items: [
      { to: "/analytics", label: "Analytics" },
      { to: "/goals", label: "Goals" },
      { to: "/projects", label: "Projects" },
    ],
  },
  {
    key: "logs",
    label: "Logs",
    icon: ClipboardList,
    rootPath: "/category/logs",
    items: [
      { to: "/today", label: "Today" },
      { to: "/tasks", label: "Tasks" },
      { to: "/habits", label: "Habits" },
      { to: "/journal", label: "Journal" },
      { to: "/reviews", label: "Reviews" },
    ],
  },
  {
    key: "athletics",
    label: "Athletics",
    icon: HeartPulse,
    rootPath: "/category/athletics",
    items: [
      { to: "/health", label: "Health" },
      { to: "/nutrition", label: "Nutrition" },
    ],
  },
  {
    key: "knowledge",
    label: "Knowledge",
    icon: BookOpen,
    rootPath: "/knowledge",
    items: [
      { to: "/knowledge/books", label: "Books" },
      { to: "/knowledge/media", label: "Media" },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    icon: Wallet,
    rootPath: "/finance",
    items: [{ to: "/finance", label: "Transactions" }],
  },
];

function categoryForPath(path: string): string | null {
  for (const cat of CATEGORIES) {
    if (cat.rootPath === path) return cat.key;
    if (cat.items.some((i) => path.startsWith(i.to.split("?")[0]) && i.to !== "/")) return cat.key;
    if (path === "/" && cat.rootPath === "/") return cat.key;
    if ((path.startsWith("/health") || path.startsWith("/nutrition")) && cat.key === "athletics") return cat.key;
  }
  if (path.startsWith("/day/")) return "logs";
  return null;
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeCategory = categoryForPath(location.pathname);
  const [expanded, setExpanded] = useState<string | null>(activeCategory);

  useEffect(() => {
    if (activeCategory) setExpanded(activeCategory);
  }, [activeCategory]);

  function handleCategoryClick(cat: CategoryDef) {
    if (collapsed) {
      navigate(cat.rootPath);
      return;
    }
    setExpanded((cur) => (cur === cat.key ? null : cat.key));
    navigate(cat.rootPath);
  }

  return (
    <aside
      className={clsx(
        "shrink-0 border-r border-border bg-surface flex flex-col h-full transition-all duration-150",
        collapsed ? "w-14" : "w-60"
      )}
    >
      <div className="px-3 py-4 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2 px-1">
            <LogoMark size={20} />
            <span className="text-sm font-semibold tracking-wide text-ink">LifeOS</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="text-ink-faint hover:text-ink p-1.5 rounded-md hover:bg-surface-raised ml-auto"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;
          const isExpanded = expanded === cat.key && !collapsed;
          return (
            <div key={cat.key}>
              <button
                onClick={() => handleCategoryClick(cat)}
                title={collapsed ? cat.label : undefined}
                className={clsx(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-accent-muted text-accent font-medium"
                    : "text-ink-muted hover:bg-surface-raised hover:text-ink"
                )}
              >
                <Icon size={16} strokeWidth={2} />
                {!collapsed && <span className="flex-1 text-left">{cat.label}</span>}
                {!collapsed && cat.items.length > 0 && (
                  <ChevronDown size={13} className={clsx("transition-transform", isExpanded && "rotate-180")} />
                )}
              </button>
              {cat.items.length > 0 && isExpanded && (
                <div className="ml-6 mt-0.5 mb-1 space-y-0.5 border-l border-border pl-2">
                  {cat.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      className={({ isActive: itemActive }) =>
                        clsx(
                          "block px-2.5 py-1.5 rounded-md text-xs transition-colors",
                          itemActive
                            ? "text-accent font-medium bg-accent-muted"
                            : "text-ink-muted hover:text-ink hover:bg-surface-raised"
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-2 py-2 border-t border-border space-y-0.5">
        <NavLink
          to="/settings"
          title={collapsed ? "Settings" : undefined}
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
              collapsed && "justify-center px-0",
              isActive ? "bg-accent-muted text-accent font-medium" : "text-ink-muted hover:bg-surface-raised hover:text-ink"
            )
          }
        >
          <SettingsIcon size={16} strokeWidth={2} />
          {!collapsed && "Settings"}
        </NavLink>
        <NavLink
          to="/guide"
          title={collapsed ? "Guide" : undefined}
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
              collapsed && "justify-center px-0",
              isActive ? "bg-accent-muted text-accent font-medium" : "text-ink-muted hover:bg-surface-raised hover:text-ink"
            )
          }
        >
          <HelpCircle size={16} strokeWidth={2} />
          {!collapsed && "Guide"}
        </NavLink>
      </div>
    </aside>
  );
}

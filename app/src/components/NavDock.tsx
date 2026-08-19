import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HelpCircle, Settings as SettingsIcon } from "lucide-react";
import { CATEGORIES, categoryForPath } from "./Sidebar";

export function NavDock() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeCategory = categoryForPath(location.pathname);
  const [openFlyout, setOpenFlyout] = useState<string | null>(null);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-end gap-1 bg-surface/90 backdrop-blur-md border border-border rounded-2xl px-3 py-2 shadow-lg">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;
          const hasSubItems = cat.items.length > 0;
          return (
            <div
              key={cat.key}
              className="relative"
              onMouseEnter={() => hasSubItems && setOpenFlyout(cat.key)}
              onMouseLeave={() => setOpenFlyout(null)}
            >
              {openFlyout === cat.key && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                  {cat.items.map((item) => (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => { navigate(item.to); setOpenFlyout(null); }}
                      className="block w-full text-left px-3 py-1.5 text-sm text-ink-muted hover:text-ink hover:bg-surface-raised whitespace-nowrap"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!hasSubItems) {
                    navigate(cat.rootPath);
                  } else if (openFlyout === cat.key) {
                    navigate(cat.items[0].to);
                    setOpenFlyout(null);
                  } else {
                    setOpenFlyout(cat.key);
                  }
                }}
                className={`group relative flex flex-col items-center justify-center w-11 h-11 rounded-xl transition-all duration-150 ease-out hover:scale-125 hover:-translate-y-1.5 ${
                  isActive ? "bg-accent-muted text-accent" : "text-ink-muted hover:text-ink"
                }`}
                title={cat.label}
                aria-label={cat.label}
              >
                <Icon size={20} />
              </button>
            </div>
          );
        })}
        <div className="w-px h-8 bg-border mx-1 self-center" />
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl transition-all duration-150 ease-out hover:scale-125 hover:-translate-y-1.5 ${
            location.pathname === "/settings" ? "bg-accent-muted text-accent" : "text-ink-muted hover:text-ink"
          }`}
          title="Settings"
          aria-label="Settings"
        >
          <SettingsIcon size={20} />
        </button>
        <button
          type="button"
          onClick={() => navigate("/guide")}
          className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl transition-all duration-150 ease-out hover:scale-125 hover:-translate-y-1.5 ${
            location.pathname === "/guide" ? "bg-accent-muted text-accent" : "text-ink-muted hover:text-ink"
          }`}
          title="Guide"
          aria-label="Guide"
        >
          <HelpCircle size={20} />
        </button>
      </div>
    </div>
  );
}

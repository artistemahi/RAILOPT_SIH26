import { useState, type ReactNode } from "react";
import { Sidebar, type NavView } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  pageName: string;
  notice?: string;
  onDismissNotice?: () => void;
  children: ReactNode;
}

export function AppShell({
  currentView,
  onSelectView,
  pageName,
  notice,
  onDismissNotice,
  children,
}: AppShellProps) {
  const [searchQ, setSearchQ] = useState("");

  return (
    <div className="rail-app-shell">
      <Sidebar
        currentView={currentView}
        onSelectView={(v) => {
          onSelectView(v);
        }}
      />
      <div className="rail-workspace-column">
        <TopBar
          pageName={pageName}
          searchQuery={searchQ}
          onSearchChange={setSearchQ}
        />
        {notice && (
          <div className="rail-operational-toast">
            <div className="toast-content">
              <span className="toast-icon">✓</span>
              <span className="toast-message">{notice}</span>
            </div>
            {onDismissNotice && (
              <button
                type="button"
                className="toast-dismiss"
                onClick={onDismissNotice}
                title="Dismiss notice"
              >
                ✕
              </button>
            )}
          </div>
        )}
        <main className="rail-main-content">{children}</main>
      </div>
    </div>
  );
}

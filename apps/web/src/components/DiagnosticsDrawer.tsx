import { useState } from "react";

type Diagnostics = Record<string, unknown>;

type DiagnosticsDrawerProps = {
  diagnostics: Diagnostics;
};

export default function DiagnosticsDrawer({
  diagnostics,
}: DiagnosticsDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <aside className={`diagnostics ${open ? "diagnostics-open" : ""}`}>
      <button
        type="button"
        className="diagnostics-toggle"
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? "Hide diagnostics" : "Show diagnostics"}
      </button>
      {open ? (
        <div className="diagnostics-body">
          <h2>Telegram WebApp Diagnostics</h2>
          <pre>{JSON.stringify(diagnostics, null, 2)}</pre>
        </div>
      ) : null}
    </aside>
  );
}

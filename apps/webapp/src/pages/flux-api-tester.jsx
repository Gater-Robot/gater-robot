import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Fonts ───────────────────────────────────────────────────────────────────
const FONT_LINK = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700&display=swap";

// ─── Constants ───────────────────────────────────────────────────────────────
const GITHUB_API = "https://api.github.com";
const DEBOUNCE_MS = 800;
const PER_PAGE = 100;
const DB_NAME = "flux-cache";
const DB_VERSION = 1;
const STORE_NAME = "responses";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

// ─── Color Palette ───────────────────────────────────────────────────────────
const C = {
  bg: "#080c14",
  surface: "#0d1420",
  surfaceAlt: "#111927",
  border: "#1a2538",
  borderFocus: "#2dd4bf",
  text: "#e2e8f0",
  textDim: "#64748b",
  textMuted: "#3b4963",
  accent: "#2dd4bf",
  accentDim: "rgba(45,212,191,0.15)",
  accentGlow: "rgba(45,212,191,0.3)",
  error: "#f87171",
  errorDim: "rgba(248,113,113,0.12)",
  warning: "#fbbf24",
  warningDim: "rgba(251,191,36,0.12)",
  success: "#34d399",
  successDim: "rgba(52,211,153,0.12)",
};

// ─── Parse repo input ────────────────────────────────────────────────────────
function parseRepoInput(input) {
  if (!input || !input.trim()) return null;
  const s = input.trim().replace(/\/$/, "");

  // Full GitHub URL: https://github.com/owner/repo[/anything] (with or without protocol)
  const urlMatch = s.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)/
  );
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };

  // owner/repo format
  const slashMatch = s.match(/^([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)$/);
  if (slashMatch) return { owner: slashMatch[1], repo: slashMatch[2] };

  return null;
}

// ─── Cache Manager (IndexedDB → memory fallback) ─────────────────────────────
const CacheManager = (() => {
  let db = null;
  let ready = false;
  let useFallback = false;
  const mem = new Map();

  async function init() {
    if (ready) return;
    try {
      if (typeof indexedDB === "undefined") throw new Error("No IndexedDB");
      db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const d = req.result;
          if (!d.objectStoreNames.contains(STORE_NAME)) {
            d.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      ready = true;
    } catch {
      useFallback = true;
      ready = true;
    }
  }

  async function get(key) {
    await init();
    if (useFallback) {
      const item = mem.get(key);
      if (!item) return null;
      if (Date.now() - item.ts > CACHE_TTL_MS) {
        mem.delete(key);
        return null;
      }
      return item.value;
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          const item = req.result;
          if (!item) return resolve(null);
          if (Date.now() - item.ts > CACHE_TTL_MS) {
            resolve(null);
            return;
          }
          resolve(item.value);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async function set(key, value) {
    await init();
    const item = { value, ts: Date.now() };
    if (useFallback) {
      mem.set(key, item);
      return;
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put(item, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        mem.set(key, item);
        resolve();
      }
    });
  }

  function getBackend() {
    return useFallback ? "memory" : "IndexedDB";
  }

  return { get, set, init, getBackend };
})();

// ─── GitHub API Fetcher ──────────────────────────────────────────────────────
async function fetchAllMergedPRs(owner, repo, token, onProgress) {
  const headers = { Accept: "application/vnd.github.v3+json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let page = 1;
  let allPRs = [];
  let rateLimit = null;

  while (true) {
    onProgress?.({
      type: "fetching",
      page,
      accumulated: allPRs.length,
    });

    const url = `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=closed&sort=created&direction=asc&per_page=${PER_PAGE}&page=${page}`;
    const res = await fetch(url, { headers });

    // Capture rate limit info
    rateLimit = {
      limit: res.headers.get("X-RateLimit-Limit"),
      remaining: res.headers.get("X-RateLimit-Remaining"),
      reset: res.headers.get("X-RateLimit-Reset"),
    };

    if (res.status === 403 && rateLimit.remaining === "0") {
      const resetDate = new Date(parseInt(rateLimit.reset) * 1000);
      throw {
        type: "rate_limit",
        message: `Rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}.`,
        rateLimit,
      };
    }

    if (res.status === 404) {
      throw {
        type: "not_found",
        message: `Repository ${owner}/${repo} not found or is private.`,
      };
    }

    if (!res.ok) {
      const body = await res.text();
      throw {
        type: "api_error",
        message: `GitHub API returned ${res.status}: ${body}`,
        status: res.status,
      };
    }

    const data = await res.json();

    // Filter to only merged PRs
    const merged = data.filter((pr) => pr.merged_at !== null);
    allPRs = allPRs.concat(merged);

    onProgress?.({
      type: "page_done",
      page,
      newMerged: merged.length,
      newTotal: data.length,
      accumulated: allPRs.length,
      rateLimit,
    });

    // Check if there are more pages
    const linkHeader = res.headers.get("Link");
    if (!linkHeader || !linkHeader.includes('rel="next"')) break;

    page++;

    // Small delay to be polite
    await new Promise((r) => setTimeout(r, 150));
  }

  return { pullRequests: allPRs, rateLimit, pages: page };
}

async function validateRepo(owner, repo, token) {
  const headers = { Accept: "application/vnd.github.v3+json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers });

  const rateLimit = {
    limit: res.headers.get("X-RateLimit-Limit"),
    remaining: res.headers.get("X-RateLimit-Remaining"),
    reset: res.headers.get("X-RateLimit-Reset"),
  };

  if (res.status === 404) return { valid: false, rateLimit, reason: "not_found" };
  if (res.status === 403) return { valid: false, rateLimit, reason: "rate_limit" };
  if (!res.ok) return { valid: false, rateLimit, reason: "error" };

  const data = await res.json();
  return {
    valid: true,
    rateLimit,
    repoInfo: {
      name: data.full_name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      defaultBranch: data.default_branch,
      openIssues: data.open_issues_count,
      language: data.language,
    },
  };
}

// ─── Summarize PR data ──────────────────────────────────────────────────────
function summarizePRData(pullRequests) {
  if (!pullRequests || pullRequests.length === 0) return null;

  const branches = {};
  const baseBranches = {};
  let totalLifetimeMs = 0;
  let minDate = Infinity;
  let maxDate = -Infinity;

  for (const pr of pullRequests) {
    const branch = pr.head?.ref || "unknown";
    const base = pr.base?.ref || "unknown";

    branches[branch] = (branches[branch] || 0) + 1;
    baseBranches[base] = (baseBranches[base] || 0) + 1;

    const created = new Date(pr.created_at).getTime();
    const merged = new Date(pr.merged_at).getTime();
    totalLifetimeMs += merged - created;

    if (created < minDate) minDate = created;
    if (merged > maxDate) maxDate = merged;
  }

  const avgLifetimeMs = totalLifetimeMs / pullRequests.length;
  const sortedBranches = Object.entries(branches)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const lifetimes = pullRequests.map((pr) => {
    const ms = new Date(pr.merged_at) - new Date(pr.created_at);
    return ms;
  });
  lifetimes.sort((a, b) => a - b);
  const medianLifetimeMs = lifetimes[Math.floor(lifetimes.length / 2)];

  return {
    totalMergedPRs: pullRequests.length,
    uniqueBranches: Object.keys(branches).length,
    uniqueBaseBranches: Object.keys(baseBranches).length,
    baseBranchBreakdown: baseBranches,
    topBranches: sortedBranches,
    dateRange: {
      earliest: new Date(minDate).toISOString(),
      latest: new Date(maxDate).toISOString(),
      spanDays: Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24)),
    },
    avgLifetime: formatDuration(avgLifetimeMs),
    medianLifetime: formatDuration(medianLifetimeMs),
  };
}

function formatDuration(ms) {
  if (ms < 1000 * 60) return `${Math.round(ms / 1000)}s`;
  if (ms < 1000 * 60 * 60) return `${Math.round(ms / (1000 * 60))}m`;
  if (ms < 1000 * 60 * 60 * 24) return `${(ms / (1000 * 60 * 60)).toFixed(1)}h`;
  if (ms < 1000 * 60 * 60 * 24 * 30) return `${(ms / (1000 * 60 * 60 * 24)).toFixed(1)}d`;
  return `${(ms / (1000 * 60 * 60 * 24 * 30)).toFixed(1)}mo`;
}

// ─── Status Dot animation ────────────────────────────────────────────────────
function PulseDot({ color = C.accent, size = 8 }) {
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size * 2.5, height: size * 2.5 }}>
      <span
        className="absolute rounded-full animate-ping"
        style={{ width: size * 2, height: size * 2, backgroundColor: color, opacity: 0.3 }}
      />
      <span className="relative rounded-full" style={{ width: size, height: size, backgroundColor: color }} />
    </span>
  );
}

// ─── Loading dots ────────────────────────────────────────────────────────────
function LoadingDots() {
  return (
    <span className="inline-flex gap-1 items-center ml-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="rounded-full"
          style={{
            width: 4,
            height: 4,
            backgroundColor: C.accent,
            animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

// ─── Stat Pill ───────────────────────────────────────────────────────────────
function StatPill({ label, value, color = C.accent }) {
  return (
    <div
      className="flex flex-col gap-1 px-4 py-3 rounded-lg"
      style={{ backgroundColor: `${color}10`, border: `1px solid ${color}20` }}
    >
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 600, color }}>{value}</span>
      <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: C.textDim, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
    </div>
  );
}

// ─── Connectivity Diagnostic ─────────────────────────────────────────────────
function ConnectivityDiagnostic() {
  const [tests, setTests] = useState([]);
  const [running, setRunning] = useState(false);

  const runTests = async () => {
    setRunning(true);
    setTests([]);
    const results = [];

    const addResult = (test) => {
      results.push(test);
      setTests([...results]);
    };

    // Test 1: Basic fetch capability
    addResult({ name: "Fetch API available", status: "running" });
    try {
      if (typeof fetch === "function") {
        results[results.length - 1] = { name: "Fetch API available", status: "pass", detail: "fetch() exists" };
      } else {
        results[results.length - 1] = { name: "Fetch API available", status: "fail", detail: "fetch() not found" };
      }
    } catch (e) {
      results[results.length - 1] = { name: "Fetch API available", status: "fail", detail: e.message };
    }
    setTests([...results]);

    // Test 2: General internet (httpbin)
    addResult({ name: "Internet connectivity", status: "running" });
    try {
      const res = await fetch("https://httpbin.org/get", { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        results[results.length - 1] = { name: "Internet connectivity", status: "pass", detail: `httpbin.org → ${res.status}` };
      } else {
        results[results.length - 1] = { name: "Internet connectivity", status: "warn", detail: `httpbin.org → ${res.status}` };
      }
    } catch (e) {
      results[results.length - 1] = { name: "Internet connectivity", status: "fail", detail: `httpbin.org → ${e.message}` };
    }
    setTests([...results]);

    // Test 3: GitHub API reachable
    addResult({ name: "GitHub API reachable", status: "running" });
    try {
      const res = await fetch("https://api.github.com/", { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        results[results.length - 1] = {
          name: "GitHub API reachable",
          status: "pass",
          detail: `api.github.com → ${res.status}`,
        };
      } else {
        results[results.length - 1] = {
          name: "GitHub API reachable",
          status: res.status === 403 ? "warn" : "fail",
          detail: `api.github.com → ${res.status} (${res.status === 403 ? "rate limited" : "error"})`,
        };
      }
    } catch (e) {
      results[results.length - 1] = { name: "GitHub API reachable", status: "fail", detail: `api.github.com → ${e.message}` };
    }
    setTests([...results]);

    // Test 4: GitHub API rate limit
    addResult({ name: "Rate limit status", status: "running" });
    try {
      const res = await fetch("https://api.github.com/rate_limit", { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        const core = data.resources?.core;
        results[results.length - 1] = {
          name: "Rate limit status",
          status: core?.remaining > 0 ? "pass" : "warn",
          detail: `${core?.remaining}/${core?.limit} remaining, resets ${new Date(core?.reset * 1000).toLocaleTimeString()}`,
        };
      } else {
        results[results.length - 1] = { name: "Rate limit status", status: "fail", detail: `→ ${res.status}` };
      }
    } catch (e) {
      results[results.length - 1] = { name: "Rate limit status", status: "fail", detail: e.message };
    }
    setTests([...results]);

    // Test 5: Actual repo lookup (known public repo)
    addResult({ name: "Repo lookup (facebook/react)", status: "running" });
    try {
      const res = await fetch("https://api.github.com/repos/facebook/react", { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        results[results.length - 1] = {
          name: "Repo lookup (facebook/react)",
          status: "pass",
          detail: `★ ${data.stargazers_count?.toLocaleString()} — ${data.description?.slice(0, 60)}`,
        };
      } else {
        results[results.length - 1] = { name: "Repo lookup (facebook/react)", status: "fail", detail: `→ ${res.status}` };
      }
    } catch (e) {
      results[results.length - 1] = { name: "Repo lookup (facebook/react)", status: "fail", detail: e.message };
    }
    setTests([...results]);

    // Test 6: CORS check
    addResult({ name: "CORS headers present", status: "running" });
    try {
      const res = await fetch("https://api.github.com/", { signal: AbortSignal.timeout(5000) });
      const acao = res.headers.get("Access-Control-Allow-Origin");
      results[results.length - 1] = {
        name: "CORS headers present",
        status: acao ? "pass" : "warn",
        detail: acao ? `ACAO: ${acao}` : "No ACAO header visible (may still work)",
      };
    } catch (e) {
      results[results.length - 1] = { name: "CORS headers present", status: "fail", detail: e.message };
    }
    setTests([...results]);

    // Test 7: IndexedDB
    addResult({ name: "IndexedDB available", status: "running" });
    try {
      if (typeof indexedDB !== "undefined") {
        await CacheManager.init();
        results[results.length - 1] = {
          name: "IndexedDB available",
          status: "pass",
          detail: `Cache backend: ${CacheManager.getBackend()}`,
        };
      } else {
        results[results.length - 1] = { name: "IndexedDB available", status: "warn", detail: "Not available, using memory fallback" };
      }
    } catch (e) {
      results[results.length - 1] = { name: "IndexedDB available", status: "warn", detail: `Fallback to memory: ${e.message}` };
    }
    setTests([...results]);

    setRunning(false);
  };

  const statusIcon = (s) => {
    if (s === "running") return <PulseDot color={C.accent} size={4} />;
    if (s === "pass") return <span style={{ color: C.success, fontSize: 14 }}>✓</span>;
    if (s === "warn") return <span style={{ color: C.warning, fontSize: 14 }}>⚠</span>;
    return <span style={{ color: C.error, fontSize: 14 }}>✕</span>;
  };

  const statusColor = (s) => {
    if (s === "pass") return C.success;
    if (s === "warn") return C.warning;
    if (s === "fail") return C.error;
    return C.textDim;
  };

  const allDone = tests.length > 0 && !running;
  const anyFail = tests.some((t) => t.status === "fail");
  const allPass = allDone && tests.every((t) => t.status === "pass");

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 14 }}>🔌</span>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>
            Connectivity Diagnostic
          </span>
          {allPass && (
            <span className="px-2 py-0.5 rounded fade-up" style={{ backgroundColor: C.successDim, color: C.success, fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>
              ALL PASS
            </span>
          )}
          {allDone && anyFail && (
            <span className="px-2 py-0.5 rounded fade-up" style={{ backgroundColor: C.errorDim, color: C.error, fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>
              ISSUES FOUND
            </span>
          )}
        </div>
        <button
          onClick={runTests}
          disabled={running}
          className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            backgroundColor: running ? C.border : C.accentDim,
            color: running ? C.textMuted : C.accent,
            border: `1px solid ${running ? C.border : C.accent}30`,
            cursor: running ? "not-allowed" : "pointer",
          }}
        >
          {running ? "Running..." : tests.length > 0 ? "Re-run" : "Run Tests"}
        </button>
      </div>

      {tests.length > 0 && (
        <div className="flex flex-col gap-1">
          {tests.map((test, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 px-3 py-2 rounded-md"
              style={{
                backgroundColor: test.status === "fail" ? C.errorDim : test.status === "warn" ? C.warningDim : "transparent",
              }}
            >
              <span className="mt-0.5 shrink-0 w-5 flex justify-center">{statusIcon(test.status)}</span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 500, color: C.text }}>
                  {test.name}
                </span>
                {test.detail && (
                  <span
                    className="truncate"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: statusColor(test.status), opacity: 0.8 }}
                    title={test.detail}
                  >
                    {test.detail}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {allDone && anyFail && (
        <div className="mt-3 px-3 py-2 rounded-md fade-up" style={{ backgroundColor: C.surfaceAlt, fontFamily: "'Outfit', sans-serif", fontSize: 12, color: C.textDim, lineHeight: 1.5 }}>
          {tests.find((t) => t.name === "Internet connectivity")?.status === "fail"
            ? "This environment can't make outbound network requests. You'll need to run this component in your own dev environment."
            : tests.find((t) => t.name === "GitHub API reachable")?.status === "fail"
            ? "Internet works but GitHub's API is blocked. The sandbox may restrict certain domains. Try in your own dev environment."
            : "Some tests failed. The app may have limited functionality in this environment."}
        </div>
      )}

      {tests.length === 0 && (
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
          Tests GitHub API access, network connectivity, CORS, rate limits, and local storage. Helps identify if issues are with the app or the environment.
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function FluxApiTester() {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState(null);
  const [validation, setValidation] = useState(null); // { status, repoInfo, rateLimit, reason }
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const [fetchState, setFetchState] = useState("idle"); // idle | fetching | done | error
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null); // { pullRequests, rateLimit, pages }
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  const [cacheBackend, setCacheBackend] = useState(null);
  const [cacheHit, setCacheHit] = useState(false);

  const [activeTab, setActiveTab] = useState("summary"); // summary | raw
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  // Init cache + detect backend
  useEffect(() => {
    CacheManager.init().then(() => setCacheBackend(CacheManager.getBackend()));
  }, []);

  // Load fonts
  useEffect(() => {
    if (!document.querySelector(`link[href*="IBM+Plex+Mono"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_LINK;
      document.head.appendChild(link);
    }
  }, []);

  // Parse + debounced validation
  useEffect(() => {
    const p = parseRepoInput(input);
    setParsed(p);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!p) {
      setValidation(null);
      return;
    }

    setValidation({ status: "checking" });

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await validateRepo(p.owner, p.repo, token || null);
        if (res.valid) {
          setValidation({ status: "valid", repoInfo: res.repoInfo, rateLimit: res.rateLimit });
        } else {
          setValidation({ status: "invalid", reason: res.reason, rateLimit: res.rateLimit });
        }
      } catch {
        setValidation({ status: "error" });
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, token]);

  // Fetch handler
  const handleFetch = useCallback(async () => {
    if (!parsed || validation?.status !== "valid") return;

    const cacheKey = `${parsed.owner}/${parsed.repo}`;

    // Check cache first
    const cached = await CacheManager.get(cacheKey);
    if (cached) {
      setResult(cached);
      setCacheHit(true);
      setFetchState("done");
      try {
        setSummary(summarizePRData(cached.pullRequests));
        setSummaryError(null);
      } catch (e) {
        setSummaryError(e.message);
      }
      return;
    }

    setCacheHit(false);
    setFetchState("fetching");
    setError(null);
    setResult(null);
    setSummary(null);
    setSummaryError(null);

    try {
      const data = await fetchAllMergedPRs(
        parsed.owner,
        parsed.repo,
        token || null,
        setProgress
      );
      setResult(data);
      setFetchState("done");
      await CacheManager.set(cacheKey, data);

      try {
        setSummary(summarizePRData(data.pullRequests));
      } catch (e) {
        setSummaryError(e.message);
      }
    } catch (e) {
      setError(e);
      setFetchState("error");
    }
  }, [parsed, validation, token]);

  // Parsed repo display (shown independently of validation)
  const parsedLabel = useMemo(() => {
    if (!parsed) return null;
    return `${parsed.owner}/${parsed.repo}`;
  }, [parsed]);

  // Validation status rendering
  const validationUI = useMemo(() => {
    // Show format hint when input exists but can't be parsed
    if (!parsed && input.trim()) {
      return (
        <div className="flex items-center gap-2 mt-3" style={{ color: C.textDim, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
          <span style={{ opacity: 0.5 }}>⬦</span> Enter as <span style={{ color: C.accent }}>owner/repo</span> or a GitHub URL
        </div>
      );
    }

    if (!parsed || !validation) return null;
    const s = validation.status;

    // Checking state — show parsed confirmation + spinner
    if (s === "checking") {
      return (
        <div className="flex items-center gap-2 mt-3" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
          <PulseDot color={C.accent} size={5} />
          <span style={{ color: C.textDim }}>Looking up</span>
          <span style={{ color: C.accent, fontWeight: 500 }}>{parsedLabel}</span>
          <LoadingDots />
        </div>
      );
    }

    // Valid — show confirmed repo info
    if (s === "valid") {
      const info = validation.repoInfo;
      return (
        <div className="mt-3 flex flex-col gap-2 fade-up">
          <div className="flex items-center gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
            <span style={{ color: C.success, fontSize: 14 }}>✓</span>
            <span style={{ color: C.text, fontWeight: 600 }}>{info.name}</span>
            {info.language && (
              <span className="px-2 py-0.5 rounded" style={{ backgroundColor: C.accentDim, color: C.accent, fontSize: 10, fontWeight: 600 }}>
                {info.language}
              </span>
            )}
          </div>
          {info.description && (
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: C.textDim, lineHeight: 1.4, maxWidth: 600 }}>
              {info.description}
            </div>
          )}
          <div className="flex gap-4 mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.textDim }}>
            <span>★ {info.stars?.toLocaleString()}</span>
            <span>⑂ {info.forks?.toLocaleString()}</span>
            <span>◎ {info.openIssues?.toLocaleString()} open issues</span>
            <span style={{ color: C.textMuted }}>default: {info.defaultBranch}</span>
          </div>
        </div>
      );
    }

    // Invalid — prominent error with parsed name shown
    if (s === "invalid") {
      const msg =
        validation.reason === "not_found"
          ? "not found or private"
          : validation.reason === "rate_limit"
          ? "rate limit hit — add a token or wait"
          : "could not be validated";
      return (
        <div
          className="mt-3 rounded-lg px-4 py-3 fade-up"
          style={{ backgroundColor: C.errorDim, border: `1px solid ${C.error}25` }}
        >
          <div className="flex items-center gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
            <span style={{ color: C.error, fontSize: 15 }}>✕</span>
            <span style={{ color: C.text, fontWeight: 600 }}>{parsedLabel}</span>
            <span style={{ color: C.error }}>— {msg}</span>
          </div>
          {validation.reason === "not_found" && (
            <div className="mt-1.5" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: C.textDim }}>
              Check the spelling, or this may be a private repository. Private repos require a personal access token with <code style={{ color: C.accent, fontSize: 11 }}>repo</code> scope.
            </div>
          )}
        </div>
      );
    }

    // Error — network or unexpected failure
    if (s === "error") {
      return (
        <div
          className="mt-3 rounded-lg px-4 py-3 fade-up"
          style={{ backgroundColor: C.errorDim, border: `1px solid ${C.error}25` }}
        >
          <div className="flex items-center gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
            <span style={{ color: C.error, fontSize: 15 }}>✕</span>
            <span style={{ color: C.text, fontWeight: 600 }}>{parsedLabel}</span>
            <span style={{ color: C.error }}>— validation failed</span>
          </div>
          <div className="mt-1.5" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: C.textDim }}>
            Could not reach GitHub. Check your connection and try again.
          </div>
        </div>
      );
    }

    return null;
  }, [validation, parsed, parsedLabel, input]);

  // Rate limit bar
  const rateLimitUI = useMemo(() => {
    const rl = validation?.rateLimit || result?.rateLimit;
    if (!rl || !rl.limit) return null;
    const pct = (parseInt(rl.remaining) / parseInt(rl.limit)) * 100;
    const resetDate = rl.reset ? new Date(parseInt(rl.reset) * 1000) : null;
    const barColor = pct > 50 ? C.success : pct > 20 ? C.warning : C.error;

    return (
      <div className="flex items-center gap-3" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: C.textDim }}>
        <span>API</span>
        <div className="relative rounded-full overflow-hidden" style={{ width: 80, height: 4, backgroundColor: C.border }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
        <span>
          {rl.remaining}/{rl.limit}
        </span>
        {resetDate && <span style={{ color: C.textMuted }}>resets {resetDate.toLocaleTimeString()}</span>}
        {cacheBackend && (
          <span style={{ color: C.textMuted }}>
            cache: {cacheBackend}
          </span>
        )}
      </div>
    );
  }, [validation?.rateLimit, result?.rateLimit, cacheBackend]);

  const canFetch = parsed && validation?.status === "valid" && fetchState !== "fetching";

  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: C.bg,
        fontFamily: "'Outfit', sans-serif",
        color: C.text,
        backgroundImage: `radial-gradient(${C.border} 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    >
      {/* Keyframes */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fade-up 0.4s ease-out forwards; }
        .json-viewer::-webkit-scrollbar { width: 6px; height: 6px; }
        .json-viewer::-webkit-scrollbar-track { background: ${C.surface}; }
        .json-viewer::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        .json-viewer::-webkit-scrollbar-thumb:hover { background: ${C.textMuted}; }
      `}</style>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="6" r="3" fill={C.accent} />
              <circle cx="14" cy="22" r="3" fill={C.accent} />
              <circle cx="22" cy="14" r="3" fill={C.accent} opacity="0.5" />
              <line x1="14" y1="9" x2="14" y2="19" stroke={C.accent} strokeWidth="2" />
              <path d="M14 9 Q14 14 19 14" stroke={C.accent} strokeWidth="1.5" fill="none" opacity="0.5" />
            </svg>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Flux
            </h1>
          </div>
          <span className="px-2 py-0.5 rounded" style={{ backgroundColor: C.accentDim, color: C.accent, fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.05em" }}>
            API TESTER
          </span>
          <div className="flex-1" />
          {rateLimitUI}
        </div>

        {/* Input Section */}
        <div className="rounded-xl p-5" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setFetchState("idle");
                  setResult(null);
                  setError(null);
                  setSummary(null);
                }}
                placeholder="owner/repo or GitHub URL"
                className="w-full px-4 py-3 rounded-lg outline-none transition-all duration-200"
                style={{
                  backgroundColor: C.bg,
                  border: `1.5px solid ${parsed ? (validation?.status === "valid" ? C.success + "40" : validation?.status === "invalid" ? C.error + "40" : C.border) : C.border}`,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 14,
                  color: C.text,
                  caretColor: C.accent,
                }}
                onFocus={(e) => (e.target.style.borderColor = C.borderFocus)}
                onBlur={(e) => (e.target.style.borderColor = C.border)}
              />
              {parsed && validation?.status === "valid" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: C.success, fontSize: 16 }}>✓</span>
              )}
            </div>
            <button
              onClick={handleFetch}
              disabled={!canFetch}
              className="px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200"
              style={{
                fontFamily: "'Outfit', sans-serif",
                backgroundColor: canFetch ? C.accent : C.border,
                color: canFetch ? C.bg : C.textMuted,
                cursor: canFetch ? "pointer" : "not-allowed",
                letterSpacing: "0.02em",
                opacity: canFetch ? 1 : 0.6,
              }}
              onMouseEnter={(e) => canFetch && (e.target.style.boxShadow = `0 0 20px ${C.accentGlow}`)}
              onMouseLeave={(e) => (e.target.style.boxShadow = "none")}
            >
              {fetchState === "fetching" ? (
                <span className="flex items-center gap-2">
                  Fetching<LoadingDots />
                </span>
              ) : (
                "Fetch PRs"
              )}
            </button>
          </div>

          {/* Token toggle */}
          <div className="mt-3">
            <button
              onClick={() => setShowToken(!showToken)}
              className="flex items-center gap-1.5 text-xs transition-colors duration-200"
              style={{ color: C.textMuted, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", background: "none", border: "none", padding: 0 }}
            >
              <span style={{ transform: showToken ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s", display: "inline-block" }}>▸</span>
              Personal access token {token ? "(set)" : "(optional)"}
            </button>
            {showToken && (
              <div className="mt-2 fade-up">
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full px-3 py-2 rounded-md outline-none text-xs"
                  style={{
                    backgroundColor: C.bg,
                    border: `1px solid ${C.border}`,
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: C.text,
                    caretColor: C.accent,
                  }}
                />
                <div className="flex items-center justify-between mt-1.5">
                  <p style={{ fontSize: 11, color: C.textMuted, fontFamily: "'Outfit', sans-serif" }}>
                    Raises rate limit from 60 → 5,000 req/hour. Token is stored in memory only.
                  </p>
                  <a
                    href="https://github.com/settings/tokens/new?description=Flux+Branch+Viewer&scopes=public_repo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 shrink-0 ml-3 transition-colors duration-200"
                    style={{ fontSize: 11, color: C.accent, fontFamily: "'IBM Plex Mono', monospace", textDecoration: "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = C.accent)}
                  >
                    Generate token
                    <span style={{ fontSize: 13 }}>↗</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {validationUI}
        </div>

        {/* Connectivity Diagnostic */}
        <div className="mt-4">
          <ConnectivityDiagnostic />
        </div>

        {/* Progress indicator */}
        {fetchState === "fetching" && progress && (
          <div
            className="mt-4 rounded-lg px-4 py-3 fade-up"
            style={{ backgroundColor: C.accentDim, border: `1px solid ${C.accent}20`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: C.accent }}
          >
            <div className="flex items-center gap-2">
              <PulseDot color={C.accent} size={5} />
              <span>
                Page {progress.page} · {progress.accumulated} merged PRs collected
                {progress.rateLimit && (
                  <span style={{ color: C.textDim }}> · {progress.rateLimit.remaining} API calls remaining</span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Error display */}
        {fetchState === "error" && error && (
          <div
            className="mt-4 rounded-lg px-4 py-3 fade-up"
            style={{ backgroundColor: C.errorDim, border: `1px solid ${C.error}25`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.error }}
          >
            <div className="flex items-center gap-2 font-semibold mb-1">
              <span>✕</span>
              <span>{error.type === "rate_limit" ? "Rate Limit Exceeded" : error.type === "not_found" ? "Not Found" : "API Error"}</span>
            </div>
            <div style={{ color: `${C.error}cc` }}>{error.message}</div>
          </div>
        )}

        {/* Cache hit notice */}
        {cacheHit && fetchState === "done" && (
          <div
            className="mt-4 rounded-lg px-4 py-2 flex items-center gap-2 fade-up"
            style={{ backgroundColor: C.warningDim, border: `1px solid ${C.warning}20`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.warning }}
          >
            <span>⚡</span> Loaded from cache ({cacheBackend}). Data may be up to 15 min old.
          </div>
        )}

        {/* Results */}
        {fetchState === "done" && result && (
          <div className="mt-6 fade-up">
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              {["summary", "raw"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-2.5 text-sm font-medium transition-all duration-200 relative"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    color: activeTab === tab ? C.accent : C.textDim,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    borderBottom: activeTab === tab ? `2px solid ${C.accent}` : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  {tab === "summary" ? "Summary" : "Raw JSON"}
                </button>
              ))}
              <div className="flex-1" />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.textMuted }}>
                {result.pullRequests.length} merged PRs · {result.pages} page{result.pages > 1 ? "s" : ""} fetched
              </span>
            </div>

            {/* Summary tab */}
            {activeTab === "summary" && (
              <div className="fade-up">
                {summaryError && (
                  <div
                    className="rounded-lg px-4 py-3 mb-4"
                    style={{ backgroundColor: C.errorDim, border: `1px solid ${C.error}25`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: C.error }}
                  >
                    Summary computation failed: {summaryError}. Raw data is still available.
                  </div>
                )}
                {summary && (
                  <div className="flex flex-col gap-5">
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
                      <StatPill label="Merged PRs" value={summary.totalMergedPRs} />
                      <StatPill label="Unique Branches" value={summary.uniqueBranches} color="#818cf8" />
                      <StatPill label="Avg Lifetime" value={summary.avgLifetime} color="#fb923c" />
                      <StatPill label="Median Lifetime" value={summary.medianLifetime} color="#f472b6" />
                      <StatPill label="Time Span" value={`${summary.dateRange.spanDays}d`} color="#a78bfa" />
                      <StatPill label="Base Branches" value={summary.uniqueBaseBranches} color="#38bdf8" />
                    </div>

                    {/* Date range */}
                    <div className="rounded-lg p-4" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                      <div className="text-xs font-medium mb-2" style={{ color: C.textDim, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Activity Range
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.text }}>
                        {new Date(summary.dateRange.earliest).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        <span style={{ color: C.textMuted, margin: "0 8px" }}>→</span>
                        {new Date(summary.dateRange.latest).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </div>
                    </div>

                    {/* Base branch breakdown */}
                    <div className="rounded-lg p-4" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                      <div className="text-xs font-medium mb-3" style={{ color: C.textDim, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Merge Targets
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(summary.baseBranchBreakdown)
                          .sort((a, b) => b[1] - a[1])
                          .map(([branch, count]) => (
                            <span
                              key={branch}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md"
                              style={{ backgroundColor: C.accentDim, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}
                            >
                              <span style={{ color: C.accent }}>⑂</span>
                              <span style={{ color: C.text }}>{branch}</span>
                              <span style={{ color: C.textDim }}>×{count}</span>
                            </span>
                          ))}
                      </div>
                    </div>

                    {/* Top branches */}
                    {summary.topBranches.length > 0 && (
                      <div className="rounded-lg p-4" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                        <div className="text-xs font-medium mb-3" style={{ color: C.textDim, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Most Reused Branch Names (top 10)
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {summary.topBranches.map(([branch, count]) => {
                            const maxCount = summary.topBranches[0][1];
                            const pct = (count / maxCount) * 100;
                            return (
                              <div key={branch} className="flex items-center gap-3">
                                <span
                                  className="truncate"
                                  style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: C.text, width: 240, flexShrink: 0 }}
                                  title={branch}
                                >
                                  {branch}
                                </span>
                                <div className="flex-1 relative rounded-full overflow-hidden" style={{ height: 6, backgroundColor: C.border }}>
                                  <div
                                    className="absolute inset-y-0 left-0 rounded-full"
                                    style={{ width: `${pct}%`, backgroundColor: C.accent, transition: "width 0.6s ease-out" }}
                                  />
                                </div>
                                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.textDim, minWidth: 24, textAlign: "right" }}>
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {!summary && !summaryError && (
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.textDim, textAlign: "center", padding: 40 }}>
                    No merged PRs found in this repository.
                  </div>
                )}
              </div>
            )}

            {/* Raw JSON tab */}
            {activeTab === "raw" && (
              <div
                className="json-viewer rounded-lg p-4 overflow-auto fade-up"
                style={{
                  backgroundColor: C.surface,
                  border: `1px solid ${C.border}`,
                  maxHeight: 600,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: C.textDim,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {(() => {
                  try {
                    return JSON.stringify(result, null, 2);
                  } catch {
                    return String(result);
                  }
                })()}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {fetchState === "idle" && !result && (
          <div className="mt-16 flex flex-col items-center gap-4" style={{ opacity: 0.4 }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="8" r="4" stroke={C.textMuted} strokeWidth="1.5" />
              <circle cx="24" cy="40" r="4" stroke={C.textMuted} strokeWidth="1.5" />
              <circle cx="36" cy="24" r="4" stroke={C.textMuted} strokeWidth="1.5" />
              <line x1="24" y1="12" x2="24" y2="36" stroke={C.textMuted} strokeWidth="1.5" strokeDasharray="3 3" />
              <path d="M24 12 Q24 24 32 24" stroke={C.textMuted} strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
            </svg>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, color: C.textMuted }}>
              Enter a repository to explore its branch history
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

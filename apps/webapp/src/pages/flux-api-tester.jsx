import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Fonts ───────────────────────────────────────────────────────────────────
const FONT_LINK =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700&display=swap";

// ─── Constants ───────────────────────────────────────────────────────────────
const GITHUB_API = "https://api.github.com";
const GITHUB_GRAPHQL = "https://api.github.com/graphql";
const DEBOUNCE_MS = 800;
const PER_PAGE = 100;
const DB_NAME = "flux-cache-v2";
const DB_VERSION = 1;
const STORE_NAME = "responses";
const CACHE_TTL_MS = 15 * 60 * 1000;

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

const BRANCH_COLORS = [
  "#2dd4bf", "#818cf8", "#fb923c", "#f472b6", "#a78bfa",
  "#38bdf8", "#34d399", "#fbbf24", "#f87171", "#a3e635",
  "#e879f9", "#67e8f9", "#fdba74", "#86efac",
];

// ─── Parse repo input ────────────────────────────────────────────────────────
function parseRepoInput(input) {
  if (!input || !input.trim()) return null;
  const s = input.trim().replace(/\/$/, "");
  const urlMatch = s.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)/
  );
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
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
          if (!d.objectStoreNames.contains(STORE_NAME)) d.createObjectStore(STORE_NAME);
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
      if (Date.now() - item.ts > CACHE_TTL_MS) { mem.delete(key); return null; }
      return item.value;
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => {
          const item = req.result;
          if (!item || Date.now() - item.ts > CACHE_TTL_MS) return resolve(null);
          resolve(item.value);
        };
        req.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }

  async function set(key, value) {
    await init();
    const item = { value, ts: Date.now() };
    if (useFallback) { mem.set(key, item); return; }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(item, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch { mem.set(key, item); resolve(); }
    });
  }

  return { get, set, init, getBackend: () => (useFallback ? "memory" : "IndexedDB") };
})();

// ─── GitHub REST API ─────────────────────────────────────────────────────────
async function fetchMergedPRsREST(owner, repo, token, onProgress) {
  const headers = { Accept: "application/vnd.github.v3+json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let page = 1, allPRs = [], rateLimit = null;

  while (true) {
    onProgress?.({ type: "fetching", page, accumulated: allPRs.length });

    const url = `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=closed&sort=created&direction=asc&per_page=${PER_PAGE}&page=${page}`;
    const res = await fetch(url, { headers });

    rateLimit = {
      limit: res.headers.get("X-RateLimit-Limit"),
      remaining: res.headers.get("X-RateLimit-Remaining"),
      reset: res.headers.get("X-RateLimit-Reset"),
    };

    if (res.status === 403 && rateLimit.remaining === "0") {
      const resetDate = new Date(parseInt(rateLimit.reset) * 1000);
      throw { type: "rate_limit", message: `Rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}.`, rateLimit };
    }
    if (res.status === 404) throw { type: "not_found", message: `Repository ${owner}/${repo} not found or is private.` };
    if (!res.ok) { const body = await res.text(); throw { type: "api_error", message: `GitHub API returned ${res.status}: ${body}` }; }

    const data = await res.json();
    const merged = data.filter((pr) => pr.merged_at !== null);
    allPRs = allPRs.concat(merged);

    onProgress?.({ type: "page_done", page, accumulated: allPRs.length, rateLimit });

    const linkHeader = res.headers.get("Link");
    if (!linkHeader || !linkHeader.includes('rel="next"')) break;
    page++;
    await new Promise((r) => setTimeout(r, 150));
  }

  return { pullRequests: allPRs, rateLimit, pages: page, source: "rest" };
}

// ─── GitHub GraphQL API ──────────────────────────────────────────────────────
async function fetchMergedPRsGraphQL(owner, repo, token, onProgress) {
  const query = `
    query($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        pullRequests(first: 100, states: MERGED, orderBy: {field: CREATED_AT, direction: ASC}, after: $cursor) {
          nodes {
            number
            title
            createdAt
            mergedAt
            headRefName
            baseRefName
            url
            firstCommit: commits(first: 1) {
              nodes { commit { authoredDate message oid } }
              totalCount
            }
            lastCommit: commits(last: 1) {
              nodes { commit { authoredDate message oid } }
            }
          }
          pageInfo { hasNextPage endCursor }
          totalCount
        }
      }
    }
  `;

  let cursor = null, allPRs = [], pageNum = 0;

  while (true) {
    pageNum++;
    onProgress?.({ type: "fetching", page: pageNum, accumulated: allPRs.length, source: "graphql" });

    const res = await fetch(GITHUB_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, variables: { owner, repo, cursor } }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw { type: "api_error", message: `GraphQL API returned ${res.status}: ${body}` };
    }

    const json = await res.json();
    if (json.errors?.length) {
      throw { type: "graphql_error", message: `GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}` };
    }

    const prs = json.data?.repository?.pullRequests;
    if (!prs) throw { type: "api_error", message: "Unexpected GraphQL response structure." };

    allPRs = allPRs.concat(prs.nodes);
    onProgress?.({ type: "page_done", page: pageNum, accumulated: allPRs.length, total: prs.totalCount, source: "graphql" });

    if (!prs.pageInfo.hasNextPage) break;
    cursor = prs.pageInfo.endCursor;
    await new Promise((r) => setTimeout(r, 100));
  }

  return { pullRequests: allPRs, pages: pageNum, source: "graphql" };
}

// ─── Unified fetcher ─────────────────────────────────────────────────────────
async function fetchMergedPRs(owner, repo, token, onProgress) {
  if (token) {
    try {
      return await fetchMergedPRsGraphQL(owner, repo, token, onProgress);
    } catch (e) {
      onProgress?.({ type: "fallback", reason: e.message });
      return await fetchMergedPRsREST(owner, repo, token, onProgress);
    }
  }
  return await fetchMergedPRsREST(owner, repo, null, onProgress);
}

// ─── Validate repo ──────────────────────────────────────────────────────────
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
    valid: true, rateLimit,
    repoInfo: {
      name: data.full_name, description: data.description,
      stars: data.stargazers_count, forks: data.forks_count,
      defaultBranch: data.default_branch, openIssues: data.open_issues_count,
      language: data.language,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA PIPELINE: normalize → events → timeline → lanes → geometry
// ═══════════════════════════════════════════════════════════════════════════════

function normalizePRs(rawPRs, source) {
  const normalized = [];
  const skipped = [];

  for (const pr of rawPRs) {
    try {
      let record;
      if (source === "graphql") {
        const firstCommitDate = pr.firstCommit?.nodes?.[0]?.commit?.authoredDate;
        const lastCommitMsg = pr.lastCommit?.nodes?.[0]?.commit?.message;
        const mergedAt = pr.mergedAt;
        if (!mergedAt) { skipped.push({ number: pr.number, reason: "no mergedAt" }); continue; }

        record = {
          prId: pr.number,
          title: pr.title || `PR #${pr.number}`,
          branchRef: pr.headRefName || "unknown",
          baseBranch: pr.baseRefName || "main",
          forkDate: firstCommitDate ? new Date(firstCommitDate).getTime() : new Date(pr.createdAt).getTime(),
          mergeDate: new Date(mergedAt).getTime(),
          prOpenedDate: new Date(pr.createdAt).getTime(),
          commitCount: pr.firstCommit?.totalCount || null,
          lastCommitMessage: lastCommitMsg ? lastCommitMsg.split("\n")[0].slice(0, 120) : null,
          url: pr.url,
          hasPreciseForkDate: !!firstCommitDate,
        };
      } else {
        const mergedAt = pr.merged_at;
        if (!mergedAt) { skipped.push({ number: pr.number, reason: "no merged_at" }); continue; }

        record = {
          prId: pr.number,
          title: pr.title || `PR #${pr.number}`,
          branchRef: pr.head?.ref || "unknown",
          baseBranch: pr.base?.ref || "main",
          forkDate: new Date(pr.created_at).getTime(),
          mergeDate: new Date(mergedAt).getTime(),
          prOpenedDate: new Date(pr.created_at).getTime(),
          commitCount: pr.commits || null,
          lastCommitMessage: null,
          url: pr.html_url,
          hasPreciseForkDate: false,
        };
      }

      if (record.mergeDate < record.forkDate) record.forkDate = record.mergeDate - 1000;
      if (record.forkDate < 1104537600000 || record.mergeDate < 1104537600000) {
        skipped.push({ number: pr.number || pr.prId, reason: "date out of range" });
        continue;
      }

      normalized.push(record);
    } catch (e) {
      skipped.push({ number: pr?.number, reason: e.message });
    }
  }

  return { records: normalized, skipped };
}

function extractEvents(records) {
  const events = [];
  for (const r of records) {
    events.push({ type: "fork", date: r.forkDate, prId: r.prId, record: r });
    events.push({ type: "merge", date: r.mergeDate, prId: r.prId, record: r });
  }
  events.sort((a, b) => {
    if (a.date !== b.date) return a.date - b.date;
    const pri = { fork: 0, merge: 1 };
    if (pri[a.type] !== pri[b.type]) return pri[a.type] - pri[b.type];
    return a.prId - b.prId;
  });
  return events;
}

const COMPRESS_FN = {
  sqrt: (ms) => Math.sqrt(ms / 60000) * 6,
  log: (ms) => Math.log2(ms / 60000 + 1) * 12,
  linear: (ms) => (ms / 3600000) * 20,
};

function buildTimeline(events, compression = "sqrt") {
  if (events.length === 0) return { events: [], totalHeight: 0, timeMarkers: [] };

  const compress = COMPRESS_FN[compression] || COMPRESS_FN.sqrt;
  const n = events.length;
  const minGap = Math.max(20, 300 / n);
  const maxGap = Math.min(280, 2000 / n);

  let y = 60;
  const positioned = [{ ...events[0], y }];

  for (let i = 1; i < n; i++) {
    const deltaMs = events[i].date - events[i - 1].date;
    let gap = compress(Math.max(deltaMs, 0));
    gap = Math.max(minGap, Math.min(maxGap, gap));
    y += gap;
    positioned.push({ ...events[i], y });
  }

  // Time markers at day or month boundaries depending on span
  const timeMarkers = [];
  const spanMs = events[events.length - 1].date - events[0].date;
  const spanDays = spanMs / 86400000;

  let lastMarkerKey = -1;
  for (const ev of positioned) {
    const d = new Date(ev.date);
    let markerKey, label;

    if (spanDays < 14) {
      // Daily markers
      markerKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else if (spanDays < 180) {
      // Weekly markers (use week number approximation)
      const weekNum = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 604800000);
      markerKey = `${d.getFullYear()}-W${weekNum}`;
      label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else {
      // Monthly markers
      markerKey = `${d.getFullYear()}-${d.getMonth()}`;
      label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }

    if (markerKey !== lastMarkerKey) {
      timeMarkers.push({ y: ev.y, label, date: ev.date });
      lastMarkerKey = markerKey;
    }
  }

  return { events: positioned, totalHeight: y + 80, timeMarkers };
}

function assignLanes(records) {
  const laneEndTimes = [];
  const prLaneMap = {};

  const sorted = [...records].sort((a, b) => {
    if (a.forkDate !== b.forkDate) return a.forkDate - b.forkDate;
    return a.prId - b.prId;
  });

  for (const r of sorted) {
    const parentLane = 0;
    let assigned = -1;
    for (let i = parentLane + 1; i < laneEndTimes.length; i++) {
      if (laneEndTimes[i] <= r.forkDate) {
        assigned = i;
        break;
      }
    }
    if (assigned === -1) {
      assigned = laneEndTimes.length;
      laneEndTimes.push(0);
    }
    laneEndTimes[assigned] = r.mergeDate;
    prLaneMap[r.prId] = assigned;
  }

  return { prLaneMap, maxLane: laneEndTimes.length };
}

function computeGeometry(records, timeline, laneInfo) {
  const mainX = 100;
  const laneWidth = 46;
  const cardOffsetX = 24;

  const { events } = timeline;
  const { prLaneMap, maxLane } = laneInfo;

  const prYMap = {};
  for (const ev of events) {
    if (!prYMap[ev.prId]) prYMap[ev.prId] = {};
    if (ev.type === "fork") prYMap[ev.prId].forkY = ev.y;
    if (ev.type === "merge") prYMap[ev.prId].mergeY = ev.y;
  }

  const branches = [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const lane = prLaneMap[r.prId];
    const ys = prYMap[r.prId];
    if (!ys || ys.forkY == null || ys.mergeY == null) continue;

    const laneX = mainX + lane * laneWidth;
    const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
    const height = ys.mergeY - ys.forkY;
    const bend = Math.min(26, Math.max(8, height * 0.25));

    // For very short branches, use a simpler curve
    let path;
    if (height < bend * 4) {
      // Simple arc for tiny branches
      path = `M ${mainX} ${ys.forkY} Q ${laneX} ${ys.forkY + height * 0.5}, ${mainX} ${ys.mergeY}`;
    } else {
      path = [
        `M ${mainX} ${ys.forkY}`,
        `C ${mainX} ${ys.forkY + bend}, ${laneX} ${ys.forkY + bend}, ${laneX} ${ys.forkY + bend * 2}`,
        `L ${laneX} ${ys.mergeY - bend * 2}`,
        `C ${laneX} ${ys.mergeY - bend}, ${mainX} ${ys.mergeY - bend}, ${mainX} ${ys.mergeY}`,
      ].join(" ");
    }

    branches.push({
      prId: r.prId, branchRef: r.branchRef, baseBranch: r.baseBranch,
      title: r.title, commitCount: r.commitCount, lastCommitMessage: r.lastCommitMessage,
      url: r.url, hasPreciseForkDate: r.hasPreciseForkDate,
      lane, laneX, color, forkY: ys.forkY, mergeY: ys.mergeY,
      path, bend,
      lifetime: r.mergeDate - r.forkDate,
      lifetimeStr: formatDuration(r.mergeDate - r.forkDate),
      forkDate: r.forkDate, mergeDate: r.mergeDate,
    });
  }

  // Card positioning with collision avoidance
  const cardBaseX = mainX + Math.max(maxLane, 1) * laneWidth + cardOffsetX;
  const cards = branches.map((b) => ({ ...b, cardY: b.mergeY - 10, cardX: cardBaseX }));
  cards.sort((a, b) => a.cardY - b.cardY);

  const CARD_H = 68;
  const CARD_GAP = 6;
  const MAX_NUDGE = 60;

  for (let i = 1; i < cards.length; i++) {
    const minY = cards[i - 1].cardY + CARD_H + CARD_GAP;
    if (cards[i].cardY < minY) {
      const nudge = minY - cards[i].cardY;
      cards[i].cardY += Math.min(nudge, MAX_NUDGE + CARD_H);
      cards[i].needsLeader = nudge > MAX_NUDGE;
    }
  }

  const lastCardBottom = cards.length > 0 ? cards[cards.length - 1].cardY + CARD_H : 0;
  const svgWidth = Math.max(680, cardBaseX + 280);

  return { branches, cards, mainX, maxLane, laneWidth, svgWidth, contentHeight: Math.max(timeline.totalHeight, lastCardBottom + 40) };
}

function formatDuration(ms) {
  if (ms < 0) return "0s";
  if (ms < 1000 * 60) return `${Math.round(ms / 1000)}s`;
  if (ms < 1000 * 60 * 60) return `${Math.round(ms / (1000 * 60))}m`;
  if (ms < 1000 * 60 * 60 * 24) return `${(ms / (1000 * 60 * 60)).toFixed(1)}h`;
  if (ms < 1000 * 60 * 60 * 24 * 30) return `${(ms / (1000 * 60 * 60 * 24)).toFixed(1)}d`;
  return `${(ms / (1000 * 60 * 60 * 24 * 30)).toFixed(1)}mo`;
}

function summarizePRData(records) {
  if (!records || records.length === 0) return null;
  const branches = {}, baseBranches = {};
  let totalLifetimeMs = 0, minDate = Infinity, maxDate = -Infinity;

  for (const r of records) {
    branches[r.branchRef] = (branches[r.branchRef] || 0) + 1;
    baseBranches[r.baseBranch] = (baseBranches[r.baseBranch] || 0) + 1;
    totalLifetimeMs += r.mergeDate - r.forkDate;
    if (r.forkDate < minDate) minDate = r.forkDate;
    if (r.mergeDate > maxDate) maxDate = r.mergeDate;
  }

  const lifetimes = records.map((r) => r.mergeDate - r.forkDate).sort((a, b) => a - b);

  return {
    totalMergedPRs: records.length,
    uniqueBranches: Object.keys(branches).length,
    uniqueBaseBranches: Object.keys(baseBranches).length,
    baseBranchBreakdown: baseBranches,
    topBranches: Object.entries(branches).sort((a, b) => b[1] - a[1]).slice(0, 10),
    dateRange: {
      earliest: new Date(minDate).toISOString(),
      latest: new Date(maxDate).toISOString(),
      spanDays: Math.round((maxDate - minDate) / 86400000),
    },
    avgLifetime: formatDuration(totalLifetimeMs / records.length),
    medianLifetime: formatDuration(lifetimes[Math.floor(lifetimes.length / 2)]),
    hasCommitData: records.some((r) => r.hasPreciseForkDate),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function PulseDot({ color = C.accent, size = 8 }) {
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size * 2.5, height: size * 2.5 }}>
      <span className="absolute rounded-full animate-ping" style={{ width: size * 2, height: size * 2, backgroundColor: color, opacity: 0.3 }} />
      <span className="relative rounded-full" style={{ width: size, height: size, backgroundColor: color }} />
    </span>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-1 items-center ml-2">
      {[0, 1, 2].map((i) => (
        <span key={i} className="rounded-full" style={{ width: 4, height: 4, backgroundColor: C.accent, animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </span>
  );
}

function StatPill({ label, value, color = C.accent }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-lg" style={{ backgroundColor: `${color}10`, border: `1px solid ${color}20` }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 600, color }}>{value}</span>
      <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: C.textDim, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRANCH GRAPH VISUALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

function BranchGraph({ records, compression, onCompressionChange }) {
  const [hoveredPr, setHoveredPr] = useState(null);

  const graphData = useMemo(() => {
    if (!records || records.length === 0) return null;
    try {
      const events = extractEvents(records);
      const timeline = buildTimeline(events, compression);
      const laneInfo = assignLanes(records);
      const geometry = computeGeometry(records, timeline, laneInfo);
      return { timeline, geometry };
    } catch (e) {
      console.error("Graph computation error:", e);
      return null;
    }
  }, [records, compression]);

  if (!graphData) {
    return (
      <div className="rounded-lg p-8 text-center" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.textDim }}>No branch data to visualize.</div>
      </div>
    );
  }

  const { timeline, geometry } = graphData;
  const { branches, cards, mainX, svgWidth, contentHeight } = geometry;

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: C.textDim, fontWeight: 500 }}>Time scale</span>
          <div className="flex rounded-md overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            {["sqrt", "log", "linear"].map((mode) => (
              <button key={mode} onClick={() => onCompressionChange(mode)}
                className="px-3 py-1.5 text-xs font-medium transition-all duration-150"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  backgroundColor: compression === mode ? C.accentDim : "transparent",
                  color: compression === mode ? C.accent : C.textMuted,
                  border: "none", cursor: "pointer",
                  borderRight: mode !== "linear" ? `1px solid ${C.border}` : "none",
                }}>
                {mode === "sqrt" ? "√t" : mode === "log" ? "log₂t" : "t"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.textMuted }}>
            {branches.length} branches
          </span>
          {records.some((r) => r.hasPreciseForkDate) ? (
            <span className="px-2 py-0.5 rounded" style={{ backgroundColor: C.successDim, color: C.success, fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>COMMIT DATA</span>
          ) : (
            <span className="px-2 py-0.5 rounded" style={{ backgroundColor: C.warningDim, color: C.warning, fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>PR DATES ONLY</span>
          )}
        </div>
      </div>

      {/* Graph */}
      <div className="rounded-xl overflow-auto" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, maxHeight: "75vh" }}>
        <div style={{ position: "relative", width: svgWidth, height: contentHeight, minWidth: "100%" }}>
          <svg width={svgWidth} height={contentHeight} style={{ position: "absolute", top: 0, left: 0 }}
            role="img" aria-label={`Branch timeline showing ${branches.length} merged branches`}>
            <defs>
              {BRANCH_COLORS.map((color, i) => (
                <filter key={i} id={`glow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feFlood floodColor={color} floodOpacity="0.35" />
                  <feComposite in2="blur" operator="in" />
                  <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              ))}
            </defs>

            {/* Time marker lines */}
            {timeline.timeMarkers.map((m, i) => (
              <line key={i} x1={60} y1={m.y} x2={svgWidth} y2={m.y} stroke={C.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
            ))}

            {/* Main trunk */}
            <line x1={mainX} y1={20} x2={mainX} y2={contentHeight - 20}
              stroke={C.textMuted} strokeWidth="3" strokeLinecap="round"
              opacity={hoveredPr ? 0.25 : 0.5} style={{ transition: "opacity 0.2s" }} />

            {/* Branch paths */}
            {branches.map((b) => {
              const isH = hoveredPr === b.prId;
              const isD = hoveredPr !== null && !isH;
              const ci = BRANCH_COLORS.indexOf(b.color);
              return (
                <g key={b.prId}>
                  <path d={b.path} fill="none" stroke={b.color} strokeWidth={isH ? 3 : 2} strokeLinecap="round"
                    opacity={isD ? 0.1 : 1}
                    filter={isH ? `url(#glow-${ci >= 0 ? ci : 0})` : undefined}
                    style={{ transition: "opacity 0.2s, stroke-width 0.15s", cursor: "pointer" }}
                    onMouseEnter={() => setHoveredPr(b.prId)} onMouseLeave={() => setHoveredPr(null)} />
                  <circle cx={mainX} cy={b.forkY} r={isH ? 5 : 3} fill={isD ? C.textMuted : b.color}
                    opacity={isD ? 0.15 : 0.6} style={{ transition: "all 0.2s" }} />
                  <circle cx={mainX} cy={b.mergeY} r={isH ? 7 : 5} fill={isD ? C.textMuted : b.color}
                    opacity={isD ? 0.15 : 1} style={{ transition: "all 0.2s", cursor: "pointer" }}
                    onMouseEnter={() => setHoveredPr(b.prId)} onMouseLeave={() => setHoveredPr(null)} />
                </g>
              );
            })}
          </svg>

          {/* HTML overlay */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            {/* Time labels */}
            {timeline.timeMarkers.map((m, i) => (
              <div key={i} style={{
                position: "absolute", left: 6, top: m.y - 8,
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: C.textMuted,
                fontWeight: 500, whiteSpace: "nowrap",
              }}>{m.label}</div>
            ))}

            {/* Info cards */}
            {cards.map((card) => {
              const isH = hoveredPr === card.prId;
              const isD = hoveredPr !== null && !isH;
              return (
                <div key={card.prId} style={{
                  position: "absolute", left: card.cardX, top: card.cardY, width: 250,
                  pointerEvents: "auto", opacity: isD ? 0.12 : 1,
                  transform: isH ? "translateX(4px)" : "translateX(0)",
                  transition: "opacity 0.2s, transform 0.2s",
                }}
                  onMouseEnter={() => setHoveredPr(card.prId)} onMouseLeave={() => setHoveredPr(null)}>

                  {/* Leader line for nudged cards */}
                  {card.needsLeader && (
                    <svg style={{ position: "absolute", left: -16, top: 14, overflow: "visible", pointerEvents: "none" }} width="16" height="2">
                      <line x1="0" y1="0" x2="16" y2="0" stroke={card.color} strokeWidth="1" opacity="0.25" strokeDasharray="2 2" />
                    </svg>
                  )}

                  <div className="rounded-lg px-3 py-2" style={{
                    backgroundColor: isH ? C.surfaceAlt : "transparent",
                    border: isH ? `1px solid ${card.color}25` : "1px solid transparent",
                    transition: "all 0.2s", cursor: card.url ? "pointer" : "default",
                  }} onClick={() => card.url && window.open(card.url, "_blank")}>

                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="truncate" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: card.color, fontWeight: 600, maxWidth: 140 }}
                        title={card.branchRef}>{card.branchRef}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {card.commitCount && (
                          <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: `${card.color}12`, color: card.color, fontSize: 9, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>
                            {card.commitCount}c
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: C.border, color: C.textDim, fontSize: 9, fontWeight: 500, fontFamily: "'IBM Plex Mono', monospace" }}>
                          {card.lifetimeStr}
                        </span>
                      </div>
                    </div>

                    <div className="truncate" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: C.text, lineHeight: 1.3, fontWeight: 500 }}
                      title={card.title}>{card.title}</div>

                    {card.lastCommitMessage && (
                      <div className="truncate mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: C.textMuted, lineHeight: 1.3 }}
                        title={card.lastCommitMessage}>{card.lastCommitMessage}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTIVITY DIAGNOSTIC
// ═══════════════════════════════════════════════════════════════════════════════

function ConnectivityDiagnostic() {
  const [tests, setTests] = useState([]);
  const [running, setRunning] = useState(false);

  const runTests = async () => {
    setRunning(true);
    const results = [];
    const push = (t) => { results.push(t); setTests([...results]); };
    const fin = (i, d) => { results[i] = d; setTests([...results]); };

    push({ name: "Fetch API", status: "running" });
    fin(0, { name: "Fetch API", status: typeof fetch === "function" ? "pass" : "fail", detail: typeof fetch === "function" ? "available" : "missing" });

    push({ name: "Internet", status: "running" });
    try { const r = await fetch("https://httpbin.org/get", { signal: AbortSignal.timeout(5000) }); fin(1, { name: "Internet", status: r.ok ? "pass" : "warn", detail: `${r.status}` }); }
    catch (e) { fin(1, { name: "Internet", status: "fail", detail: e.message }); }

    push({ name: "GitHub API", status: "running" });
    try { const r = await fetch("https://api.github.com/", { signal: AbortSignal.timeout(5000) }); fin(2, { name: "GitHub API", status: r.ok ? "pass" : "warn", detail: `${r.status}` }); }
    catch (e) { fin(2, { name: "GitHub API", status: "fail", detail: e.message }); }

    push({ name: "Rate limit", status: "running" });
    try {
      const r = await fetch("https://api.github.com/rate_limit", { signal: AbortSignal.timeout(5000) });
      if (r.ok) { const d = await r.json(); const c = d.resources?.core; fin(3, { name: "Rate limit", status: c?.remaining > 0 ? "pass" : "warn", detail: `${c?.remaining}/${c?.limit}` }); }
      else fin(3, { name: "Rate limit", status: "fail", detail: `${r.status}` });
    } catch (e) { fin(3, { name: "Rate limit", status: "fail", detail: e.message }); }

    push({ name: "Cache", status: "running" });
    try { await CacheManager.init(); fin(4, { name: "Cache", status: "pass", detail: CacheManager.getBackend() }); }
    catch (e) { fin(4, { name: "Cache", status: "warn", detail: e.message }); }

    setRunning(false);
  };

  const ico = (s) => s === "running" ? <PulseDot color={C.accent} size={4} /> : s === "pass" ? <span style={{ color: C.success }}>✓</span> : s === "warn" ? <span style={{ color: C.warning }}>⚠</span> : <span style={{ color: C.error }}>✕</span>;
  const scol = (s) => s === "pass" ? C.success : s === "warn" ? C.warning : s === "fail" ? C.error : C.textDim;
  const done = tests.length > 0 && !running;
  const fail = tests.some((t) => t.status === "fail");

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13 }}>🔌</span>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>Diagnostics</span>
          {done && !fail && <span className="px-2 py-0.5 rounded" style={{ backgroundColor: C.successDim, color: C.success, fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>OK</span>}
          {done && fail && <span className="px-2 py-0.5 rounded" style={{ backgroundColor: C.errorDim, color: C.error, fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>ISSUES</span>}
        </div>
        <button onClick={runTests} disabled={running} className="px-3 py-1 rounded-md text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", backgroundColor: running ? C.border : C.accentDim, color: running ? C.textMuted : C.accent, border: `1px solid ${running ? C.border : C.accent}30`, cursor: running ? "not-allowed" : "pointer" }}>
          {running ? "..." : tests.length ? "Re-run" : "Test"}
        </button>
      </div>
      {tests.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {tests.map((t, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1 rounded" style={{ backgroundColor: t.status === "fail" ? C.errorDim : "transparent" }}>
              <span className="w-4 text-center" style={{ fontSize: 12 }}>{ico(t.status)}</span>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: C.text, minWidth: 80 }}>{t.name}</span>
              {t.detail && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: scol(t.status), opacity: 0.8 }}>{t.detail}</span>}
            </div>
          ))}
        </div>
      )}
      {done && fail && (
        <div className="mt-2 px-2 py-1.5 rounded" style={{ backgroundColor: C.surfaceAlt, fontSize: 11, color: C.textDim }}>
          Network blocked. Run in your own dev environment.
        </div>
      )}
      {tests.length === 0 && <div style={{ fontSize: 12, color: C.textMuted }}>Tests API access, connectivity, and storage.</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function FluxApiTester() {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState(null);
  const [validation, setValidation] = useState(null);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const [fetchState, setFetchState] = useState("idle");
  const [progress, setProgress] = useState(null);
  const [rawResult, setRawResult] = useState(null);
  const [error, setError] = useState(null);
  const [cacheBackend, setCacheBackend] = useState(null);
  const [cacheHit, setCacheHit] = useState(false);

  const [normalizedData, setNormalizedData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  const [pipelineError, setPipelineError] = useState(null);

  const [activeTab, setActiveTab] = useState("graph");
  const [compression, setCompression] = useState("sqrt");
  const debounceRef = useRef(null);

  useEffect(() => { CacheManager.init().then(() => setCacheBackend(CacheManager.getBackend())); }, []);
  useEffect(() => {
    if (!document.querySelector(`link[href*="IBM+Plex+Mono"]`)) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = FONT_LINK; document.head.appendChild(l);
    }
  }, []);

  useEffect(() => {
    const p = parseRepoInput(input);
    setParsed(p);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!p) { setValidation(null); return; }
    setValidation({ status: "checking" });
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await validateRepo(p.owner, p.repo, token || null);
        if (res.valid) setValidation({ status: "valid", repoInfo: res.repoInfo, rateLimit: res.rateLimit });
        else setValidation({ status: "invalid", reason: res.reason, rateLimit: res.rateLimit });
      } catch { setValidation({ status: "error" }); }
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input, token]);

  const runPipeline = useCallback((raw, source) => {
    try {
      const { records, skipped } = normalizePRs(raw, source);
      setNormalizedData({ records, skipped, source });
      setPipelineError(null);
      try { setSummary(summarizePRData(records)); setSummaryError(null); }
      catch (e) { setSummaryError(e.message); }
    } catch (e) {
      setPipelineError(e.message);
      setNormalizedData(null); setSummary(null);
    }
  }, []);

  const handleFetch = useCallback(async () => {
    if (!parsed || validation?.status !== "valid") return;
    const cacheKey = `${parsed.owner}/${parsed.repo}:${token ? "gql" : "rest"}`;

    const cached = await CacheManager.get(cacheKey);
    if (cached) {
      setRawResult(cached); setCacheHit(true); setFetchState("done");
      runPipeline(cached.pullRequests, cached.source);
      return;
    }

    setCacheHit(false); setFetchState("fetching"); setError(null);
    setRawResult(null); setNormalizedData(null); setSummary(null); setSummaryError(null); setPipelineError(null);

    try {
      const data = await fetchMergedPRs(parsed.owner, parsed.repo, token || null, setProgress);
      setRawResult(data); setFetchState("done");
      await CacheManager.set(cacheKey, data);
      runPipeline(data.pullRequests, data.source);
    } catch (e) { setError(e); setFetchState("error"); }
  }, [parsed, validation, token, runPipeline]);

  const parsedLabel = useMemo(() => parsed ? `${parsed.owner}/${parsed.repo}` : null, [parsed]);

  const validationUI = useMemo(() => {
    if (!parsed && input.trim()) {
      return <div className="flex items-center gap-2 mt-3" style={{ color: C.textDim, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
        <span style={{ opacity: 0.5 }}>⬦</span> Enter as <span style={{ color: C.accent }}>owner/repo</span> or a GitHub URL
      </div>;
    }
    if (!parsed || !validation) return null;
    const s = validation.status;

    if (s === "checking") return (
      <div className="flex items-center gap-2 mt-3" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
        <PulseDot color={C.accent} size={5} />
        <span style={{ color: C.textDim }}>Looking up</span>
        <span style={{ color: C.accent, fontWeight: 500 }}>{parsedLabel}</span>
        <LoadingDots />
      </div>
    );

    if (s === "valid") {
      const info = validation.repoInfo;
      return (
        <div className="mt-3 flex flex-col gap-2 fade-up">
          <div className="flex items-center gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
            <span style={{ color: C.success, fontSize: 14 }}>✓</span>
            <span style={{ color: C.text, fontWeight: 600 }}>{info.name}</span>
            {info.language && <span className="px-2 py-0.5 rounded" style={{ backgroundColor: C.accentDim, color: C.accent, fontSize: 10, fontWeight: 600 }}>{info.language}</span>}
          </div>
          {info.description && <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: C.textDim, lineHeight: 1.4, maxWidth: 600 }}>{info.description}</div>}
          <div className="flex gap-4 mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.textDim }}>
            <span>★ {info.stars?.toLocaleString()}</span>
            <span>⑂ {info.forks?.toLocaleString()}</span>
            <span>◎ {info.openIssues?.toLocaleString()} open</span>
          </div>
        </div>
      );
    }

    if (s === "invalid") {
      const msg = validation.reason === "not_found" ? "not found or private" : validation.reason === "rate_limit" ? "rate limit hit — add a token" : "could not be validated";
      return (
        <div className="mt-3 rounded-lg px-4 py-3 fade-up" style={{ backgroundColor: C.errorDim, border: `1px solid ${C.error}25` }}>
          <div className="flex items-center gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
            <span style={{ color: C.error, fontSize: 15 }}>✕</span>
            <span style={{ color: C.text, fontWeight: 600 }}>{parsedLabel}</span>
            <span style={{ color: C.error }}>— {msg}</span>
          </div>
        </div>
      );
    }

    if (s === "error") return (
      <div className="mt-3 rounded-lg px-4 py-3 fade-up" style={{ backgroundColor: C.errorDim, border: `1px solid ${C.error}25` }}>
        <div className="flex items-center gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
          <span style={{ color: C.error, fontSize: 15 }}>✕</span>
          <span style={{ color: C.text, fontWeight: 600 }}>{parsedLabel}</span>
          <span style={{ color: C.error }}>— could not reach GitHub</span>
        </div>
      </div>
    );
    return null;
  }, [validation, parsed, parsedLabel, input]);

  const rateLimitUI = useMemo(() => {
    const rl = validation?.rateLimit || rawResult?.rateLimit;
    if (!rl?.limit) return null;
    const pct = (parseInt(rl.remaining) / parseInt(rl.limit)) * 100;
    const col = pct > 50 ? C.success : pct > 20 ? C.warning : C.error;
    return (
      <div className="flex items-center gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: C.textDim }}>
        <span>API</span>
        <div className="relative rounded-full overflow-hidden" style={{ width: 60, height: 4, backgroundColor: C.border }}>
          <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: col }} />
        </div>
        <span>{rl.remaining}/{rl.limit}</span>
      </div>
    );
  }, [validation?.rateLimit, rawResult?.rateLimit]);

  const canFetch = parsed && validation?.status === "valid" && fetchState !== "fetching";

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: C.bg, fontFamily: "'Outfit', sans-serif", color: C.text, backgroundImage: `radial-gradient(${C.border} 1px, transparent 1px)`, backgroundSize: "24px 24px" }}>
      <style>{`
        @keyframes pulse-dot { 0%, 100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        @keyframes fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fade-up 0.4s ease-out forwards; }
        .json-viewer::-webkit-scrollbar { width: 6px; height: 6px; }
        .json-viewer::-webkit-scrollbar-track { background: ${C.surface}; }
        .json-viewer::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        @media (prefers-reduced-motion: reduce) { .fade-up { animation: none; } * { transition-duration: 0s !important; } }
      `}</style>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="6" r="3" fill={C.accent} />
            <circle cx="14" cy="22" r="3" fill={C.accent} />
            <circle cx="22" cy="14" r="3" fill={C.accent} opacity="0.5" />
            <line x1="14" y1="9" x2="14" y2="19" stroke={C.accent} strokeWidth="2" />
            <path d="M14 9 Q14 14 19 14" stroke={C.accent} strokeWidth="1.5" fill="none" opacity="0.5" />
          </svg>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Flux</h1>
          <span className="px-2 py-0.5 rounded" style={{ backgroundColor: C.accentDim, color: C.accent, fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>BRANCH VIEWER</span>
          <div className="flex-1" />
          {rateLimitUI}
        </div>

        {/* Input */}
        <div className="rounded-xl p-5" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input type="text" value={input}
                onChange={(e) => { setInput(e.target.value); setFetchState("idle"); setRawResult(null); setError(null); setNormalizedData(null); setSummary(null); }}
                placeholder="owner/repo or GitHub URL"
                className="w-full px-4 py-3 rounded-lg outline-none transition-all duration-200"
                style={{ backgroundColor: C.bg, border: `1.5px solid ${parsed ? (validation?.status === "valid" ? C.success + "40" : validation?.status === "invalid" || validation?.status === "error" ? C.error + "40" : C.border) : C.border}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: C.text, caretColor: C.accent }}
                onFocus={(e) => (e.target.style.borderColor = C.borderFocus)}
                onBlur={(e) => (e.target.style.borderColor = C.border)}
                onKeyDown={(e) => e.key === "Enter" && canFetch && handleFetch()}
              />
              {parsed && validation?.status === "valid" && <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: C.success, fontSize: 16 }}>✓</span>}
            </div>
            <button onClick={handleFetch} disabled={!canFetch}
              className="px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200"
              style={{ fontFamily: "'Outfit', sans-serif", backgroundColor: canFetch ? C.accent : C.border, color: canFetch ? C.bg : C.textMuted, cursor: canFetch ? "pointer" : "not-allowed", opacity: canFetch ? 1 : 0.6 }}
              onMouseEnter={(e) => canFetch && (e.target.style.boxShadow = `0 0 20px ${C.accentGlow}`)}
              onMouseLeave={(e) => (e.target.style.boxShadow = "none")}>
              {fetchState === "fetching" ? <span className="flex items-center gap-2">Fetching<LoadingDots /></span> : "Fetch PRs"}
            </button>
          </div>

          <div className="mt-3">
            <button onClick={() => setShowToken(!showToken)} className="flex items-center gap-1.5 text-xs" style={{ color: C.textMuted, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
              <span style={{ transform: showToken ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s", display: "inline-block" }}>▸</span>
              Token {token ? "(set)" : "(optional — unlocks richer data)"}
            </button>
            {showToken && (
              <div className="mt-2 fade-up">
                <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full px-3 py-2 rounded-md outline-none text-xs"
                  style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, fontFamily: "'IBM Plex Mono', monospace", color: C.text, caretColor: C.accent }} />
                <div className="flex items-center justify-between mt-1.5">
                  <p style={{ fontSize: 11, color: C.textMuted }}>Unlocks GraphQL: precise branch dates, commit messages, 5k req/hr.</p>
                  <a href="https://github.com/settings/tokens/new?description=Flux+Branch+Viewer&scopes=public_repo" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 shrink-0 ml-3"
                    style={{ fontSize: 11, color: C.accent, fontFamily: "'IBM Plex Mono', monospace", textDecoration: "none" }}>
                    Generate ↗
                  </a>
                </div>
              </div>
            )}
          </div>
          {validationUI}
        </div>

        <div className="mt-4"><ConnectivityDiagnostic /></div>

        {/* Progress */}
        {fetchState === "fetching" && progress && (
          <div className="mt-4 rounded-lg px-4 py-3 fade-up" style={{ backgroundColor: C.accentDim, border: `1px solid ${C.accent}20`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: C.accent }}>
            <div className="flex items-center gap-2">
              <PulseDot color={C.accent} size={5} />
              <span>{progress.source === "graphql" ? "GraphQL" : "REST"} · Page {progress.page} · {progress.accumulated} PRs{progress.total ? ` of ${progress.total}` : ""}</span>
            </div>
          </div>
        )}

        {fetchState === "error" && error && (
          <div className="mt-4 rounded-lg px-4 py-3 fade-up" style={{ backgroundColor: C.errorDim, border: `1px solid ${C.error}25`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.error }}>
            <div className="font-semibold mb-1">✕ {error.type === "rate_limit" ? "Rate Limit" : "Error"}</div>
            <div style={{ color: `${C.error}cc` }}>{error.message}</div>
          </div>
        )}

        {pipelineError && fetchState === "done" && (
          <div className="mt-4 rounded-lg px-4 py-3" style={{ backgroundColor: C.warningDim, border: `1px solid ${C.warning}20`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: C.warning }}>
            ⚠ Processing error: {pipelineError}. Raw data available.
          </div>
        )}

        {cacheHit && fetchState === "done" && (
          <div className="mt-4 rounded-lg px-4 py-2 flex items-center gap-2" style={{ backgroundColor: C.warningDim, border: `1px solid ${C.warning}20`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.warning }}>
            ⚡ Cached ({cacheBackend}). Up to 15 min old.
          </div>
        )}

        {normalizedData?.skipped?.length > 0 && fetchState === "done" && (
          <div className="mt-2 px-4 py-1" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.textMuted }}>
            ℹ {normalizedData.skipped.length} PR{normalizedData.skipped.length > 1 ? "s" : ""} skipped (incomplete data)
          </div>
        )}

        {/* Results */}
        {fetchState === "done" && rawResult && (
          <div className="mt-6 fade-up">
            <div className="flex items-center gap-1 mb-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              {["graph", "summary", "raw"].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="px-4 py-2.5 text-sm font-medium transition-all duration-200"
                  style={{ fontFamily: "'Outfit', sans-serif", color: activeTab === tab ? C.accent : C.textDim, background: "none", border: "none", cursor: "pointer", borderBottom: activeTab === tab ? `2px solid ${C.accent}` : "2px solid transparent", marginBottom: -1 }}>
                  {tab === "graph" ? "Branch Graph" : tab === "summary" ? "Summary" : "Raw JSON"}
                </button>
              ))}
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                {rawResult.source && (
                  <span className="px-2 py-0.5 rounded" style={{ backgroundColor: rawResult.source === "graphql" ? C.successDim : C.warningDim, color: rawResult.source === "graphql" ? C.success : C.warning, fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {rawResult.source === "graphql" ? "GRAPHQL" : "REST"}
                  </span>
                )}
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.textMuted }}>
                  {normalizedData?.records?.length ?? rawResult.pullRequests.length} PRs
                </span>
              </div>
            </div>

            {activeTab === "graph" && normalizedData?.records?.length > 0 && (
              <BranchGraph records={normalizedData.records} compression={compression} onCompressionChange={setCompression} />
            )}
            {activeTab === "graph" && (!normalizedData?.records || normalizedData.records.length === 0) && (
              <div className="rounded-lg p-8 text-center" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.textDim }}>
                No merged PRs to visualize.
              </div>
            )}

            {activeTab === "summary" && (
              <div className="fade-up">
                {summaryError && <div className="rounded-lg px-4 py-3 mb-4" style={{ backgroundColor: C.errorDim, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: C.error }}>Summary error: {summaryError}</div>}
                {summary && (
                  <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
                      <StatPill label="Merged PRs" value={summary.totalMergedPRs} />
                      <StatPill label="Branches" value={summary.uniqueBranches} color="#818cf8" />
                      <StatPill label="Avg Lifetime" value={summary.avgLifetime} color="#fb923c" />
                      <StatPill label="Median" value={summary.medianLifetime} color="#f472b6" />
                      <StatPill label="Span" value={`${summary.dateRange.spanDays}d`} color="#a78bfa" />
                      <StatPill label="Targets" value={summary.uniqueBaseBranches} color="#38bdf8" />
                    </div>
                    <div className="rounded-lg p-4" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                      <div className="text-xs font-medium mb-2" style={{ color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Activity Range</div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.text }}>
                        {new Date(summary.dateRange.earliest).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        <span style={{ color: C.textMuted, margin: "0 8px" }}>→</span>
                        {new Date(summary.dateRange.latest).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </div>
                      <div className="mt-1" style={{ fontSize: 11, color: summary.hasCommitData ? C.success : C.warning, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {summary.hasCommitData ? "✓ Dates from first commit (GraphQL)" : "⚠ Dates from PR open time (add token for precision)"}
                      </div>
                    </div>
                    <div className="rounded-lg p-4" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                      <div className="text-xs font-medium mb-3" style={{ color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Merge Targets</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(summary.baseBranchBreakdown).sort((a, b) => b[1] - a[1]).map(([b, c]) => (
                          <span key={b} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md" style={{ backgroundColor: C.accentDim, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                            <span style={{ color: C.accent }}>⑂</span><span style={{ color: C.text }}>{b}</span><span style={{ color: C.textDim }}>×{c}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {!summary && !summaryError && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.textDim, textAlign: "center", padding: 40 }}>No data.</div>}
              </div>
            )}

            {activeTab === "raw" && (
              <div className="json-viewer rounded-lg p-4 overflow-auto fade-up" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, maxHeight: 600, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, lineHeight: 1.6, color: C.textDim, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {(() => { try { return JSON.stringify(rawResult, null, 2); } catch { return String(rawResult); } })()}
              </div>
            )}
          </div>
        )}

        {fetchState === "idle" && !rawResult && (
          <div className="mt-16 flex flex-col items-center gap-4" style={{ opacity: 0.4 }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="8" r="4" stroke={C.textMuted} strokeWidth="1.5" />
              <circle cx="24" cy="40" r="4" stroke={C.textMuted} strokeWidth="1.5" />
              <circle cx="36" cy="24" r="4" stroke={C.textMuted} strokeWidth="1.5" />
              <line x1="24" y1="12" x2="24" y2="36" stroke={C.textMuted} strokeWidth="1.5" strokeDasharray="3 3" />
              <path d="M24 12 Q24 24 32 24" stroke={C.textMuted} strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
            </svg>
            <span style={{ fontSize: 14, color: C.textMuted }}>Enter a repository to explore its branch history</span>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Fonts & Constants ───────────────────────────────────────────────────────
const FONT_LINK = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700&display=swap";
const GITHUB_API = "https://api.github.com";
const GITHUB_GRAPHQL = "https://api.github.com/graphql";
const DEBOUNCE_MS = 800;
const PER_PAGE = 100;
const DB_NAME = "flux-cache-v3";
const DB_VERSION = 1;
const STORE_NAME = "responses";
const CACHE_TTL_MS = 15 * 60 * 1000;

const C = {
  bg: "#080c14", surface: "#0d1420", surfaceAlt: "#111927",
  border: "#1a2538", borderFocus: "#2dd4bf",
  text: "#e2e8f0", textDim: "#64748b", textMuted: "#3b4963",
  accent: "#2dd4bf", accentDim: "rgba(45,212,191,0.15)", accentGlow: "rgba(45,212,191,0.3)",
  error: "#f87171", errorDim: "rgba(248,113,113,0.12)",
  warning: "#fbbf24", warningDim: "rgba(251,191,36,0.12)",
  success: "#34d399", successDim: "rgba(52,211,153,0.12)",
};

const BRANCH_COLORS = [
  "#2dd4bf", "#818cf8", "#fb923c", "#f472b6", "#a78bfa",
  "#38bdf8", "#34d399", "#fbbf24", "#f87171", "#a3e635",
  "#e879f9", "#67e8f9", "#fdba74", "#86efac",
];

// Distinct colors for trunk lines (high contrast, differentiated from feature colors)
const TRUNK_COLORS = ["#94a3b8", "#c084fc", "#22d3ee", "#fbbf24", "#fb7185", "#4ade80"];

// ─── Utilities ───────────────────────────────────────────────────────────────
function parseRepoInput(input) {
  if (!input?.trim()) return null;
  const s = input.trim().replace(/\/$/, "");
  const u = s.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)/);
  if (u) return { owner: u[1], repo: u[2] };
  const sl = s.match(/^([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)$/);
  if (sl) return { owner: sl[1], repo: sl[2] };
  return null;
}

function formatDuration(ms) {
  if (ms < 0) return "0s";
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`;
  if (ms < 2592000000) return `${(ms / 86400000).toFixed(1)}d`;
  return `${(ms / 2592000000).toFixed(1)}mo`;
}

// ─── Cache Manager ───────────────────────────────────────────────────────────
const CacheManager = (() => {
  let db = null, ready = false, fallback = false;
  const mem = new Map();
  async function init() {
    if (ready) return;
    try {
      if (typeof indexedDB === "undefined") throw 0;
      db = await new Promise((ok, no) => {
        const r = indexedDB.open(DB_NAME, DB_VERSION);
        r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE_NAME)) r.result.createObjectStore(STORE_NAME); };
        r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
      });
    } catch { fallback = true; }
    ready = true;
  }
  async function get(key) {
    await init();
    if (fallback) { const i = mem.get(key); return i && Date.now() - i.ts < CACHE_TTL_MS ? i.value : null; }
    return new Promise(ok => {
      try { const r = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key); r.onsuccess = () => { const i = r.result; ok(i && Date.now() - i.ts < CACHE_TTL_MS ? i.value : null); }; r.onerror = () => ok(null); } catch { ok(null); }
    });
  }
  async function set(key, value) {
    await init(); const item = { value, ts: Date.now() };
    if (fallback) { mem.set(key, item); return; }
    return new Promise(ok => { try { const t = db.transaction(STORE_NAME, "readwrite"); t.objectStore(STORE_NAME).put(item, key); t.oncomplete = () => ok(); t.onerror = () => ok(); } catch { mem.set(key, item); ok(); } });
  }
  return { get, set, init, getBackend: () => fallback ? "memory" : "IndexedDB" };
})();

// ─── GitHub API ──────────────────────────────────────────────────────────────
async function fetchMergedPRsREST(owner, repo, token, onProgress) {
  const h = { Accept: "application/vnd.github.v3+json" };
  if (token) h.Authorization = `Bearer ${token}`;
  let page = 1, all = [], rl = null;
  while (true) {
    onProgress?.({ type: "fetching", page, accumulated: all.length });
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls?state=closed&sort=created&direction=asc&per_page=${PER_PAGE}&page=${page}`, { headers: h });
    rl = { limit: res.headers.get("X-RateLimit-Limit"), remaining: res.headers.get("X-RateLimit-Remaining"), reset: res.headers.get("X-RateLimit-Reset") };
    if (res.status === 403 && rl.remaining === "0") throw { type: "rate_limit", message: `Rate limit exceeded. Resets at ${new Date(parseInt(rl.reset) * 1000).toLocaleTimeString()}.`, rateLimit: rl };
    if (res.status === 404) throw { type: "not_found", message: `${owner}/${repo} not found or private.` };
    if (!res.ok) throw { type: "api_error", message: `API ${res.status}: ${await res.text()}` };
    const data = await res.json();
    all = all.concat(data.filter(pr => pr.merged_at));
    onProgress?.({ type: "page_done", page, accumulated: all.length, rateLimit: rl });
    const link = res.headers.get("Link");
    if (!link || !link.includes('rel="next"')) break;
    page++; await new Promise(r => setTimeout(r, 150));
  }
  return { pullRequests: all, rateLimit: rl, pages: page, source: "rest" };
}

async function fetchMergedPRsGraphQL(owner, repo, token, onProgress) {
  const query = `query($owner:String!,$repo:String!,$cursor:String){repository(owner:$owner,name:$repo){pullRequests(first:100,states:MERGED,orderBy:{field:CREATED_AT,direction:ASC},after:$cursor){nodes{number title createdAt mergedAt headRefName baseRefName url firstCommit:commits(first:1){nodes{commit{authoredDate message oid}}totalCount}lastCommit:commits(last:1){nodes{commit{authoredDate message oid}}}}pageInfo{hasNextPage endCursor}totalCount}}}`;
  let cursor = null, all = [], pg = 0;
  while (true) {
    pg++; onProgress?.({ type: "fetching", page: pg, accumulated: all.length, source: "graphql" });
    const res = await fetch(GITHUB_GRAPHQL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ query, variables: { owner, repo, cursor } }) });
    if (!res.ok) throw { type: "api_error", message: `GraphQL ${res.status}: ${await res.text()}` };
    const json = await res.json();
    if (json.errors?.length) throw { type: "graphql_error", message: json.errors.map(e => e.message).join("; ") };
    const prs = json.data?.repository?.pullRequests;
    if (!prs) throw { type: "api_error", message: "Unexpected GraphQL structure." };
    all = all.concat(prs.nodes);
    onProgress?.({ type: "page_done", page: pg, accumulated: all.length, total: prs.totalCount, source: "graphql" });
    if (!prs.pageInfo.hasNextPage) break;
    cursor = prs.pageInfo.endCursor; await new Promise(r => setTimeout(r, 100));
  }
  return { pullRequests: all, pages: pg, source: "graphql" };
}

async function fetchMergedPRs(owner, repo, token, onProgress) {
  if (token) { try { return await fetchMergedPRsGraphQL(owner, repo, token, onProgress); } catch (e) { onProgress?.({ type: "fallback", reason: e.message }); return await fetchMergedPRsREST(owner, repo, token, onProgress); } }
  return await fetchMergedPRsREST(owner, repo, null, onProgress);
}

async function validateRepo(owner, repo, token) {
  const h = { Accept: "application/vnd.github.v3+json" };
  if (token) h.Authorization = `Bearer ${token}`;
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: h });
  const rl = { limit: res.headers.get("X-RateLimit-Limit"), remaining: res.headers.get("X-RateLimit-Remaining"), reset: res.headers.get("X-RateLimit-Reset") };
  if (res.status === 404) return { valid: false, rateLimit: rl, reason: "not_found" };
  if (res.status === 403) return { valid: false, rateLimit: rl, reason: "rate_limit" };
  if (!res.ok) return { valid: false, rateLimit: rl, reason: "error" };
  const d = await res.json();
  return { valid: true, rateLimit: rl, repoInfo: { name: d.full_name, description: d.description, stars: d.stargazers_count, forks: d.forks_count, defaultBranch: d.default_branch, openIssues: d.open_issues_count, language: d.language } };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

function normalizePRs(rawPRs, source) {
  const records = [], skipped = [];
  for (const pr of rawPRs) {
    try {
      let r;
      if (source === "graphql") {
        if (!pr.mergedAt) { skipped.push(pr.number); continue; }
        const fc = pr.firstCommit?.nodes?.[0]?.commit;
        r = {
          prId: pr.number, title: pr.title || `PR #${pr.number}`,
          branchRef: pr.headRefName || "unknown", baseBranch: pr.baseRefName || "main",
          forkDate: fc?.authoredDate ? new Date(fc.authoredDate).getTime() : new Date(pr.createdAt).getTime(),
          mergeDate: new Date(pr.mergedAt).getTime(),
          commitCount: pr.firstCommit?.totalCount || null,
          lastCommitMessage: pr.lastCommit?.nodes?.[0]?.commit?.message?.split("\n")[0]?.slice(0, 120) || null,
          url: pr.url, hasPreciseForkDate: !!fc?.authoredDate,
        };
      } else {
        if (!pr.merged_at) { skipped.push(pr.number); continue; }
        r = {
          prId: pr.number, title: pr.title || `PR #${pr.number}`,
          branchRef: pr.head?.ref || "unknown", baseBranch: pr.base?.ref || "main",
          forkDate: new Date(pr.created_at).getTime(), mergeDate: new Date(pr.merged_at).getTime(),
          commitCount: pr.commits || null, lastCommitMessage: null,
          url: pr.html_url, hasPreciseForkDate: false,
        };
      }
      if (r.mergeDate < r.forkDate) r.forkDate = r.mergeDate - 1000;
      if (r.forkDate < 1104537600000) { skipped.push(r.prId); continue; }
      records.push(r);
    } catch { skipped.push(pr?.number); }
  }
  return { records, skipped };
}

// ─── Build multi-trunk topology ──────────────────────────────────────────────

function buildTopology(records) {
  // 1. Identify trunk branches = any branch that appears as a baseBranch
  const baseCounts = {};
  for (const r of records) baseCounts[r.baseBranch] = (baseCounts[r.baseBranch] || 0) + 1;

  // Sort trunks by frequency (most PRs targeting it = leftmost)
  const trunkNames = Object.keys(baseCounts).sort((a, b) => baseCounts[b] - baseCounts[a]);
  const trunkLaneMap = {}; // trunkName → lane index
  trunkNames.forEach((name, i) => { trunkLaneMap[name] = i; });
  const numTrunks = trunkNames.length;

  // 2. Sort records by forkDate for lane assignment
  const sorted = [...records].sort((a, b) => a.forkDate - b.forkDate || a.prId - b.prId);

  // 3. Assign feature lanes
  // Feature lanes start at numTrunks. Each feature needs a lane > its parent trunk lane.
  // We use a greedy approach: track when each feature lane becomes free.
  const featureLaneEnd = []; // featureLaneEnd[i] = mergeDate of current occupant (i is offset from numTrunks)
  const prLaneMap = {};      // prId → absolute lane

  for (const r of sorted) {
    const parentLane = trunkLaneMap[r.baseBranch] ?? 0;

    // Check if this PR's headRef IS a trunk itself (trunk-to-trunk merge like develop→main)
    // In that case, the "feature lane" is just the head's trunk lane
    if (trunkLaneMap[r.branchRef] !== undefined && trunkLaneMap[r.branchRef] !== trunkLaneMap[r.baseBranch]) {
      prLaneMap[r.prId] = { lane: trunkLaneMap[r.branchRef], parentLane, isTrunkMerge: true };
      continue;
    }

    // Find lowest free feature lane
    let assigned = -1;
    for (let i = 0; i < featureLaneEnd.length; i++) {
      if (featureLaneEnd[i] <= r.forkDate) { assigned = i; break; }
    }
    if (assigned === -1) { assigned = featureLaneEnd.length; featureLaneEnd.push(0); }
    featureLaneEnd[assigned] = r.mergeDate;

    prLaneMap[r.prId] = { lane: numTrunks + assigned, parentLane, isTrunkMerge: false };
  }

  const maxLane = numTrunks + featureLaneEnd.length;

  return { trunkNames, trunkLaneMap, numTrunks, prLaneMap, maxLane, baseCounts };
}

// ─── Timeline with compressed Y ─────────────────────────────────────────────
const COMPRESS = {
  sqrt: ms => Math.sqrt(ms / 60000) * 6,
  log: ms => Math.log2(ms / 60000 + 1) * 12,
  linear: ms => (ms / 3600000) * 20,
};

function buildTimeline(records, compression = "sqrt") {
  // Flatten all events
  const events = [];
  for (const r of records) {
    events.push({ type: "fork", date: r.forkDate, prId: r.prId, record: r });
    events.push({ type: "merge", date: r.mergeDate, prId: r.prId, record: r });
  }
  events.sort((a, b) => a.date - b.date || (a.type === "fork" ? 0 : 1) - (b.type === "fork" ? 0 : 1) || a.prId - b.prId);

  if (events.length === 0) return { events: [], totalHeight: 0, timeMarkers: [] };

  const fn = COMPRESS[compression] || COMPRESS.sqrt;
  const n = events.length;
  const minGap = Math.max(18, 250 / n);
  const maxGap = Math.min(250, 1800 / n);

  let y = 80;
  const positioned = [{ ...events[0], y }];
  for (let i = 1; i < n; i++) {
    const gap = Math.max(minGap, Math.min(maxGap, fn(Math.max(events[i].date - events[i - 1].date, 0))));
    y += gap;
    positioned.push({ ...events[i], y });
  }

  // Time markers
  const markers = [];
  const span = events[n - 1].date - events[0].date;
  const spanDays = span / 86400000;
  let lastKey = null;
  for (const ev of positioned) {
    const d = new Date(ev.date);
    let key, label;
    if (spanDays < 14) { key = `${d.getMonth()}-${d.getDate()}`; label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
    else if (spanDays < 180) { key = `${d.getFullYear()}-W${Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 604800000)}`; label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
    else { key = `${d.getFullYear()}-${d.getMonth()}`; label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" }); }
    if (key !== lastKey) { markers.push({ y: ev.y, label }); lastKey = key; }
  }

  return { events: positioned, totalHeight: y + 80, timeMarkers: markers };
}

// ─── Compute geometry ────────────────────────────────────────────────────────
function computeGeometry(records, timeline, topology) {
  const LANE_W = 42;
  const MARGIN_LEFT = 80;
  const laneX = (lane) => MARGIN_LEFT + lane * LANE_W;

  const { trunkNames, trunkLaneMap, numTrunks, prLaneMap, maxLane } = topology;
  const { events, totalHeight } = timeline;

  // Y lookup per PR
  const prY = {};
  for (const ev of events) {
    if (!prY[ev.prId]) prY[ev.prId] = {};
    prY[ev.prId][ev.type] = ev.y;
  }

  // Build trunk lane metadata
  const trunks = trunkNames.map((name, i) => ({
    name, lane: i, x: laneX(i),
    color: TRUNK_COLORS[i % TRUNK_COLORS.length],
    count: topology.baseCounts[name],
  }));

  // Build branch geometry
  const branches = [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const mapping = prLaneMap[r.prId];
    if (!mapping) continue;
    const ys = prY[r.prId];
    if (!ys?.fork || !ys?.merge) continue;

    const { lane, parentLane, isTrunkMerge } = mapping;
    const bx = laneX(lane);
    const px = laneX(parentLane);
    const forkY = ys.fork;
    const mergeY = ys.merge;
    const height = mergeY - forkY;
    const bend = Math.min(24, Math.max(8, height * 0.22));
    const color = isTrunkMerge
      ? TRUNK_COLORS[lane % TRUNK_COLORS.length]
      : BRANCH_COLORS[i % BRANCH_COLORS.length];

    let path;
    if (isTrunkMerge) {
      // Trunk-to-trunk: simple curve from one trunk lane to another
      path = `M ${bx} ${forkY} C ${bx} ${mergeY - height * 0.3}, ${px} ${forkY + height * 0.3}, ${px} ${mergeY}`;
    } else if (height < bend * 4) {
      // Short branch: simple arc
      path = `M ${px} ${forkY} Q ${bx} ${forkY + height * 0.5}, ${px} ${mergeY}`;
    } else {
      // Standard branch: curve out, run, curve back
      path = [
        `M ${px} ${forkY}`,
        `C ${px + (bx - px) * 0.1} ${forkY + bend}, ${bx} ${forkY + bend}, ${bx} ${forkY + bend * 2}`,
        `L ${bx} ${mergeY - bend * 2}`,
        `C ${bx} ${mergeY - bend}, ${px + (bx - px) * 0.1} ${mergeY - bend}, ${px} ${mergeY}`,
      ].join(" ");
    }

    branches.push({
      prId: r.prId, branchRef: r.branchRef, baseBranch: r.baseBranch,
      title: r.title, commitCount: r.commitCount, lastCommitMessage: r.lastCommitMessage,
      url: r.url, hasPreciseForkDate: r.hasPreciseForkDate,
      lane, parentLane, isTrunkMerge,
      laneX: bx, parentX: px, color,
      forkY, mergeY, path,
      lifetime: r.mergeDate - r.forkDate,
      lifetimeStr: formatDuration(r.mergeDate - r.forkDate),
    });
  }

  // Card layout: positioned right of the graph, with collision avoidance
  const graphRightEdge = laneX(maxLane) + 16;
  const CARD_W = 260;
  const CARD_H = 66;
  const CARD_GAP = 6;

  const cards = branches
    .filter(b => !b.isTrunkMerge) // trunk merges don't get cards (they're just lane connections)
    .map(b => ({ ...b, cardY: b.mergeY - 12, cardX: graphRightEdge }));
  cards.sort((a, b) => a.cardY - b.cardY);

  for (let i = 1; i < cards.length; i++) {
    const minY = cards[i - 1].cardY + CARD_H + CARD_GAP;
    if (cards[i].cardY < minY) cards[i].cardY = minY;
  }

  const svgW = Math.max(700, graphRightEdge + CARD_W + 20);
  const lastCardBot = cards.length > 0 ? cards[cards.length - 1].cardY + CARD_H + 40 : 0;
  const contentH = Math.max(totalHeight, lastCardBot);

  return { trunks, branches, cards, svgW, contentH, MARGIN_LEFT, LANE_W, graphRightEdge, laneX };
}

// ─── Summary ─────────────────────────────────────────────────────────────────
function summarizePRData(records) {
  if (!records?.length) return null;
  const br = {}, bb = {};
  let totMs = 0, minD = Infinity, maxD = -Infinity;
  for (const r of records) {
    br[r.branchRef] = (br[r.branchRef] || 0) + 1;
    bb[r.baseBranch] = (bb[r.baseBranch] || 0) + 1;
    totMs += r.mergeDate - r.forkDate;
    if (r.forkDate < minD) minD = r.forkDate;
    if (r.mergeDate > maxD) maxD = r.mergeDate;
  }
  const lts = records.map(r => r.mergeDate - r.forkDate).sort((a, b) => a - b);
  return {
    totalMergedPRs: records.length, uniqueBranches: Object.keys(br).length,
    uniqueBaseBranches: Object.keys(bb).length, baseBranchBreakdown: bb,
    topBranches: Object.entries(br).sort((a, b) => b[1] - a[1]).slice(0, 10),
    dateRange: { earliest: new Date(minD).toISOString(), latest: new Date(maxD).toISOString(), spanDays: Math.round((maxD - minD) / 86400000) },
    avgLifetime: formatDuration(totMs / records.length),
    medianLifetime: formatDuration(lts[Math.floor(lts.length / 2)]),
    hasCommitData: records.some(r => r.hasPreciseForkDate),
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
      {[0, 1, 2].map(i => <span key={i} className="rounded-full" style={{ width: 4, height: 4, backgroundColor: C.accent, animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
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
// BRANCH GRAPH — Now with multi-trunk topology
// ═══════════════════════════════════════════════════════════════════════════════

function BranchGraph({ records, compression, onCompressionChange, hasToken }) {
  const [hoveredPr, setHoveredPr] = useState(null);
  const [selectedPr, setSelectedPr] = useState(null);

  const graphData = useMemo(() => {
    if (!records?.length) return null;
    try {
      const topology = buildTopology(records);
      const timeline = buildTimeline(records, compression);
      const geometry = computeGeometry(records, timeline, topology);
      return { topology, timeline, geometry };
    } catch (e) { console.error("Graph error:", e); return null; }
  }, [records, compression]);

  if (!graphData) return (
    <div className="rounded-lg p-8 text-center" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.textDim }}>
      No branch data to visualize.
    </div>
  );

  const { topology, timeline, geometry } = graphData;
  const { trunks, branches, cards, svgW, contentH } = geometry;
  const activePr = selectedPr ?? hoveredPr;

  // Dense mode: >20 branches, only show card for active branch
  const isDense = branches.length > 20;

  return (
    <div className="flex flex-col gap-4">
      {/* No-token banner */}
      {!hasToken && (
        <div className="rounded-lg px-4 py-3 flex items-start gap-3" style={{ backgroundColor: C.warningDim, border: `1px solid ${C.warning}20` }}>
          <span style={{ fontSize: 16, lineHeight: 1.4 }}>⚠</span>
          <div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600, color: C.warning, marginBottom: 4 }}>
              Limited data — branch dates are approximate
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: C.textDim, lineHeight: 1.5 }}>
              Without a token, fork points use PR open time (not actual first commit). Commit messages and counts are also unavailable. Add a personal access token for a complete, accurate graph.
            </div>
            <a href="https://github.com/settings/tokens/new?description=Flux+Branch+Viewer&scopes=public_repo" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.accent, textDecoration: "none" }}>
              Generate a token ↗
            </a>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: C.textDim, fontWeight: 500 }}>Time</span>
            <div className="flex rounded-md overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
              {["sqrt", "log", "linear"].map(m => (
                <button key={m} onClick={() => onCompressionChange(m)} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "4px 10px", backgroundColor: compression === m ? C.accentDim : "transparent", color: compression === m ? C.accent : C.textMuted, border: "none", cursor: "pointer", borderRight: m !== "linear" ? `1px solid ${C.border}` : "none" }}>
                  {m === "sqrt" ? "√t" : m === "log" ? "log₂" : "t"}
                </button>
              ))}
            </div>
          </div>
          {/* Trunk legend */}
          <div className="flex items-center gap-2 ml-2">
            {trunks.map(t => (
              <div key={t.name} className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ backgroundColor: `${t.color}12`, border: `1px solid ${t.color}20` }}>
                <span className="rounded-full" style={{ width: 8, height: 8, backgroundColor: t.color }} />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: t.color, fontWeight: 600 }}>{t.name}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: C.textMuted }}>×{t.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.textMuted }}>{branches.length} branches</span>
          <span className="px-2 py-0.5 rounded" style={{ backgroundColor: records.some(r => r.hasPreciseForkDate) ? C.successDim : C.warningDim, color: records.some(r => r.hasPreciseForkDate) ? C.success : C.warning, fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>
            {records.some(r => r.hasPreciseForkDate) ? "COMMIT DATA" : "PR DATES"}
          </span>
        </div>
      </div>

      {/* Graph */}
      <div className="rounded-xl overflow-auto" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, maxHeight: "75vh" }}>
        <div style={{ position: "relative", width: svgW, height: contentH, minWidth: "100%" }}>
          <svg width={svgW} height={contentH} style={{ position: "absolute", top: 0, left: 0 }}
            role="img" aria-label={`Branch graph: ${branches.length} branches across ${trunks.length} base branches`}>
            <defs>
              {BRANCH_COLORS.map((c, i) => (
                <filter key={`g${i}`} id={`glow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="b" /><feFlood floodColor={c} floodOpacity="0.35" /><feComposite in2="b" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              ))}
            </defs>

            {/* Time marker lines */}
            {timeline.timeMarkers.map((m, i) => (
              <line key={i} x1={60} y1={m.y} x2={svgW} y2={m.y} stroke={C.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.35" />
            ))}

            {/* Trunk lines (persistent vertical lines) */}
            {trunks.map(t => (
              <line key={t.name} x1={t.x} y1={40} x2={t.x} y2={contentH - 20}
                stroke={t.color} strokeWidth={t.lane === 0 ? 3 : 2.5} strokeLinecap="round"
                opacity={activePr ? 0.25 : 0.6} style={{ transition: "opacity 0.2s" }} />
            ))}

            {/* Branch paths */}
            {branches.map(b => {
              const isActive = activePr === b.prId;
              const isDimmed = activePr !== null && !isActive;
              const ci = BRANCH_COLORS.indexOf(b.color);
              return (
                <g key={b.prId}>
                  <path d={b.path} fill="none" stroke={b.color}
                    strokeWidth={isActive ? 3 : b.isTrunkMerge ? 2.5 : 2}
                    strokeLinecap="round"
                    strokeDasharray={b.isTrunkMerge ? undefined : undefined}
                    opacity={isDimmed ? 0.08 : 1}
                    filter={isActive && ci >= 0 ? `url(#glow-${ci})` : undefined}
                    style={{ transition: "opacity 0.2s", cursor: "pointer" }}
                    onMouseEnter={() => setHoveredPr(b.prId)}
                    onMouseLeave={() => setHoveredPr(null)}
                    onClick={() => setSelectedPr(selectedPr === b.prId ? null : b.prId)}
                  />
                  {/* Fork dot on parent lane */}
                  <circle cx={b.parentX} cy={b.forkY} r={isActive ? 5 : 3}
                    fill={isDimmed ? C.textMuted : b.color} opacity={isDimmed ? 0.1 : 0.5}
                    style={{ transition: "all 0.2s" }} />
                  {/* Merge dot on parent lane */}
                  <circle cx={b.parentX} cy={b.mergeY} r={isActive ? 7 : 5}
                    fill={isDimmed ? C.textMuted : b.color} opacity={isDimmed ? 0.1 : 1}
                    style={{ transition: "all 0.2s", cursor: "pointer" }}
                    onMouseEnter={() => setHoveredPr(b.prId)}
                    onMouseLeave={() => setHoveredPr(null)}
                    onClick={() => setSelectedPr(selectedPr === b.prId ? null : b.prId)}
                  />
                </g>
              );
            })}
          </svg>

          {/* HTML overlay */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            {/* Time labels */}
            {timeline.timeMarkers.map((m, i) => (
              <div key={i} style={{ position: "absolute", left: 4, top: m.y - 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: C.textMuted, fontWeight: 500, whiteSpace: "nowrap" }}>{m.label}</div>
            ))}

            {/* Trunk labels at top */}
            {trunks.map(t => (
              <div key={t.name} style={{ position: "absolute", left: t.x - 20, top: 16, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: t.color, fontWeight: 600, textAlign: "center", width: 40, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                title={t.name}>{t.name}</div>
            ))}

            {/* Branch info cards */}
            {cards.map(card => {
              const isActive = activePr === card.prId;
              const isDimmed = activePr !== null && !isActive;
              // In dense mode, only show cards for active branch
              if (isDense && !isActive) return null;

              return (
                <div key={card.prId} style={{
                  position: "absolute", left: card.cardX, top: card.cardY, width: 250,
                  pointerEvents: "auto",
                  opacity: isDimmed ? 0.1 : isActive ? 1 : 0.7,
                  transform: isActive ? "translateX(4px)" : "translateX(0)",
                  transition: "opacity 0.2s, transform 0.2s",
                }}
                  onMouseEnter={() => setHoveredPr(card.prId)}
                  onMouseLeave={() => setHoveredPr(null)}
                  onClick={() => setSelectedPr(selectedPr === card.prId ? null : card.prId)}>

                  {/* Leader line connecting card to merge point */}
                  <svg style={{ position: "absolute", left: -(card.cardX - card.parentX), top: 12 - (card.cardY - card.mergeY + 12), overflow: "visible", pointerEvents: "none" }}
                    width={card.cardX - card.parentX} height={Math.abs(card.cardY - card.mergeY + 12) + 24}>
                    <line x1="0" y1={card.mergeY - (card.cardY - 12) + 12} x2={card.cardX - card.parentX} y2="12"
                      stroke={card.color} strokeWidth="1" opacity={isActive ? 0.4 : 0.15} strokeDasharray="3 3" />
                  </svg>

                  <div className="rounded-lg px-3 py-2" style={{
                    backgroundColor: isActive ? C.surfaceAlt : "transparent",
                    border: isActive ? `1px solid ${card.color}30` : "1px solid transparent",
                    cursor: card.url ? "pointer" : "default",
                  }}
                    onDoubleClick={() => card.url && window.open(card.url, "_blank")}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="truncate" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: card.color, fontWeight: 600, maxWidth: 140 }}
                        title={card.branchRef}>{card.branchRef}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {card.commitCount && <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: `${card.color}12`, color: card.color, fontSize: 9, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{card.commitCount}c</span>}
                        <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: C.border, color: C.textDim, fontSize: 9, fontWeight: 500, fontFamily: "'IBM Plex Mono', monospace" }}>{card.lifetimeStr}</span>
                      </div>
                    </div>
                    <div className="truncate" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: C.text, lineHeight: 1.3, fontWeight: 500 }}
                      title={card.title}>{card.title}</div>
                    {card.lastCommitMessage && <div className="truncate mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: C.textMuted }}
                      title={card.lastCommitMessage}>{card.lastCommitMessage}</div>}
                    {isActive && card.url && (
                      <a href={card.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: C.accent, textDecoration: "none", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 3 }}
                        onClick={e => e.stopPropagation()}>
                        View PR ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Dense mode: hover tooltip for branches without cards */}
            {isDense && activePr && !cards.find(c => c.prId === activePr) && (() => {
              const b = branches.find(br => br.prId === activePr);
              if (!b) return null;
              return (
                <div style={{
                  position: "absolute", left: b.parentX + 20, top: b.mergeY - 30,
                  pointerEvents: "none", zIndex: 10,
                }}>
                  <div className="rounded-lg px-3 py-2" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${b.color}30`, boxShadow: `0 4px 20px rgba(0,0,0,0.5)` }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: b.color, fontWeight: 600 }}>{b.branchRef}</div>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: C.text, fontWeight: 500 }}>{b.title}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: C.textDim }}>{b.lifetimeStr}{b.commitCount ? ` · ${b.commitCount} commits` : ""}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {isDense && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.textMuted, textAlign: "center" }}>
          Hover or click a branch to see details. Double-click a card to open the PR.
        </div>
      )}
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
    const r = [];
    const p = t => { r.push(t); setTests([...r]); };
    const f = (i, d) => { r[i] = d; setTests([...r]); };
    p({ name: "Fetch API", status: "running" }); f(0, { name: "Fetch API", status: typeof fetch === "function" ? "pass" : "fail" });
    p({ name: "Internet", status: "running" }); try { const x = await fetch("https://httpbin.org/get", { signal: AbortSignal.timeout(5000) }); f(1, { name: "Internet", status: x.ok ? "pass" : "warn", detail: `${x.status}` }); } catch (e) { f(1, { name: "Internet", status: "fail", detail: e.message }); }
    p({ name: "GitHub API", status: "running" }); try { const x = await fetch("https://api.github.com/", { signal: AbortSignal.timeout(5000) }); f(2, { name: "GitHub API", status: x.ok ? "pass" : "warn", detail: `${x.status}` }); } catch (e) { f(2, { name: "GitHub API", status: "fail", detail: e.message }); }
    p({ name: "Rate limit", status: "running" }); try { const x = await fetch("https://api.github.com/rate_limit", { signal: AbortSignal.timeout(5000) }); if (x.ok) { const d = await x.json(); const c = d.resources?.core; f(3, { name: "Rate limit", status: c?.remaining > 0 ? "pass" : "warn", detail: `${c?.remaining}/${c?.limit}` }); } else f(3, { name: "Rate limit", status: "fail" }); } catch (e) { f(3, { name: "Rate limit", status: "fail", detail: e.message }); }
    p({ name: "Cache", status: "running" }); try { await CacheManager.init(); f(4, { name: "Cache", status: "pass", detail: CacheManager.getBackend() }); } catch { f(4, { name: "Cache", status: "warn" }); }
    setRunning(false);
  };
  const ico = s => s === "running" ? <PulseDot color={C.accent} size={4} /> : s === "pass" ? <span style={{ color: C.success }}>✓</span> : s === "warn" ? <span style={{ color: C.warning }}>⚠</span> : <span style={{ color: C.error }}>✕</span>;
  const sc = s => s === "pass" ? C.success : s === "warn" ? C.warning : s === "fail" ? C.error : C.textDim;
  const done = tests.length > 0 && !running, fail = tests.some(t => t.status === "fail");
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
      {tests.length > 0 && <div className="flex flex-col gap-0.5">{tests.map((t, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1 rounded" style={{ backgroundColor: t.status === "fail" ? C.errorDim : "transparent" }}>
          <span className="w-4 text-center" style={{ fontSize: 12 }}>{ico(t.status)}</span>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: C.text, minWidth: 80 }}>{t.name}</span>
          {t.detail && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: sc(t.status), opacity: 0.8 }}>{t.detail}</span>}
        </div>
      ))}</div>}
      {done && fail && <div className="mt-2 px-2 py-1.5 rounded" style={{ backgroundColor: C.surfaceAlt, fontSize: 11, color: C.textDim }}>Network blocked. Run locally.</div>}
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
  useEffect(() => { if (!document.querySelector(`link[href*="IBM+Plex+Mono"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = FONT_LINK; document.head.appendChild(l); } }, []);

  useEffect(() => {
    const p = parseRepoInput(input); setParsed(p);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!p) { setValidation(null); return; }
    setValidation({ status: "checking" });
    debounceRef.current = setTimeout(async () => {
      try { const r = await validateRepo(p.owner, p.repo, token || null); setValidation(r.valid ? { status: "valid", repoInfo: r.repoInfo, rateLimit: r.rateLimit } : { status: "invalid", reason: r.reason, rateLimit: r.rateLimit }); }
      catch { setValidation({ status: "error" }); }
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input, token]);

  const runPipeline = useCallback((raw, source) => {
    try {
      const { records, skipped } = normalizePRs(raw, source);
      setNormalizedData({ records, skipped, source }); setPipelineError(null);
      try { setSummary(summarizePRData(records)); setSummaryError(null); }
      catch (e) { setSummaryError(e.message); }
    } catch (e) { setPipelineError(e.message); setNormalizedData(null); setSummary(null); }
  }, []);

  const handleFetch = useCallback(async () => {
    if (!parsed || validation?.status !== "valid") return;
    const ck = `${parsed.owner}/${parsed.repo}:${token ? "gql" : "rest"}`;
    const cached = await CacheManager.get(ck);
    if (cached) { setRawResult(cached); setCacheHit(true); setFetchState("done"); runPipeline(cached.pullRequests, cached.source); return; }
    setCacheHit(false); setFetchState("fetching"); setError(null); setRawResult(null); setNormalizedData(null); setSummary(null); setSummaryError(null); setPipelineError(null);
    try {
      const data = await fetchMergedPRs(parsed.owner, parsed.repo, token || null, setProgress);
      setRawResult(data); setFetchState("done"); await CacheManager.set(ck, data); runPipeline(data.pullRequests, data.source);
    } catch (e) { setError(e); setFetchState("error"); }
  }, [parsed, validation, token, runPipeline]);

  const pl = useMemo(() => parsed ? `${parsed.owner}/${parsed.repo}` : null, [parsed]);
  const canFetch = parsed && validation?.status === "valid" && fetchState !== "fetching";

  const valUI = useMemo(() => {
    if (!parsed && input.trim()) return <div className="flex items-center gap-2 mt-3" style={{ color: C.textDim, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>⬦ Enter as <span style={{ color: C.accent }}>owner/repo</span> or a GitHub URL</div>;
    if (!parsed || !validation) return null;
    if (validation.status === "checking") return <div className="flex items-center gap-2 mt-3" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}><PulseDot color={C.accent} size={5} /><span style={{ color: C.textDim }}>Looking up</span><span style={{ color: C.accent, fontWeight: 500 }}>{pl}</span><LoadingDots /></div>;
    if (validation.status === "valid") {
      const i = validation.repoInfo;
      return <div className="mt-3 flex flex-col gap-2 fade-up">
        <div className="flex items-center gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}><span style={{ color: C.success }}>✓</span><span style={{ color: C.text, fontWeight: 600 }}>{i.name}</span>{i.language && <span className="px-2 py-0.5 rounded" style={{ backgroundColor: C.accentDim, color: C.accent, fontSize: 10, fontWeight: 600 }}>{i.language}</span>}</div>
        {i.description && <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.4, maxWidth: 600 }}>{i.description}</div>}
        <div className="flex gap-4 mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.textDim }}>
          <span>★ {i.stars?.toLocaleString()}</span><span>⑂ {i.forks?.toLocaleString()}</span><span>◎ {i.openIssues?.toLocaleString()} open</span>
        </div>
      </div>;
    }
    if (validation.status === "invalid") return <div className="mt-3 rounded-lg px-4 py-3 fade-up" style={{ backgroundColor: C.errorDim, border: `1px solid ${C.error}25` }}><div className="flex items-center gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}><span style={{ color: C.error }}>✕</span><span style={{ color: C.text, fontWeight: 600 }}>{pl}</span><span style={{ color: C.error }}>— {validation.reason === "not_found" ? "not found or private" : "rate limit hit"}</span></div></div>;
    return <div className="mt-3 rounded-lg px-4 py-3 fade-up" style={{ backgroundColor: C.errorDim, border: `1px solid ${C.error}25` }}><div className="flex items-center gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}><span style={{ color: C.error }}>✕</span><span style={{ color: C.text, fontWeight: 600 }}>{pl}</span><span style={{ color: C.error }}>— could not reach GitHub</span></div></div>;
  }, [validation, parsed, pl, input]);

  const rlUI = useMemo(() => {
    const rl = validation?.rateLimit || rawResult?.rateLimit; if (!rl?.limit) return null;
    const p = (parseInt(rl.remaining) / parseInt(rl.limit)) * 100;
    return <div className="flex items-center gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: C.textDim }}>
      <span>API</span>
      <div className="relative rounded-full overflow-hidden" style={{ width: 60, height: 4, backgroundColor: C.border }}><div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${p}%`, backgroundColor: p > 50 ? C.success : p > 20 ? C.warning : C.error, transition: "width 0.5s" }} /></div>
      <span>{rl.remaining}/{rl.limit}</span>
    </div>;
  }, [validation?.rateLimit, rawResult?.rateLimit]);

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: C.bg, fontFamily: "'Outfit', sans-serif", color: C.text, backgroundImage: `radial-gradient(${C.border} 1px, transparent 1px)`, backgroundSize: "24px 24px" }}>
      <style>{`
        @keyframes pulse-dot{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
        @keyframes fade-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fade-up .4s ease-out forwards}
        .json-viewer::-webkit-scrollbar{width:6px;height:6px}.json-viewer::-webkit-scrollbar-track{background:${C.surface}}.json-viewer::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        @media(prefers-reduced-motion:reduce){.fade-up{animation:none}*{transition-duration:0s!important}}
      `}</style>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="6" r="3" fill={C.accent} /><circle cx="14" cy="22" r="3" fill={C.accent} /><circle cx="22" cy="14" r="3" fill={C.accent} opacity="0.5" /><line x1="14" y1="9" x2="14" y2="19" stroke={C.accent} strokeWidth="2" /><path d="M14 9 Q14 14 19 14" stroke={C.accent} strokeWidth="1.5" fill="none" opacity="0.5" /></svg>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Flux</h1>
          <span className="px-2 py-0.5 rounded" style={{ backgroundColor: C.accentDim, color: C.accent, fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>BRANCH VIEWER</span>
          <div className="flex-1" />{rlUI}
        </div>

        {/* Input */}
        <div className="rounded-xl p-5" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input type="text" value={input} onChange={e => { setInput(e.target.value); setFetchState("idle"); setRawResult(null); setError(null); setNormalizedData(null); setSummary(null); }}
                placeholder="owner/repo or GitHub URL"
                className="w-full px-4 py-3 rounded-lg outline-none transition-all duration-200"
                style={{ backgroundColor: C.bg, border: `1.5px solid ${parsed ? (validation?.status === "valid" ? C.success + "40" : validation?.status === "invalid" || validation?.status === "error" ? C.error + "40" : C.border) : C.border}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: C.text, caretColor: C.accent }}
                onFocus={e => e.target.style.borderColor = C.borderFocus} onBlur={e => e.target.style.borderColor = C.border}
                onKeyDown={e => e.key === "Enter" && canFetch && handleFetch()} />
              {parsed && validation?.status === "valid" && <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: C.success, fontSize: 16 }}>✓</span>}
            </div>
            <button onClick={handleFetch} disabled={!canFetch} className="px-6 py-3 rounded-lg font-semibold text-sm"
              style={{ backgroundColor: canFetch ? C.accent : C.border, color: canFetch ? C.bg : C.textMuted, cursor: canFetch ? "pointer" : "not-allowed", opacity: canFetch ? 1 : 0.6 }}
              onMouseEnter={e => canFetch && (e.target.style.boxShadow = `0 0 20px ${C.accentGlow}`)} onMouseLeave={e => e.target.style.boxShadow = "none"}>
              {fetchState === "fetching" ? <span className="flex items-center gap-2">Fetching<LoadingDots /></span> : "Fetch PRs"}
            </button>
          </div>
          <div className="mt-3">
            <button onClick={() => setShowToken(!showToken)} className="flex items-center gap-1.5 text-xs" style={{ color: C.textMuted, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
              <span style={{ transform: showToken ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s", display: "inline-block" }}>▸</span>
              Token {token ? "(set)" : "(optional — unlocks richer data)"}
            </button>
            {showToken && <div className="mt-2 fade-up">
              <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" className="w-full px-3 py-2 rounded-md outline-none text-xs" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, fontFamily: "'IBM Plex Mono', monospace", color: C.text, caretColor: C.accent }} />
              <div className="flex items-center justify-between mt-1.5">
                <p style={{ fontSize: 11, color: C.textMuted }}>Unlocks GraphQL: precise branch fork times, commit messages, 5k req/hr.</p>
                <a href="https://github.com/settings/tokens/new?description=Flux+Branch+Viewer&scopes=public_repo" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 shrink-0 ml-3" style={{ fontSize: 11, color: C.accent, fontFamily: "'IBM Plex Mono', monospace", textDecoration: "none" }}>Generate ↗</a>
              </div>
            </div>}
          </div>
          {valUI}
        </div>

        <div className="mt-4"><ConnectivityDiagnostic /></div>

        {fetchState === "fetching" && progress && <div className="mt-4 rounded-lg px-4 py-3 fade-up" style={{ backgroundColor: C.accentDim, border: `1px solid ${C.accent}20`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: C.accent }}><div className="flex items-center gap-2"><PulseDot color={C.accent} size={5} /><span>{progress.source === "graphql" ? "GraphQL" : "REST"} · Page {progress.page} · {progress.accumulated} PRs{progress.total ? ` of ${progress.total}` : ""}</span></div></div>}

        {fetchState === "error" && error && <div className="mt-4 rounded-lg px-4 py-3 fade-up" style={{ backgroundColor: C.errorDim, border: `1px solid ${C.error}25`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.error }}><div className="font-semibold mb-1">✕ {error.type === "rate_limit" ? "Rate Limit" : "Error"}</div><div style={{ color: `${C.error}cc` }}>{error.message}</div></div>}
        {pipelineError && fetchState === "done" && <div className="mt-4 rounded-lg px-4 py-3" style={{ backgroundColor: C.warningDim, border: `1px solid ${C.warning}20`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: C.warning }}>⚠ {pipelineError}. Raw data available.</div>}
        {cacheHit && fetchState === "done" && <div className="mt-4 rounded-lg px-4 py-2 flex items-center gap-2" style={{ backgroundColor: C.warningDim, border: `1px solid ${C.warning}20`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.warning }}>⚡ Cached ({cacheBackend}). Up to 15 min old.</div>}
        {normalizedData?.skipped?.length > 0 && fetchState === "done" && <div className="mt-2 px-4 py-1" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.textMuted }}>ℹ {normalizedData.skipped.length} PR{normalizedData.skipped.length > 1 ? "s" : ""} skipped</div>}

        {fetchState === "done" && rawResult && (
          <div className="mt-6 fade-up">
            <div className="flex items-center gap-1 mb-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              {["graph", "summary", "raw"].map(tab => <button key={tab} onClick={() => setActiveTab(tab)} style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, padding: "10px 16px", color: activeTab === tab ? C.accent : C.textDim, background: "none", border: "none", cursor: "pointer", borderBottom: activeTab === tab ? `2px solid ${C.accent}` : "2px solid transparent", marginBottom: -1 }}>{tab === "graph" ? "Branch Graph" : tab === "summary" ? "Summary" : "Raw JSON"}</button>)}
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                {rawResult.source && <span className="px-2 py-0.5 rounded" style={{ backgroundColor: rawResult.source === "graphql" ? C.successDim : C.warningDim, color: rawResult.source === "graphql" ? C.success : C.warning, fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{rawResult.source === "graphql" ? "GRAPHQL" : "REST"}</span>}
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.textMuted }}>{normalizedData?.records?.length ?? rawResult.pullRequests.length} PRs</span>
              </div>
            </div>

            {activeTab === "graph" && normalizedData?.records?.length > 0 && <BranchGraph records={normalizedData.records} compression={compression} onCompressionChange={setCompression} hasToken={!!token} />}
            {activeTab === "graph" && (!normalizedData?.records?.length) && <div className="rounded-lg p-8 text-center" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.textDim }}>No merged PRs to visualize.</div>}

            {activeTab === "summary" && <div className="fade-up">
              {summaryError && <div className="rounded-lg px-4 py-3 mb-4" style={{ backgroundColor: C.errorDim, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: C.error }}>{summaryError}</div>}
              {summary && <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
                  <StatPill label="Merged PRs" value={summary.totalMergedPRs} /><StatPill label="Branches" value={summary.uniqueBranches} color="#818cf8" /><StatPill label="Avg Lifetime" value={summary.avgLifetime} color="#fb923c" /><StatPill label="Median" value={summary.medianLifetime} color="#f472b6" /><StatPill label="Span" value={`${summary.dateRange.spanDays}d`} color="#a78bfa" /><StatPill label="Targets" value={summary.uniqueBaseBranches} color="#38bdf8" />
                </div>
                <div className="rounded-lg p-4" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                  <div className="text-xs font-medium mb-2" style={{ color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Activity Range</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.text }}>{new Date(summary.dateRange.earliest).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}<span style={{ color: C.textMuted, margin: "0 8px" }}>→</span>{new Date(summary.dateRange.latest).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
                  <div className="mt-1" style={{ fontSize: 11, color: summary.hasCommitData ? C.success : C.warning, fontFamily: "'IBM Plex Mono', monospace" }}>{summary.hasCommitData ? "✓ Dates from first commit (GraphQL)" : "⚠ Dates from PR open time"}</div>
                </div>
                <div className="rounded-lg p-4" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                  <div className="text-xs font-medium mb-3" style={{ color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Merge Targets</div>
                  <div className="flex flex-wrap gap-2">{Object.entries(summary.baseBranchBreakdown).sort((a, b) => b[1] - a[1]).map(([b, c]) => <span key={b} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md" style={{ backgroundColor: C.accentDim, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}><span style={{ color: C.accent }}>⑂</span><span style={{ color: C.text }}>{b}</span><span style={{ color: C.textDim }}>×{c}</span></span>)}</div>
                </div>
              </div>}
              {!summary && !summaryError && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.textDim, textAlign: "center", padding: 40 }}>No data.</div>}
            </div>}

            {activeTab === "raw" && <div className="json-viewer rounded-lg p-4 overflow-auto fade-up" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, maxHeight: 600, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, lineHeight: 1.6, color: C.textDim, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{(() => { try { return JSON.stringify(rawResult, null, 2); } catch { return String(rawResult); } })()}</div>}
          </div>
        )}

        {fetchState === "idle" && !rawResult && <div className="mt-16 flex flex-col items-center gap-4" style={{ opacity: 0.4 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="8" r="4" stroke={C.textMuted} strokeWidth="1.5" /><circle cx="24" cy="40" r="4" stroke={C.textMuted} strokeWidth="1.5" /><circle cx="36" cy="24" r="4" stroke={C.textMuted} strokeWidth="1.5" /><line x1="24" y1="12" x2="24" y2="36" stroke={C.textMuted} strokeWidth="1.5" strokeDasharray="3 3" /><path d="M24 12 Q24 24 32 24" stroke={C.textMuted} strokeWidth="1.5" strokeDasharray="3 3" fill="none" /></svg>
          <span style={{ fontSize: 14, color: C.textMuted }}>Enter a repository to explore its branch history</span>
        </div>}
      </div>
    </div>
  );
}
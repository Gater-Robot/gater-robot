#!/usr/bin/env python3
"""
Create GitHub issues (labels, milestones, tasks, and epics with checklists) from issues/issues.json

Usage:
  python scripts/create_github_issues.py --repo owner/name [--token <PAT>] [--dry-run]

Notes:
- If run inside GitHub Actions, it will use GITHUB_TOKEN and GITHUB_REPOSITORY automatically.
- Safe to re-run: it skips creating labels/milestones that already exist, and won't duplicate issues with the same title.
"""
import argparse, json, os, sys, time, urllib.request, urllib.parse

API = "https://api.github.com"

def gh_request(method, path, token, data=None, accept="application/vnd.github+json", max_retries=5, initial_delay=3):
    """
    Make a GitHub API request with retry logic and exponential backoff.
    
    Args:
        method: HTTP method (GET, POST, PATCH, etc.)
        path: API endpoint path
        token: GitHub API token
        data: Optional request body data
        accept: Accept header value
        max_retries: Maximum number of retry attempts (default: 5)
        initial_delay: Initial delay in seconds for exponential backoff (default: 3)
    """
    url = API + path
    
    for attempt in range(max_retries + 1):
        req = urllib.request.Request(url, method=method)
        req.add_header("Accept", accept)
        if token:
            req.add_header("Authorization", f"Bearer {token}")
        if data is not None:
            body = json.dumps(data).encode("utf-8")
            req.add_header("Content-Type", "application/json")
            req.data = body
        
        try:
            with urllib.request.urlopen(req) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                # Add a small sleep after successful requests to be gentle on the API
                time.sleep(0.5)
                return result
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", errors="ignore")
            
            # Check if it's a rate limit error (429 or 403 with rate limit message)
            is_rate_limit = e.code == 429 or (e.code == 403 and "rate limit" in msg.lower())
            
            if is_rate_limit and attempt < max_retries:
                # Calculate exponential backoff delay
                delay = initial_delay * (2 ** attempt)
                print(f"Rate limited ({e.code}). Retrying in {delay}s (attempt {attempt + 1}/{max_retries})...")
                time.sleep(delay)
                continue
            
            # If not rate limit or out of retries, raise the error
            raise RuntimeError(f"{method} {path} -> {e.code}: {msg}")

def ensure_labels(repo, token, label_spec, dry=False):
    existing = gh_request("GET", f"/repos/{repo}/labels?per_page=100", token)
    have = {l["name"] for l in existing}
    for name, cfg in label_spec.items():
        if name in have:
            continue
        if dry:
            print(f"[dry] create label: {name}")
            continue
        gh_request("POST", f"/repos/{repo}/labels", token, {"name": name, **cfg})

def ensure_milestones(repo, token, milestones, dry=False):
    existing = gh_request("GET", f"/repos/{repo}/milestones?per_page=100&state=all", token)
    have = {m["title"] for m in existing}
    id_map = {m["title"]: m["number"] for m in existing}
    for title in milestones:
        if title in have:
            continue
        if dry:
            print(f"[dry] create milestone: {title}")
            continue
        m = gh_request("POST", f"/repos/{repo}/milestones", token, {"title": title})
        id_map[m["title"]] = m["number"]
    # refresh
    existing = gh_request("GET", f"/repos/{repo}/milestones?per_page=100&state=all", token)
    return {m["title"]: m["number"] for m in existing}

def find_issue_by_title(repo, token, title):
    # Use search API to avoid duplicates (search limited; okay for our small set)
    q = urllib.parse.quote_plus(f'repo:{repo} is:issue "{title}" in:title')
    res = gh_request("GET", f"/search/issues?q={q}", token)
    items = res.get("items", [])
    for it in items:
        if it.get("title", "").strip().lower() == title.strip().lower():
            return it
    return None

def create_issue(repo, token, title, body, labels, milestone_num, dry=False):
    existing = find_issue_by_title(repo, token, title)
    if existing:
        return existing  # skip duplicate
    payload = {"title": title, "body": body, "labels": labels}
    if milestone_num:
        payload["milestone"] = milestone_num
    if dry:
        print(f"[dry] create issue: {title} labels={labels} milestone={milestone_num}")
        return {"number": None, "html_url": None, "title": title}
    created = gh_request("POST", f"/repos/{repo}/issues", token, payload)
    return created

def update_issue_body(repo, token, number, body, dry=False):
    if dry:
        print(f"[dry] update issue #{number} body length {len(body)}")
        return
    gh_request("PATCH", f"/repos/{repo}/issues/{number}", token, {"body": body})

def comment_issue(repo, token, number, comment, dry=False):
    if dry:
        print(f"[dry] comment on issue #{number}: {comment[:60]}...")
        return
    gh_request("POST", f"/repos/{repo}/issues/{number}/comments", token, {"body": comment})

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=os.getenv("GITHUB_REPOSITORY"), help="owner/name")
    ap.add_argument("--token", default=os.getenv("GITHUB_TOKEN"), help="GitHub token (repo scope)")
    ap.add_argument("--dry-run", action="store_true", help="Print actions without creating")
    ap.add_argument("--issues-file", default="issues/issues.json")
    args = ap.parse_args()

    if not args.repo:
        print("Missing --repo (e.g., owner/name)")
        sys.exit(2)

    with open(args.issues_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Ensure labels & milestones
    ensure_labels(args.repo, args.token, data.get("labels", {}), dry=args.dry_run)
    milestone_map = ensure_milestones(args.repo, args.token, data.get("milestones", []), dry=args.dry_run)

    # Create all TASK issues first
    task_index = {}  # key -> issue number
    task_title_to_num = {}  # title -> issue number

    for epic in data.get("epics", []):
        ms_num = milestone_map.get(epic.get("milestone")) if epic.get("milestone") else None
        for t in epic.get("tasks", []):
            t_ms = milestone_map.get(t.get("milestone")) if t.get("milestone") else ms_num
            issue = create_issue(args.repo, args.token, t["title"], t.get("body",""), t.get("labels", []), t_ms, dry=args.dry_run)
            num = issue.get("number")
            task_index[t["key"]] = num
            task_title_to_num[t["title"]] = num

    # Create EPIC issues with checklists referencing task numbers
    for epic in data.get("epics", []):
        ms_num = milestone_map.get(epic.get("milestone")) if epic.get("milestone") else None
        # Build checklist
        checklist_lines = []
        for t in epic.get("tasks", []):
            num = task_index.get(t["key"])
            if num:
                checklist_lines.append(f"- [ ] #{num} {t['title']}")
            else:
                checklist_lines.append(f"- [ ] {t['title']}")
        body = epic.get("body","") + "\n\n### Tasks\n" + "\n".join(checklist_lines)
        epic_issue = create_issue(args.repo, args.token, epic["title"], body, epic.get("labels", []), ms_num, dry=args.dry_run)
        epic_num = epic_issue.get("number")
        # Comment back-links on tasks
        if epic_num:
            for t in epic.get("tasks", []):
                num = task_index.get(t["key"])
                if num:
                    comment_issue(args.repo, args.token, num, f"Tracked by epic #{epic_num}: {epic['title']}", dry=args.dry_run)

    print("Done.")

if __name__ == "__main__":
    main()

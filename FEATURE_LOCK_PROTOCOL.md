# Feature-Lock & Branch Management Protocol
## Hysteresis Loss & Magnetic Core Saturation Simulation Project

---

## 1  The `.feature_locks.json` Schema

The `.feature_locks.json` file at the repository root is the **single source of truth** for file ownership. No developer modifies it manually — it is managed by the Lead Architect and enforced by `check_locks.py` at commit time via the pre-commit hook.

### Full Schema Reference

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "project": "hysteresis-simulation",
  "version": "1.0.0",
  "policy": "strict",

  "roles": {
    "<role-id>": {
      "branch": "feature/<branch-name>",
      "email":  "engineer@company.com"
    }
  },

  "locks": {
    "<role-id>": {
      "description": "Human-readable scope summary.",
      "owns": [
        "path/to/file.py",
        "path/to/directory/"
      ],
      "read_only_access": [
        "path/to/dependency.py"
      ]
    }
  }
}
```

### Field Semantics

| Field | Type | Description |
|---|---|---|
| `policy` | `"strict"` \| `"warn"` | `strict` blocks commits; `warn` only prints. |
| `roles.<id>.branch` | string | The only Git branch this role may commit to. |
| `locks.<id>.owns` | string[] | Files/directories **exclusively writable** by this role. |
| `locks.<id>.read_only_access` | string[] | Files this role may **read** but must not commit changes to. |

### Role → File Ownership Map

```
data-engineer
├── backend/app/utils/data_parser.py     (PRIMARY)
└── backend/app/utils/__init__.py

ml-engineer
├── backend/app/models/hysteresis_model.py  (PRIMARY)
├── backend/app/models/__init__.py
└── backend/app/utils/formulas.py

backend-engineer
├── backend/app/main.py                  (PRIMARY)
├── backend/app/api/routes.py
├── backend/app/api/__init__.py
├── backend/app/__init__.py
└── backend/requirements.txt

frontend-engineer
├── frontend/index.html                  (PRIMARY)
├── frontend/css/styles.css
├── frontend/js/app.js
├── frontend/js/charts.js
└── frontend/js/api.js
```

---

## 2  Git Branching & Merge Protocol

### 2.1  Branch Architecture

```
main (protected)
│
├── feature/data-pipeline       ← Data Engineer
├── feature/ml-engine           ← ML Engineer
├── feature/api-endpoints       ← Backend Engineer
└── feature/ui-charts           ← Frontend Engineer
```

`main` is **branch-protected**. Direct pushes are disabled. All changes
reach `main` exclusively through Pull Requests that satisfy the merge
checklist defined in §2.4.

### 2.2  Day-to-Day Workflow (per developer)

```bash
# 1. Start of every work session — sync with main
git fetch origin
git switch feature/<your-branch>
git rebase origin/main          # prefer rebase over merge to keep history linear

# 2. Make changes — run lock check before staging
python check_locks.py --role <your-role> --files <modified-files>

# 3. Stage and commit (pre-commit hook re-runs check_locks automatically)
git add <your-files-only>
git commit -m "feat(<scope>): concise description"

# 4. Push to remote
git push origin feature/<your-branch>

# 5. When feature is complete — open a Pull Request to main
#    (see merge checklist §2.4)
```

### 2.3  Commit Message Convention

Follow **Conventional Commits** (`https://www.conventionalcommits.org`):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer: Closes #issue]
```

| Type | When to use |
|---|---|
| `feat` | New capability added |
| `fix` | Bug fix |
| `refactor` | Code restructure with no behaviour change |
| `test` | Tests only |
| `docs` | Documentation only |
| `chore` | Tooling, deps, CI changes |
| `perf` | Performance improvement |

**Scope** must be one of: `data`, `models`, `api`, `ui`, `deps`, `ci`

**Examples:**
```
feat(models): implement Bertotti excess-loss term in SteinmetzModel
fix(api): handle zero-length BH dataset gracefully in /upload/bh-csv
refactor(data): extract CSV cleaning into standalone sanitise() function
```

### 2.4  Pull Request Merge Checklist

Every PR to `main` **must satisfy all items** before the Lead Architect
approves the merge:

```
□  [ ] Branch is up-to-date with main (rebased, no conflicts)
□  [ ] check_locks.py --staged --detect exits 0 (no lock violations)
□  [ ] All modified files are within the role's `owns` list
□  [ ] pytest passes (backend/  → pytest -q)
□  [ ] No hardcoded credentials, tokens, or local absolute paths
□  [ ] requirements.txt is unchanged (unless backend-engineer is author)
□  [ ] New functions have docstrings with Parameters/Returns sections
□  [ ] API routes have matching Pydantic request/response models
□  [ ] Frontend JS uses ESM imports (no global script tags for modules)
□  [ ] PR description summarises what changed and links to the task card
```

### 2.5  Handling Cross-Role Dependencies

When Engineer A's feature requires a change in a file owned by Engineer B:

1. **A opens an issue** tagged `cross-role-dependency` describing the
   required interface change.
2. **B reviews, implements, and merges** the interface change first.
3. **A rebases** their branch onto updated `main` before continuing.
4. **No exceptions** — A must not modify B's file, even temporarily.

This is the only safe way to prevent structural merge conflicts on shared
interfaces like `formulas.py` (consumed by both the ML Engineer and
Backend Engineer).

### 2.6  Emergency Hotfix Protocol

For production-critical bugs discovered on `main`:

```bash
# Lead Architect creates hotfix branch from main
git switch main && git pull
git switch -c hotfix/<short-description>

# Responsible engineer fixes the issue
git commit -m "fix(<scope>): <description>"

# Fast-path PR: only 1 reviewer required, no full checklist
# Merge to main, then rebase all feature branches
git switch main && git merge --no-ff hotfix/<short-description>
git branch -d hotfix/<short-description>

# Each developer rebases:
git switch feature/<their-branch> && git rebase origin/main
```

---

## 3  Lock Validation Script Usage (`check_locks.py`)

### Installation

The script requires no external dependencies — only the Python standard
library and the `.feature_locks.json` file at the repo root.

The git pre-commit hook (installed by `bootstrap.sh`) runs this
automatically on every `git commit`. To run manually:

```bash
# Auto-detect your role from the current branch, check staged files
python check_locks.py --staged --detect

# Specify role and files explicitly
python check_locks.py --role ml-engineer --files backend/app/models/hysteresis_model.py

# Check a set of modified files before staging
python check_locks.py --role frontend-engineer \
    --files frontend/js/app.js frontend/css/styles.css
```

### Example Output — Violation Detected

```
[INFO] Detected branch 'feature/ui-charts' → role 'frontend-engineer'
[INFO] Validating 2 staged file(s)…

[LOCK VIOLATION] Role 'frontend-engineer' attempted to modify locked files:

  File                                         Owner / Reason                 Type
  -------------------------------------------- ------------------------------ --------------------
  backend/app/utils/formulas.py                ml-engineer                    OWNS_VIOLATION

  ✗ 1 violation(s) found.  Switch to the correct branch or coordinate with the file owner.
```

### Exit Codes

| Code | Meaning |
|---|---|
| `0` | All checks passed — safe to commit |
| `1` | Lock violation(s) detected — commit blocked |
| `2` | Configuration or usage error |

---

## 4  Shared Configuration Files — Conflict-Prevention Rules

The following files are inherently cross-role and require special
handling to avoid merge conflicts:

| File | Owner | Rule |
|---|---|---|
| `backend/requirements.txt` | backend-engineer | All dependency requests go to backend-engineer via issue. Never modify directly. |
| `.feature_locks.json` | Lead Architect | Read-only for all engineers. Change requests via PR to Lead. |
| `backend/app/__init__.py` | backend-engineer | Do not add imports here from feature branches. |
| `frontend/index.html` | frontend-engineer | Other roles must not add `<script>` or `<link>` tags. |

---

*This document is version-controlled. Any protocol changes require a PR
authored by the Lead Architect with all four engineers as reviewers.*

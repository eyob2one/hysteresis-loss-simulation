#!/usr/bin/env python3
"""
check_locks.py
──────────────
Feature-lock validation guard.

Usage
-----
    python check_locks.py [--role ROLE] [--files FILE [FILE ...]]
    python check_locks.py --detect          # auto-detect role from git branch
    python check_locks.py --staged          # validate all git staged files

Exit codes
----------
    0 — All checks passed
    1 — One or more lock violations found
    2 — Configuration / usage error
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

LOCK_FILE = Path(__file__).parent / ".feature_locks.json"
BRANCH_ROLE_MAP = {
    "feature/data-pipeline": "data-engineer",
    "feature/ml-engine":     "ml-engineer",
    "feature/api-endpoints": "backend-engineer",
    "feature/ui-charts":     "frontend-engineer",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_locks() -> dict:
    if not LOCK_FILE.exists():
        print(f"[ERROR] Lock file not found: {LOCK_FILE}", file=sys.stderr)
        sys.exit(2)
    with LOCK_FILE.open() as fh:
        return json.load(fh)


def current_git_branch() -> str | None:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, check=True,
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return None


def staged_files() -> list[str]:
    """Return list of files currently staged in git."""
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            capture_output=True, text=True, check=True,
        )
        return [f.strip() for f in result.stdout.splitlines() if f.strip()]
    except subprocess.CalledProcessError:
        return []


def detect_role_from_branch(branch: str | None) -> str | None:
    if branch is None:
        return None
    return BRANCH_ROLE_MAP.get(branch)


def all_owned_files(locks: dict, exclude_role: str) -> dict[str, str]:
    """Return {normalised_path: owner_role} for every file not owned by exclude_role."""
    owned: dict[str, str] = {}
    for role, config in locks["locks"].items():
        if role == exclude_role:
            continue
        for path in config.get("owns", []):
            owned[Path(path).as_posix()] = role
    return owned


def normalise(path: str) -> str:
    return Path(path).as_posix()


# ── Core validation ───────────────────────────────────────────────────────────

def validate(role: str, files: list[str], locks: dict) -> bool:
    """
    Return True if all files are permitted for role, False if violations found.
    """
    if role not in locks["locks"]:
        print(f"[ERROR] Unknown role '{role}'. Valid roles: {list(locks['locks'])}", file=sys.stderr)
        sys.exit(2)

    owned_by_others = all_owned_files(locks, role)
    my_owned        = {normalise(p) for p in locks["locks"][role].get("owns", [])}
    my_read_only    = {normalise(p) for p in locks["locks"][role].get("read_only_access", [])}

    violations: list[tuple[str, str, str]] = []

    for file in files:
        norm = normalise(file)

        # Check if this file is owned by another role
        if norm in owned_by_others:
            violations.append((file, owned_by_others[norm], "OWNS_VIOLATION"))
            continue

        # Check if modifying a read-only entry (prefix match for directories)
        for ro_path in my_read_only:
            if norm == ro_path or norm.startswith(ro_path.rstrip("/") + "/"):
                violations.append((file, "read-only for your role", "READ_ONLY_VIOLATION"))
                break

    if not violations:
        print(f"[OK] All {len(files)} file(s) are permitted for role '{role}'.")
        return True

    print(f"\n[LOCK VIOLATION] Role '{role}' attempted to modify locked files:\n")
    print(f"  {'File':<55} {'Owner / Reason':<30} {'Type'}")
    print(f"  {'-'*55} {'-'*30} {'-'*20}")
    for file, owner, vtype in violations:
        print(f"  {file:<55} {owner:<30} {vtype}")
    print(
        f"\n  ✗ {len(violations)} violation(s) found.  "
        "Switch to the correct branch or coordinate with the file owner.\n"
    )
    return False


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Feature-lock validation for the Hysteresis Simulation project."
    )
    parser.add_argument("--role",    help="Your team role (e.g. ml-engineer)")
    parser.add_argument("--files",   nargs="+", help="Files to validate")
    parser.add_argument("--detect",  action="store_true",
                        help="Auto-detect role from current git branch")
    parser.add_argument("--staged",  action="store_true",
                        help="Validate all currently staged git files")
    args = parser.parse_args()

    locks = load_locks()
    role: str | None = args.role

    if args.detect or args.staged:
        branch = current_git_branch()
        role = detect_role_from_branch(branch)
        if role is None:
            print(
                f"[WARN] Could not map branch '{branch}' to a role. "
                "Specify --role explicitly.",
                file=sys.stderr,
            )
            sys.exit(2)
        print(f"[INFO] Detected branch '{branch}' → role '{role}'")

    if role is None:
        parser.print_help()
        sys.exit(2)

    files = args.files or []
    if args.staged:
        staged = staged_files()
        if not staged:
            print("[INFO] No staged files found.")
            sys.exit(0)
        files = staged
        print(f"[INFO] Validating {len(files)} staged file(s)…")

    if not files:
        print("[INFO] No files specified — nothing to validate.")
        sys.exit(0)

    passed = validate(role, files, locks)
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()

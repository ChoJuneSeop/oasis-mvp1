from __future__ import annotations

import hashlib
from pathlib import Path
import subprocess


def git_text(root: Path, *args: str) -> str:
    return subprocess.check_output(
        ["git", *args], cwd=root, text=True
    ).strip()


def git_blob(root: Path, ref: str, path: str) -> str:
    return git_text(root, "rev-parse", f"{ref}:{path}")


def git_head(root: Path) -> str:
    return git_text(root, "rev-parse", "HEAD")


def is_ancestor(root: Path, ancestor: str, descendant: str = "HEAD") -> bool:
    return subprocess.run(
        ["git", "merge-base", "--is-ancestor", ancestor, descendant],
        cwd=root,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    ).returncode == 0


def path_is_clean(root: Path, path: str) -> bool:
    worktree = subprocess.run(
        ["git", "diff", "--quiet", "--", path],
        cwd=root,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    ).returncode
    staged = subprocess.run(
        ["git", "diff", "--cached", "--quiet", "--", path],
        cwd=root,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    ).returncode
    return worktree == 0 and staged == 0


def sha256_lf_normalized(path: Path) -> tuple[str, str]:
    raw = path.read_bytes()
    actual = hashlib.sha256(raw).hexdigest()
    normalized = hashlib.sha256(raw.replace(b"\r\n", b"\n")).hexdigest()
    return actual, normalized

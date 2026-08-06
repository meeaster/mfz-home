#!/usr/bin/env python3
"""Run Codex built-in image generation in a reusable isolated worker home."""

from __future__ import annotations

import argparse
import contextlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from typing import Iterator


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
DEFAULT_MODEL = "gpt-5.6-sol"
DEFAULT_EFFORT = "high"


class RunnerError(RuntimeError):
    pass


def default_worker_home() -> Path:
    override = os.environ.get("CODEX_IMAGEGEN_HOME")
    if override:
        return Path(override).expanduser()
    if os.name == "nt":
        base = Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local")
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_STATE_HOME") or Path.home() / ".local" / "state")
    return base / "codex-imagegen"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate or edit one image with Codex's built-in image_gen tool."
    )
    parser.add_argument("--brief", required=True, type=Path, help="Authoritative UTF-8 brief")
    parser.add_argument("--out", required=True, type=Path, help="Final PNG destination")
    parser.add_argument("--image", action="append", default=[], type=Path, help="Ordered input image; repeat up to five times")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Codex model (default: {DEFAULT_MODEL})")
    parser.add_argument(
        "--effort",
        default=DEFAULT_EFFORT,
        choices=("low", "medium", "high", "xhigh", "max", "ultra"),
        help=f"Codex reasoning effort (default: {DEFAULT_EFFORT})",
    )
    parser.add_argument("--worker-home", type=Path, help="Reusable isolated state root")
    parser.add_argument("--auth-source", type=Path, help="File-backed Codex auth.json to seed once")
    parser.add_argument("--timeout", type=int, default=600, help="Maximum Codex runtime in seconds")
    parser.add_argument("--overwrite", action="store_true", help="Replace an existing output")
    parser.add_argument("--open", action="store_true", dest="open_output", help="Open the unchanged final image with the platform viewer")
    return parser.parse_args()


def resolved(path: Path) -> Path:
    return path.expanduser().resolve()


def is_within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def ensure_private_dir(path: Path) -> None:
    if path.is_symlink():
        raise RunnerError(f"Managed worker directory must not be a symlink: {path}")
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    if not path.is_dir():
        raise RunnerError(f"Managed worker path is not a directory: {path}")
    if os.name != "nt":
        path.chmod(0o700)


def source_auth_path(explicit: Path | None) -> Path:
    if explicit:
        return resolved(explicit)
    override = os.environ.get("CODEX_IMAGEGEN_AUTH_SOURCE")
    if override:
        return resolved(Path(override))
    ordinary_home = Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex")
    return resolved(ordinary_home / "auth.json")


def seed_auth(worker_codex_home: Path, source: Path) -> None:
    destination = worker_codex_home / "auth.json"
    if destination.is_symlink():
        raise RunnerError(f"Worker auth destination must not be a symlink: {destination}")
    if destination.exists():
        if not destination.is_file():
            raise RunnerError(f"Worker auth destination is not a file: {destination}")
        return
    if not source.is_file():
        raise RunnerError(
            "No file-backed Codex login was found. Authenticate the isolated worker once with "
            f"CODEX_HOME={worker_codex_home} codex login, then rerun."
        )
    if source == destination:
        raise RunnerError("The auth source and worker auth destination are the same missing file.")
    descriptor, temporary_name = tempfile.mkstemp(prefix=".auth-", dir=worker_codex_home)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as target, source.open("rb") as auth:
            shutil.copyfileobj(auth, target)
        if os.name != "nt":
            temporary.chmod(0o600)
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


@contextlib.contextmanager
def worker_lock(path: Path) -> Iterator[None]:
    ensure_private_dir(path.parent)
    if path.is_symlink():
        raise RunnerError(f"Worker lock must not be a symlink: {path}")
    flags = os.O_CREAT | os.O_RDWR
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    descriptor = os.open(path, flags, 0o600)
    handle = os.fdopen(descriptor, "a+b")
    try:
        if os.name == "nt":
            import msvcrt

            if path.stat().st_size == 0:
                handle.write(b"\0")
                handle.flush()
            handle.seek(0)
            msvcrt.locking(handle.fileno(), msvcrt.LK_LOCK, 1)
        else:
            import fcntl

            fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        yield
    finally:
        if os.name == "nt":
            import msvcrt

            handle.seek(0)
            with contextlib.suppress(OSError):
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
        else:
            import fcntl

            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        handle.close()


def remove_children(path: Path) -> None:
    ensure_private_dir(path)
    for child in path.iterdir():
        if child.is_dir() and not child.is_symlink():
            shutil.rmtree(child)
        else:
            child.unlink()


def isolated_environment(root: Path, codex_home: Path) -> dict[str, str]:
    home = root / "home"
    config = home / ".config"
    data = home / ".local" / "share"
    state = home / ".local" / "state"
    cache = home / ".cache"
    for path in (home, config, data, state, cache):
        ensure_private_dir(path)

    allowed = (
        "PATH",
        "LANG",
        "LC_ALL",
        "SSL_CERT_FILE",
        "SSL_CERT_DIR",
        "REQUESTS_CA_BUNDLE",
        "CURL_CA_BUNDLE",
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "NO_PROXY",
        "SYSTEMROOT",
        "WINDIR",
        "COMSPEC",
        "PATHEXT",
        "TEMP",
        "TMP",
    )
    environment = {key: os.environ[key] for key in allowed if key in os.environ}
    environment.update(
        {
            "HOME": str(home),
            "USERPROFILE": str(home),
            "CODEX_HOME": str(codex_home),
            "XDG_CONFIG_HOME": str(config),
            "XDG_DATA_HOME": str(data),
            "XDG_STATE_HOME": str(state),
            "XDG_CACHE_HOME": str(cache),
        }
    )
    return environment


def build_command(
    codex: str,
    args: argparse.Namespace,
    run_dir: Path,
    final_message: Path,
    staged_images: list[Path],
) -> list[str]:
    instruction = (
        "The complete authoritative image specification is supplied in the stdin block. "
        f"It defines the ordered roles of all {len(staged_images)} attached image(s). "
        "Call the built-in image_gen tool exactly once. Preserve every stated count, relationship, "
        "color, invariant, and exclusion. Do not explore other files, use MCPs, edit project files, "
        "or use an API, script, or external-service fallback. Wait for completion, then report only "
        "the generated image path and whether it displayed inline."
    )
    command = [
        codex,
        "exec",
        "--ephemeral",
        "--ignore-user-config",
        "--ignore-rules",
        "--json",
        "--enable",
        "image_generation",
        "--disable",
        "plugins",
        "--disable",
        "apps",
        "--disable",
        "remote_plugin",
        "--disable",
        "shell_tool",
        "--disable",
        "unified_exec",
        "--disable",
        "code_mode",
        "--disable",
        "code_mode_host",
        "--disable",
        "multi_agent",
        "--disable",
        "multi_agent_v2",
        "--disable",
        "browser_use",
        "--disable",
        "browser_use_external",
        "--disable",
        "browser_use_full_cdp_access",
        "--disable",
        "computer_use",
        "--disable",
        "in_app_browser",
        "-c",
        'cli_auth_credentials_store="file"',
        "-c",
        f'model_reasoning_effort="{args.effort}"',
        "-c",
        'approval_policy="never"',
        "-c",
        'web_search="disabled"',
        "-c",
        'agents.enabled=false',
        "-c",
        'default_permissions="codex-imagegen"',
        "-c",
        f'permissions.codex-imagegen.filesystem={{":minimal"="read",{json.dumps(str(run_dir))}="read"}}',
        "--model",
        args.model,
        "--skip-git-repo-check",
        "--output-last-message",
        str(final_message),
    ]
    if staged_images:
        command.extend(["--image", *[str(path) for path in staged_images]])
    command.extend(["--", instruction])
    return command


def write_private_text(path: Path, content: str) -> None:
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}-", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            output.write(content)
        if os.name != "nt":
            temporary.chmod(0o600)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def write_last_run(root: Path, completed: subprocess.CompletedProcess[str]) -> None:
    write_private_text(root / "last-stdout.jsonl", completed.stdout)
    write_private_text(root / "last-stderr.txt", completed.stderr)


def validate_png(path: Path) -> None:
    if not path.is_file() or path.stat().st_size == 0:
        raise RunnerError(f"Codex did not create a non-empty image at {path}")
    with path.open("rb") as image:
        if image.read(len(PNG_SIGNATURE)) != PNG_SIGNATURE:
            raise RunnerError(f"Codex output is not a PNG: {path}")


def publish_output(source: Path, output: Path, overwrite: bool) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{output.name}-", suffix=".tmp", dir=output.parent
    )
    os.close(descriptor)
    temporary = Path(temporary_name)
    try:
        shutil.copy2(source, temporary)
        validate_png(temporary)
        if overwrite:
            os.replace(temporary, output)
        else:
            try:
                os.link(temporary, output)
            except FileExistsError as error:
                raise RunnerError(
                    f"Output already exists; choose a versioned path or pass --overwrite: {output}"
                ) from error
            temporary.unlink()
        validate_png(output)
    finally:
        temporary.unlink(missing_ok=True)


def open_original(path: Path) -> tuple[bool, str | None]:
    try:
        if os.name == "nt":
            os.startfile(path)  # type: ignore[attr-defined]
        else:
            program = "open" if sys.platform == "darwin" else "xdg-open"
            opener = shutil.which(program)
            if not opener:
                return False, f"{program} is not installed"
            subprocess.Popen(
                [opener, str(path)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
        return True, None
    except OSError as error:
        return False, str(error)


def run(args: argparse.Namespace) -> dict[str, object]:
    brief_path = resolved(args.brief)
    if not brief_path.is_file():
        raise RunnerError(f"Brief does not exist: {brief_path}")
    brief = brief_path.read_text(encoding="utf-8")
    if not brief.strip():
        raise RunnerError("Brief is empty.")

    if len(args.image) > 5:
        raise RunnerError("The built-in image tool accepts at most five input images.")
    images = [resolved(path) for path in args.image]
    for image in images:
        if not image.is_file():
            raise RunnerError(f"Input image does not exist: {image}")

    output = resolved(args.out)
    if output.exists() and not args.overwrite:
        raise RunnerError(f"Output already exists; choose a versioned path or pass --overwrite: {output}")

    root = resolved(args.worker_home) if args.worker_home else resolved(default_worker_home())
    for path in (output, *images):
        if is_within(path, root):
            raise RunnerError("Input images and final output must be outside the reusable worker home.")

    codex = shutil.which("codex")
    if not codex:
        raise RunnerError("codex is not installed or is not on PATH.")

    codex_home = root / "codex"
    runs = root / "runs"
    generated = codex_home / "generated_images"
    final_message = root / "last-final.txt"
    for path in (root, codex_home, runs):
        ensure_private_dir(path)

    with worker_lock(root / "worker.lock"):
        seed_auth(codex_home, source_auth_path(args.auth_source))
        remove_children(runs)
        run_dir = Path(tempfile.mkdtemp(prefix="run-", dir=runs))
        try:
            staged_dir = run_dir / "images"
            staged_images: list[Path] = []
            if images:
                ensure_private_dir(staged_dir)
                for index, image in enumerate(images, start=1):
                    staged = staged_dir / f"{index:02d}-{image.name}"
                    shutil.copy2(image, staged)
                    staged_images.append(staged)

            remove_children(generated)
            final_message.unlink(missing_ok=True)
            command = build_command(codex, args, run_dir, final_message, staged_images)
            completed = subprocess.run(
                command,
                cwd=run_dir,
                env=isolated_environment(root, codex_home),
                input=brief,
                text=True,
                capture_output=True,
                timeout=args.timeout,
                check=False,
            )
        except subprocess.TimeoutExpired as error:
            raise RunnerError(f"Codex exceeded the {args.timeout}-second timeout.") from error
        finally:
            shutil.rmtree(run_dir, ignore_errors=True)

        write_last_run(root, completed)
        if completed.returncode != 0:
            raise RunnerError(
                f"Codex failed with exit code {completed.returncode}; private diagnostics are in {root}"
            )

        candidates = sorted(generated.rglob("*.png"), key=lambda path: path.stat().st_mtime_ns)
        if len(candidates) != 1:
            raise RunnerError(f"Expected exactly one generated PNG, found {len(candidates)}.")
        source = candidates[0]
        validate_png(source)

        publish_output(source, output, args.overwrite)

        opened = False
        open_error = None
        if args.open_output:
            opened, open_error = open_original(output)

        return {
            "effort": args.effort,
            "model": args.model,
            "open_error": open_error,
            "opened": opened,
            "output_path": str(output),
            "source_path": str(source),
            "worker_home": str(root),
        }


def main() -> int:
    try:
        result = run(parse_args())
    except (OSError, UnicodeError, RunnerError) as error:
        print(f"codex-imagegen: {error}", file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

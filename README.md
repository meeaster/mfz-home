# Personal Mindframe-Z home

The source for Mark's AI tool configuration and workspace guidance, rendered by
[mindframe-z](https://github.com/meeaster/mindframe-z).

## Setting up a new machine

The machine needs bash, git, and curl, plus Git access to this repository and the
other repositories it declares.

1. Install OpenCode, then give it this prompt:

   ```text
   Set up mindframe-z on this machine. Fetch
   https://raw.githubusercontent.com/meeaster/mindframe-z/main/docs/agent-setup.md
   and follow its steps. My home: https://github.com/meeaster/mfz-home, profile personal.
   Before running mfz setup, put ~/.local/bin/mise-guard first on PATH.
   ```

   Or by hand:

   ```sh
   curl -fsSL https://raw.githubusercontent.com/meeaster/mindframe-z/main/scripts/install.sh | bash
   export PATH="$HOME/.local/bin/mise-guard:$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH"
   mfz --profile personal setup --clone https://github.com/meeaster/mfz-home
   ```

   `~/.local/bin/mise-guard` must be on `PATH` before setup starts. Setup's first
   apply creates the wrapper there, and the tool installs that follow only go through
   Socket Firewall if setup finds the wrapper ahead of the real mise.

2. To work on the engine, run `mfz engine use source`.
3. Enable the user services this home ships, such as
   `systemctl --user enable --now opencode-serve`.

Rerun `mfz setup` to update the machine later.

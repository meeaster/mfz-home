# The GitHub remote MCP authenticates with the current GitHub CLI credential. mise activates
# only at the end of .zshrc, so fall back to its gh shim when gh is not on PATH yet.
_mfz_gh=$(command -v gh || print -r -- "$HOME/.local/share/mise/shims/gh")
[ -x "$_mfz_gh" ] && export GITHUB_MCP_TOKEN="$("$_mfz_gh" auth token 2>/dev/null)"
unset _mfz_gh

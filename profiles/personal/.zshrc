ANALYSIS_RUNTIME=docker
if [ -r "$HOME/.deno/env" ]; then
  . "$HOME/.deno/env"
fi

# Finalize shared zsh setup after profile-specific overrides are applied.
mfz_finalize_zsh
path=("$HOME/.local/bin" ${path:#$HOME/.local/bin})
rehash

unset -f mfz_finalize_zsh

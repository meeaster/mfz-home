ANALYSIS_RUNTIME=docker
if [ -r "$HOME/.deno/env" ]; then
  . "$HOME/.deno/env"
fi

# Finalize shared zsh setup after profile-specific overrides are applied.
mfz_finalize_zsh
# The mise-guard wrapper must stay ahead of the real mise in ~/.local/bin.
path=("$HOME/.local/bin/mise-guard" "$HOME/.local/bin" ${${path:#$HOME/.local/bin}:#$HOME/.local/bin/mise-guard})
rehash

unset -f mfz_finalize_zsh

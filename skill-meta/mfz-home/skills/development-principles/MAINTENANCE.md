# Maintenance

## Provenance and adaptation

The former `opencode/commands/code-like-luke.md` became a skill on 2026-08-14 and was renamed `development-principles` on 2026-08-19. The [original gist](https://gist.github.com/Hona/53142c07c9decb735392f132ace34003) is inspiration, not a pinned upstream or runtime dependency. Local adaptations cover risk-proportional failure handling, bounded code health, durable tests, and phase-owned structural decisions. An upstream comparison must preserve these choices rather than restore text mechanically.

The runtime retains `disable-model-invocation: true` while environment instructions explicitly require loading it for software work. Evaluate explicit loading and environment routing separately from autonomous discovery when changing invocation. Catalog text alone does not establish that routing works.

For changes to extraction policy or test strategy, consult the [historical experiments](LOG.md) and the evidence limits in [EVALS.md](EVALS.md). Those experiments rejected automatic extraction as an expectation for unaccepted narrow feature scope.

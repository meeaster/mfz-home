# Maintenance

## Runtime dependencies

- The Personal Mindframe-Z home renders `opencode/agents/prototype.md` when the profile enables it.
- The `prototype` skill supplies the logic and UI procedures.
- The configured OpenAI provider must expose Terra `max` for the base profile and Sol `medium` for the Personal profile.

## Change procedure

1. Keep task behavior in the `prototype` skill and model selection in profile configuration.
2. Revisit model assignments only after matched local evaluations on representative logic, UI, and unsettled design questions.
3. Record the evidence in `docs/prototype-agent-evaluation.md` and behavioral decisions in `LOG.md`.
4. Run `mfz apply`, inspect the rendered agent, and verify the active profile's model, prompt, mode, and permissions.

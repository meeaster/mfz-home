# Maintenance

`context-transfer` owns the consumer, destination, intentional-dependency, and reference contract. When that skill changes, check the local-dependency and version-sensitive-reference scenarios in [EVALS.md](EVALS.md). Keep the session-independence floor here rather than duplicating generic transfer guidance.

Destination adapters supply schemas, privacy rules, publication mechanics, and available session retrieval. A new adapter requirement belongs in its destination unless it changes the portable distinction between Session Capture and Practice.

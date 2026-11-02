# Services

This directory contains long-lived services and operational repositories.

Each service should own or clearly identify its deployment definitions, lifecycle
automation, observability configuration, backup and restore procedures, and
operational runbooks. Keep credentials, private identities, logs, databases, and
other mutable runtime state outside the workspace unless explicitly governed by
the service repository.

# Vision

## Problem

Artifacts written inside a rich conversation or workspace often assume context
that disappears when another human or agent consumes them. The opposite reaction
is also harmful: maximizing self-containment, detail, and citations can make a
local plan or human report noisy, brittle, and less useful.

## Intended Behavior

Context Transfer establishes a transfer contract from source context to intended
consumer and destination. It preserves context required for the intended use,
relies only on deliberately guaranteed destination context, shapes detail for the
primary consumer, and uses proportional references rather than mechanical
provenance.

The skill can operate directly for a generic artifact or serve as shared behavior
inside an artifact-specific skill. The owning workflow retains control of format,
storage, review, and publication.

## Portability

The skill itself has no required platform, artifact type, repository layout,
workspace, publishing system, or provider. Portability is one transfer strategy,
not a universal maximum; intentional local dependencies remain valid when the
contract guarantees them.

## Success

An intended consumer can understand or act from the artifact and its declared
accessible context without reconstructing how it was produced. The artifact
neither hides required assumptions nor carries irrelevant production history.

## Non-Goals

- Defining templates or publication workflows for particular artifact hosts.
- Making every artifact globally standalone or suitable for every possible reader.
- Requiring citations for every distilled observation.
- Replacing artifact-specific authority, privacy, validation, or lifecycle rules.
- Publishing, sending, committing, or uploading a draft without separate
  authority from the owning workflow or user.
- Treating likely secondary AI consumption as permission to ignore the primary
  human consumer.

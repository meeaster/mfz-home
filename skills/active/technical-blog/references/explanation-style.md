# Explaining a design through discovery

These annotations draw on [OpenCode Reloaded](https://anoma.ly/notes/opencode-reloaded), read on 2026-09-23. They describe reusable techniques rather than a mandatory template. The postscript is outside the intended style reference.

## Give a technical benefit a human opening

The opening describes the "subtle pleasures of hot reloading" and remaining "blissfully inert." Its elaborate phrasing gives a tiny inconvenience comic importance. It then becomes specific: an agent can make a tool and invoke it in the same turn.

The move works because the concrete benefit arrives promptly. A brief observation can establish voice, but a long philosophical introduction would postpone the subject.

## Make the reader understand the need first

> "Let's start with a naive implementation and refine it together as it fails us in one way or another."

This sentence establishes the explanatory contract. The reader will follow reasonable attempts and discover what they cannot handle. The shared catalog stays central as provider refreshes, policy changes, and output limits expose different consequences of mutation.

The examples have different explanatory jobs. Disabling a model twice looks harmless; halving its output limit twice makes repeated application visible. The abstraction arrives after the reader understands the distinction.

## Let reactions carry transitions

> "Alas, there's already a bug."

> "But before we fix this, let's make things worse."

The first briefly judges the result. The second is both a joke and a promise to deepen the problem. Most surrounding sentences explain ordinary actions and consequences, which keeps these reactions effective.

Use short reactions at actual discoveries. Copying their wording or inserting one after every example would make the voice mechanical.

## Explain behavior before vocabulary

> "disabling an already-disabled model does nothing. It's idempotent."

The reader receives the concept before its label. The next example tests that concept with an operation that behaves differently. This is more useful than opening with definitions detached from the problem.

The broader sentence rhythm follows the same logic: longer sentences carry a condition and consequence, then a short sentence marks what has been learned. Sentence length follows the reasoning.

## Use questions that arise from the design

After explaining registered transformations, the article asks how the provider data can still refresh hourly. After explaining refreshes, it turns to plugin files being added, edited, or removed.

These transitions work because the questions remain unresolved in the reader's current understanding. The sections explain the mechanism under progressively broader conditions without starting over with a different example.

## Return to the original failures

The solution rebuilds from an empty catalog and runs each transformation once in order. The article then explains why refreshes no longer undo policy, missing providers disappear, and halving happens once.

That return establishes what the design achieves. A general claim such as "more reliable and maintainable" would leave the earlier failures unresolved.

## Account for the page format

The source places code and embedded demonstrations between prose passages. A text extraction contains interface labels and repeated states that are not part of the narrative. When consulting the original, distinguish those elements from the author's prose.

A Markdown post can make the same behavior visible with a compact trace or before-and-after example. It need not reproduce the website's presentation or its exact headings to preserve the explanatory flow.

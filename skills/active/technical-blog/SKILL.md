---
name: technical-blog
description: Write a conversational, source-grounded technical blog post from a PR, implementation, or technical idea. Explicit invocation only.
slash: true
metadata:
  opencode/autoinvoke: false
---

# Technical blog

Write an explanation that lets the reader discover why a design makes sense. Combine concrete reasoning with a conversational voice and occasional dry humor. Use only when explicitly requested.

## Establish the story

- Identify the intended reader, the question the post answers, and the source material. Use supplied context first; ask only when an unresolved choice would materially change the post.
- For a PR, inspect its description, diff, and relevant tests. Read the previous implementation and surrounding dependencies where they determine behavior or explain a decision. Stop expanding when the problem, before-and-after behavior, decisive mechanism, and meaningful limitations have evidence.
- Distinguish implementation facts, documented rationale, and illustrative teaching examples. A hypothetical failed approach can explain a constraint, but must not become an invented account of what the developers tried. First-person claims about decisions or experiences need source or user support.
- Choose one bounded question and a running example that makes its consequences observable. Match the length to the explanation the subject supports. A small change may need only one surprising case.

## Develop the explanation

Read [the annotated style reference](references/explanation-style.md) before drafting or substantially revising prose. It explains the intended rhythm and flow. Fetch the linked original article only when full-context comparison would help calibrate the voice or when the user asks; the local reference is sufficient for ordinary use.

Use this progression as a starting point, adapting it to the material rather than imposing a fixed outline:

1. Begin with a recognizable inconvenience, desire, or concrete behavior. Give the reader a reason to care before introducing architecture.
2. Reduce the subject to a question the running example can answer. When useful, begin with a plausible approach and introduce a real constraint or counterexample that exposes its limit.
3. Explain the consequence before introducing the next design change. Let the reader understand the need for an abstraction before naming it.
4. Show how the chosen mechanism handles the earlier example. Return to the failures or constraints that motivated it, including limits that qualify the apparent success.
5. Generalize only after the concrete case is understandable. End when the opening question has an answer, with a brief account of what the reader can now do or understand.

Each section should answer a question raised by the preceding explanation. Reuse the example so the reader spends attention on the changing behavior rather than learning new domain details. If the source supports no sequence of failed designs, explain its central distinction directly.

## Write the voice

- Keep mechanisms concrete: name the actor, operation, condition, and consequence. Explain unfamiliar terminology through behavior before naming it.
- Mix longer causal sentences with short discoveries or reactions. Let a short sentence mark a genuine turn rather than clipping every thought into the same rhythm.
- Use occasional dry humor, understatement, or mock-formal phrasing where it helps the opening or a transition. Keep the surrounding explanation direct. Humor is optional; repeated catchphrases, profanity, and theatrical vocabulary are not style requirements.
- Invite the reader to reason alongside the author. Treat naive attempts as reasonable and their limitations as worth understanding.
- Introduce code with a purpose and follow it with the important consequence. Where sequence matters, use a small trace, before-and-after state, or numerical example. Include only detail needed to follow the argument.
- Write connected prose with useful headings. Lists and tables belong where they explain a relationship better than prose, not as a default replacement for the article.

## Check and deliver

- Check technical claims against the source, especially claims implied by silence, success, or an empty result. Describe test assertions separately from tests actually run.
- Read for causal continuity: does each change answer an established need, and does each section advance the reader's understanding? Cut repeated conclusions and generic benefits.
- Preserve intentional voice while removing filler and unsupported claims. Do not flatten the draft into reference documentation or force jokes into every section.
- Deliver Markdown by default, using the requested destination. Link the underlying sources and identify the relevant PR or revision when discussing historical behavior. Mark invented names, counts, and scenarios as illustrative where they could be mistaken for observations.
- A blog draft does not authorize modifying a PR description or publishing the article. For a requested PR-oriented explanation, adapt the length and emphasis to that audience while retaining the reasoning.

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
- When the source is an implementation handoff, notes, or a design, check its claims against the code and configuration before repeating them, and correct or flag any that don't hold.
- For a walkthrough of proposed or merged changes that span several repositories or systems, read [implementation walkthroughs](references/implementation-walkthrough.md) before outlining.
- Distinguish implementation facts, documented rationale, and illustrative teaching examples. A hypothetical failed approach can explain a constraint, but must not become an invented account of what the developers tried. First-person claims about decisions or experiences need source or user support.
- Choose one bounded question and a running example that makes its consequences observable. Match the length to the explanation the subject supports. A small change may need only one surprising case.

## Develop the explanation

Read [the annotated style reference](references/explanation-style.md) before drafting or substantially revising prose. It explains the intended rhythm and flow. Fetch the linked original article only when full-context comparison would help calibrate the voice or when the user asks; the local reference is sufficient for ordinary use.

Use this progression as a starting point, adapting it to the material rather than imposing a fixed outline:

1. Begin with a recognizable inconvenience, desire, or concrete behavior, in a few lines or a single visual such as the key measurements. Give the reader a reason to care, and enough of the outcome that a reader who stops after the opening screen still knows what changes and why.
2. Establish prerequisites before the mechanism. When the subject sits inside a larger system, lead with an architecture diagram of the parts the explanation touches, define unfamiliar terms briefly, and show the data or state the change acts on. Skip what the intended reader already knows. If a known risk could invalidate the approach, state it here, before the reader works through the details.
3. Reduce the subject to a question the running example can answer. When useful, begin with a plausible approach and introduce a real constraint or counterexample that exposes its limit.
4. Explain the consequence before introducing the next design change. Let the reader understand the need for an abstraction before naming it.
5. Show how the chosen mechanism handles the earlier example. Return to the failures or constraints that motivated it, including limits that qualify the apparent success.
6. Generalize only after the concrete case is understandable. End when the opening question has an answer, with a brief account of what the reader can now do or understand.

Each section should answer a question raised by the preceding explanation. Reuse the example so the reader spends attention on the changing behavior rather than learning new domain details. If the source supports no sequence of failed designs, explain its central distinction directly.

Keep the main path on the opening question. Put side findings, such as your own reproductions, runtime quirks, and edge cases that don't change the reader's understanding, in a collapsible aside or a closing details section.

## Make it easy to read

- Use prose wherever the explanation needs it, and keep everything the reader needs. Make long explanations easy to move through with structure rather than cuts: short paragraphs, new paragraph breaks, lists, quotes from the source such as a PR description or code comment, and visuals, so no passage reads as a wall of text.
- Use visuals where they show something more clearly than sentences: architecture and data-flow diagrams, state diagrams, before-and-after states, traces, charts of measurements, and annotated real data. Let the nearby prose say what each one answers and what it means.
- Give each visual one question to answer. Reuse the running example's entities and labels across visuals so readers compare behavior rather than relearn a diagram.
- Prefer real data produced by the subject's own code or measurements over invented values, and label illustrative models as such.
- In Markdown, use Mermaid code fences or diagrams rendered to SVG at build time.

## Write the voice

- Keep mechanisms concrete: name the actor, operation, condition, and consequence. Explain unfamiliar terminology through behavior before naming it.
- Mix longer causal sentences with short discoveries or reactions. Let a short sentence mark a genuine turn rather than clipping every thought into the same rhythm.
- Use occasional dry humor, understatement, or mock-formal phrasing where it helps the opening or a transition. Keep the surrounding explanation direct. Humor is optional; repeated catchphrases, profanity, and theatrical vocabulary are not style requirements.
- Invite the reader to reason alongside the author. Treat naive attempts as reasonable and their limitations as worth understanding.
- Introduce code with a purpose and follow it with the important consequence. Show the lines the explanation refers to, as an excerpt or diff, and collapse or link the rest of the file. Where sequence matters, use a small trace, before-and-after state, or numerical example.
- Use useful headings, and reach for a list or table where it shows a relationship more clearly than a sentence.

## Check and deliver

For HTML articles or interactive artifacts, read [HTML presentation](references/html-presentation.md) before implementing the page. It covers page layout, build-time diagrams, explanatory animation, code and diff rendering, GitHub-style PR cards, and browser verification. Diagrams in HTML articles also follow [Diagram system](references/diagram-system.md). Markdown uses language-tagged code fences and ordinary source links.

- Check technical claims against the source, especially claims implied by silence, success, or an empty result. Describe test assertions separately from tests actually run.
- Read for causal continuity: does each change answer an established need, and does each section advance the reader's understanding? Cut repeated conclusions and generic benefits.
- Read the finished article top to bottom as the reader. Wherever a section, table, or listing interrupts the story, move it into an aside or disclosure.
- Preserve intentional voice while removing filler and unsupported claims. Do not flatten the draft into reference documentation or force jokes into every section.
- Deliver Markdown by default, using the requested destination. Link the underlying sources and identify the relevant PR or revision when discussing historical behavior. Mark invented names, counts, and scenarios as illustrative where they could be mistaken for observations.
- A blog draft does not authorize modifying a PR description or publishing the article. For a requested PR-oriented explanation, adapt the length and emphasis to that audience while retaining the reasoning.

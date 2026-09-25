Load `design-partner` explicitly with the skill tool. Stay in the default session; I am selecting design partnership only.

## User prompt

Help me choose how to handle duplicate reminder submissions in a small internal app. Twenty coworkers use it, and occasionally someone double-clicks Submit or retries after a slow response. A reminder sends an email, so sending twice is annoying. Two reminders with the same text can also be intentional, even a few seconds apart. We already store reminders in a relational database; we have no queue or Redis. I was thinking we should add Redis and reject identical reminder text for five minutes.

What would you recommend, and what tradeoff am I missing? Keep this conversational: give me a concrete recommendation and the most important question you still need me to answer. This is design discussion only. Do not implement anything, create files, delegate to agents, or contact external services.

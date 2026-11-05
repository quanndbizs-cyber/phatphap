## Rules

- Do not re-read files already in context.
- Find files with grep/glob first, then read only the relevant sections, not whole files.
- Never read: composer.lock, package-lock.json, vendor/, node_modules/, playwright-report/, test-results/, compiled/built output.
- Stop exploring after 10 file reads and write the plan.
- If the task is ambiguous, ask one question instead of exploring more.
- Include test steps in the plan and wait for my approval before running any tests.
- After 3 failed attempts to fix a failing test, stop and report back.
- Never update documentation unless I explicitly ask.
- Never run git commit, push or pull unless I explicitly ask.

## Project structure (all code in system/typemill/)

- author/ => author interface (Vue)
- Controllers/ => business logic
- Events/ => event system
- Extensions/ => extensions, e.g. Twig and Parsedown
- Middleware/ => security gates, authentication
- Models/ => general classes and methods used by controllers
- routes/ => route definitions and access control
- settings/ => default settings (YAML)
- Static/ => static methods for global usage
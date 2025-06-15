---
trigger: manual
---

# General principles

- Only create happy path tests automatically
- Do not create new tests until existing tests run clean

# Use of mocks

- Prefer using common mocks in the api/src/test-utils/mocks directory.
- Create new common mock functions only when needed.
- Use overrides sparingly; prefer to use transformer functions when needed to test before and after processing.

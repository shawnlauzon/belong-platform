# Feature Documentation Standard

This document defines the standard format for feature CLAUDE.md files in `src/features/*/CLAUDE.md`.

## Purpose

Feature documentation helps developers quickly understand:
- What the feature does (purpose)
- What entities/concepts it contains (domain model)
- How to use it (API reference)
- Important patterns to follow (conventions)

## Format

```markdown
# [Feature Name]

Brief one-line description of what the feature does.

## Purpose

1-2 paragraphs explaining why this feature exists and what problems it solves.

## Key Entities

### EntityName

Brief description of the entity and its role.

**Key Fields:**
- `field` - Description and type
- `field` - Description and type

**Notes:** (optional)
- Important constraints or relationships
- Special behaviors

## Core Concepts

### Concept Name

Explanation of important patterns, workflows, or business rules that are
central to understanding how this feature works.

## State Machines (if applicable)

### Workflow Name

Clear description of valid state transitions with:
- From/To states
- Who can perform transition
- What it means

Use tables for clarity:

| From | To | Who | Description |
|------|----|----|-------------|
| state1 | state2 | role | What happens |

## API Reference

### Hooks
- `useHookName(params)` - Brief description
- `useAnotherHook()` - Brief description

### Transformers (if applicable)
- `transformerName` - What it transforms (DB ↔ Domain)

### Key Functions (if applicable)
- `functionName(params)` - What it does

## Important Patterns

### Pattern Name

Code patterns developers should follow when working with this feature.
Include brief code examples if helpful for clarity.
```

## Guidelines

### Do Include:
- **Current state** - Document how things work now
- **Domain concepts** - Entities, relationships, business rules
- **API reference** - What hooks/functions exist and their purpose
- **Key patterns** - Important conventions developers should follow
- **State machines** - If the feature has workflows with state transitions
- **Field descriptions** - What each important field means and its type

### Do NOT Include:
- **Historical changes** - No "was changed to", "no longer includes", "previously"
- **Implementation timelines** - No dates or version numbers
- **Migration notes** - No upgrade instructions
- **Deprecated features** - Document current state only
- **Testing instructions** - That belongs in test files
- **Tutorials** - This is reference documentation, not a guide
- **Internal implementation details** - Focus on what developers need to use the feature

### Writing Style:
- **Concise** - Brief but complete
- **Present tense** - "Returns user data", not "Will return"
- **Declarative** - State what things are/do
- **Focused** - Stay on topic for this feature
- **Current** - Document only the current implementation

### Code Examples:
- Use sparingly, only when they clarify a complex pattern
- Keep examples brief (3-5 lines max)
- Show the pattern, not full implementations
- Use TypeScript syntax

## Example Structure

See `src/features/resources/CLAUDE.md` for a complete example following this standard.
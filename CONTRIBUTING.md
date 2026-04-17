# Contributing to Roadmap App

## Branching Strategy

`main` is the production branch. No one pushes directly to `main` — all changes go through a pull request.

### Branch naming

| Type | Pattern | Example |
|------|---------|---------|
| New feature | `feature/short-description` | `feature/acquisition-export` |
| Bug fix | `fix/short-description` | `fix/milestone-date-display` |
| Chore / refactor | `chore/short-description` | `chore/update-dependencies` |

### Workflow

```
1. Pull latest main
   git checkout main && git pull origin main

2. Create your branch
   git checkout -b feature/your-feature

3. Make your changes, commit often with clear messages

4. Push and open a PR against main
   git push origin feature/your-feature
```

Keep branches short-lived. Aim to merge within 1–2 days to minimize conflicts.

---

## Pull Requests

### PR scope and size

Each PR should represent one deliberate, deployable unit of work. When a PR merges, `main` should be in a releasable state.

**Keep PRs focused:**
- One feature, one bug fix, or one refactor — not a mix
- If you find yourself writing "and also fixed..." in the description, that's a sign to split it
- A PR that touches 10+ files across unrelated areas is too large

**Signs a PR should be split:**
- It contains multiple independent features or fixes
- Parts of it could ship without the rest
- A reviewer would need to context-switch to understand different sections

**What's appropriate in one PR:**
- A single new feature and its supporting types/utilities
- A single bug fix, including the test or reproduction case
- A refactor scoped to one area (e.g., extracting a component, renaming across one module)
- A dependency update with any required code changes

There's no strict line count limit, but if a PR feels big, it probably is. Smaller PRs get reviewed faster, merge cleaner, and are easier to roll back if something goes wrong.

### Before opening a PR

- Your branch is up to date with `main` (rebase or merge main in if it has moved)
- Code follows the conventions in `CLAUDE.md`
- No TypeScript errors (`npx tsc --noEmit`)
- No lint errors (`npm run lint`)
- You've tested your changes locally

### PR description

Write a short description that covers:
- What changed and why
- Any areas reviewers should pay close attention to
- Screenshots for UI changes

---

## Code Review Guidelines

### For reviewers

**Architecture & conventions**
- Does the code follow the patterns in `CLAUDE.md`?
- Are shared utilities (`getStatusColor`, `formatDate`, etc.) imported rather than redefined?
- Is shared state consumed via `useRoadmap()` / `useAcquisitions()` rather than fetched independently?

**API routes**
- Are write operations protected with `requireEditorSession()`?
- Do DELETE routes return `204 No Content` with no body?
- Are error responses using the standard format?

**Components**
- Are confirmation dialogs using `<AlertDialog>` (not `window.confirm`)?
- Are success notifications using `toast.success()` from sonner?
- Are brand colors using Tailwind tokens (not raw `rgb()` strings)?
- Are hooks called at the top level, never inside loops or `.map()`?

**General**
- Is the change focused? (no unrelated edits bundled in)
- Are any new shared components or utilities worth extracting to `components/`?

### Approval

PRs require **1 approving review** before merging. The author should not merge their own PR without review except in genuine emergencies.

### Turnaround

Aim to review open PRs within **1 business day**.

---

## Merge Conflicts

Conflicts happen when two branches edit the same lines. Here's how to resolve them.

### Prevention (best practice)

- Pull from `main` before starting any new work
- Keep branches short — the longer a branch lives, the more likely a conflict becomes
- Communicate with teammates if you're both touching the same area

### Resolving a conflict

```bash
# 1. Make sure you're on your feature branch
git checkout feature/your-feature

# 2. Pull the latest main into your branch
git fetch origin
git merge origin/main

# 3. Git will list conflicted files — open each one
# Conflict markers look like this:
#
# <<<<<<< HEAD (your changes)
# const foo = "your version";
# =======
# const foo = "their version";
# >>>>>>> origin/main
#
# Edit the file to keep the correct version, then remove the markers

# 4. Stage the resolved files
git add <resolved-file>

# 5. Complete the merge
git commit

# 6. Push the updated branch — your PR will update automatically
git push origin feature/your-feature
```

### When in doubt

If a conflict involves a file you didn't expect to conflict (e.g., a lock file or generated file), don't guess — ask the person who made the other change what the correct resolution is.

For `package-lock.json` conflicts specifically: delete the file, run `npm install`, and commit the regenerated lock file.


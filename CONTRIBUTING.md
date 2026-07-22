# Contributing to Retail POS

Thank you for considering contributing! This document outlines the process for contributing to the Retail POS project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branch Naming](#branch-naming)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)

---

## Code of Conduct

- Be respectful and inclusive in all communications
- Provide constructive feedback in code reviews
- Focus on the code, not the person
- Assume good intent from other contributors

---

## Getting Started

### Prerequisites

- Node.js ≥ 18.x
- npm ≥ 9.x
- Git

### Setup

```bash
# Clone the repository
git clone git@github.com:hassan1657ok-art/POSRetail.git
cd POSRetail

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Create database
npx prisma db push

# Start development
npm run dev
```

### Project Structure Overview

```
src/
├── components/     # Shared UI components (Layout, DataTable, Modal, etc.)
├── stores/         # Zustand state stores (auth, cart, app, toast)
├── lib/            # Utilities, API wrapper
├── types/          # TypeScript type definitions
├── routes/         # React Router route configuration
└── modules/        # Feature modules (auth, dashboard, products, sales, etc.)

electron/
├── main.ts         # Electron main process entry
├── preload.ts      # Context bridge (renderer ↔ main process)
├── database/       # Prisma client + seed data
└── ipc-handlers/   # IPC handler functions (one per domain)

prisma/
└── schema.prisma   # Database schema definition
```

---

## Development Workflow

1. **Pick an issue** from the [Issues](https://github.com/hassan1657ok-art/POSRetail/issues) tab, or create one for your feature/bug
2. **Create a branch** from `main` using the naming convention below
3. **Implement** your changes following the code standards
4. **Test** manually by running `npm run dev`
5. **Build** to verify: `npm run build`
6. **Commit** with conventional commit messages
7. **Push** your branch and **open a Pull Request**

---

## Branch Naming

Use the following prefixes:

```
feature/<description>    # New features
fix/<description>        # Bug fixes
docs/<description>       # Documentation changes
refactor/<description>   # Code refactoring
style/<description>      # UI/styling changes
test/<description>       # Adding or updating tests
chore/<description>      # Build process, CI, dependencies

# Examples
feature/woocommerce-sync
fix/negative-totals-on-discount
docs/api-reference-update
refactor/extract-payment-form
```

---

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Usage |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `style` | Changes that do not affect meaning (formatting, CSS, etc.) |
| `perf` | A code change that improves performance |
| `test` | Adding or correcting tests |
| `chore` | Changes to build process, dependencies, CI |

### Examples

```
feat(sales): add keyboard shortcut for completing sale (Ctrl+Enter)
fix(cart): prevent negative totals when discount exceeds subtotal
docs(readme): add database schema documentation
refactor(products): extract variant form to separate component
style(dashboard): improve stat card layout on small screens
chore: update electron to v33
```

---

## Pull Request Process

1. **Ensure your branch is up to date** with `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git rebase main
   ```

2. **Verify the build passes**:
   ```bash
   npm run build
   ```

3. **Write a clear PR description**:
   - What does this PR do?
   - Which issue does it fix? (Reference with `#issue-number`)
   - Screenshots (for UI changes)
   - Testing steps

4. **Request review** from at least one maintainer

5. **Address review feedback** — all comments must be resolved before merge

6. **Squash and merge** when approved

### PR Title Format

Use the same convention as commits:

```
feat(sales): add keyboard shortcut for completing sale
fix(cart): prevent negative totals on discount
```

---

## Code Standards

### TypeScript

- **Strict mode** enabled (`"strict": true` in `tsconfig.json`)
- **No `any`** — use proper types or `unknown`
- **Use interfaces** for object shapes in `src/types/index.ts`
- **Avoid `as` casts** — prefer type guards and validation
- **Handle errors** with `e instanceof Error ? e.message : 'Failed'`

### React

- **Functional components** only — no class components
- **Hooks** for state and side effects
- **Feature-based structure** — new modules go in `src/modules/<feature>/`
- **Shared components** in `src/components/`
- **Use existing components** where possible:
  - `DataTable` for tabular data
  - `Modal` for dialogs
  - `ConfirmDialog` for destructive actions

### State Management (Zustand)

- **Stores** in `src/stores/`
- **Immutability** — use `set(s => ({ ...s, key: newValue }))` or map/filter, never mutate
- **Minimal stores** — keep state close to where it's used

### API Calls

- **Always use** the typed wrapper: `import { api } from '@/lib/api'`
- **Never call** `window.api.invoke()` directly in components
- **Handle loading**, `error`, and empty states in every component

### Styling

- **Tailwind CSS** utility classes for all styling
- **Component classes** from `index.css`: `.btn-primary`, `.card`, `.input`, `.badge-green`, etc.
- **Dark mode**: Not yet implemented, but use semantic class names when possible

### IPC Handlers (Electron Main Process)

- **One file per domain** in `electron/ipc-handlers/`
- **Register** in `electron/ipc-handlers/index.ts`
- **Add channel** to `validChannels` in `electron/preload.ts`
- **Add typed wrapper** in `src/lib/api.ts`
- **Log activity** for create/update/delete operations

---

## Testing

### Manual Testing

For now, testing is manual. Before submitting a PR:

1. **Login** as both Admin and Cashier
2. **Create, read, update, delete** entities in the module you changed
3. **Test edge cases**: empty states, invalid inputs, boundary values
4. **Verify toast notifications** appear for success/error

### Future: Automated Testing

We plan to add:

- **Vitest** for unit testing stores and utilities
- **Playwright** for E2E testing (Electron integration)

---

## Documentation

- Update the **README.md** if you add/change features
- Document **new IPC channels** in the API Reference section
- Update the **database schema** section if you modify entities
- Add **JSDoc comments** for complex functions

---

## Issue Reporting

### Bug Reports

When reporting a bug, include:

1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Screenshots** (if applicable)
5. **Environment**: OS, Node version, any error messages

### Feature Requests

When requesting a feature:

1. **Describe the problem** it solves
2. **Suggest a solution** (mockups help!)
3. **Consider alternatives** you've explored
4. **Scope**: Is this v1, v2, or future?

---

## Questions?

Open a [Discussion](https://github.com/hassan1657ok-art/POSRetail/discussions) or contact the maintainer.

---

Thank you for contributing!

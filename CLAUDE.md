# Splitwise MVP - Expense Splitting Application

## Project Overview

Splitwise MVP helps users **track**, **visualize**, and **settle** shared expenses transparently and automatically. Core focus: minimize awkward money conversations, save time for relationships.

## Working Protocol (CRITICAL - Follow Every Session)

1. **Analysis First**: Use filesystem MCP to examine existing code before implementing
2. **TDD Approach**: Write failing tests first, implement minimal code, refactor
3. **Context7 Usage**: Add "use context7" for any new library implementations
4. **Quality Gates**: All tests pass + lint + type-check before proceeding
5. **Progress Tracking**: Update PROGRESS.md after each significant change

## Role Assignment

You are a senior full-stack engineer with expertise in React, Node.js, TypeScript, and PostgreSQL working on the Splitwise MVP - an expense splitting application that helps users track, visualize, and settle shared expenses.

<!-- ## Available MCP Tools

- **Filesystem**: Direct file operations - reading, writing, creating files and directories
- **Context7**: Up-to-date documentation - add "use context7" to any prompt for latest library docs -->

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Payment**: Stripe API (for premium features)
- **Deployment**: Vercel (frontend) + Railway (backend)

## Development Commands

```bash
# Essential Commands (run frequently)
pnpm dev          # Start development server
pnpm test         # Run all tests
pnpm lint         # ESLint check + fix
pnpm type-check   # TypeScript validation
pnpm build        # Production build test

# Database Operations
pnpm db:migrate   # Run Prisma migrations
pnpm db:seed      # Seed test data
pnpm db:studio    # Open Prisma Studio
```

## Code Standards (Enforce Strictly)

- **Naming**: camelCase (variables/functions), PascalCase (components)
- **Structure**: Feature-based (`/features/expenses/`, `/features/groups/`)
- **API**: RESTful (`/api/v1/groups`, `/api/v1/expenses`)
- **Database**: Descriptive names (`user_id`, `expense_amount`)
- **Testing**: Unit tests for utilities, integration for APIs
- **Errors**: Consistent responses with status codes

## Project Structure

```
src/
├── components/ui/     # Reusable UI components
├── features/
│   ├── auth/         # Authentication logic
│   ├── groups/       # Group management
│   ├── expenses/     # Expense tracking
│   └── settlements/  # Debt settlement
├── lib/              # Utilities and configurations
├── hooks/            # Custom React hooks
└── types/            # TypeScript definitions

server/
├── routes/           # API route handlers
├── middleware/       # Express middleware
├── services/         # Business logic
└── utils/            # Helper functions
```

<!-- ## Working Parameters

- Use parallel tool execution for independent operations
- Apply "ultrathink" for complex architectural decisions
- Generate step-by-step verification checkpoints
- Implement test-driven development approach
- For any new library implementations, always add "use context7" to get latest documentation
- Always examine existing codebase using filesystem MCP before implementing (EPIV pattern) -->

## Database Schema (Core MVP)

- `users` (id, email, name, avatar_url)
- `groups` (id, name, description, created_by)
- `group_members` (group_id, user_id, role)
- `expenses` (id, group_id, amount, description, paid_by, created_at)
- `expense_splits` (expense_id, user_id, amount_owed)
- `settlements` (id, from_user, to_user, amount, settled_at)

## Core Features (MVP)

- **Groups**: Create/join expense groups
- **Expenses**: Add expenses with split methods (equal, exact amounts, percentages)
- **Balances**: Real-time debt calculation and visualization
- **Settlements**: Mark debts as paid
- **Dashboard**: Overview of all groups and balances

## Business Rules (Non-Negotiable)

- Split amounts must equal total expense amount
- Users only see groups they belong to
- Only group members can add expenses
- Balances auto-calculate after expense changes
- All monetary amounts: positive numbers, 2 decimal places

## Security Checklist (Every Feature)

- [ ] Validate all user inputs
- [ ] Authorize group membership before operations
- [ ] Sanitize expense descriptions
- [ ] Use prepared statements for database queries
- [ ] Rate limit API endpoints (100 requests/minute per user)

## Performance Requirements

- Pagination: 20 items per page for expense lists
- Debounced search inputs
- Optimistic UI updates for expense creation
- Database indexes on user_id and group_id columns

## Custom Commands (.claude/commands/)

- `/start-feature` - Begin structured feature development
- `/review-code` - Security and quality code review
- `/fix-tests` - Analyze and fix failing tests
- `/update-progress` - Document session progress

## MCP Usage Patterns

**Filesystem**: "Read src/components/ExpenseForm.tsx", "Create new migration file"
**Context7**: "Implement Prisma schema for expenses, use context7", "Create React form with validation, use context7"
**Combined**: "Analyze current auth files and update with latest NextAuth patterns, use context7"

<!-- This section doesnt seem with claude ai -->

## Quality Verification (Before Any Commit)

- [ ] All tests passing (unit + integration)
- [ ] ESLint and TypeScript checks clean
- [ ] Security considerations addressed
- [ ] Performance impact assessed
- [ ] PROGRESS.md updated with session summary
- [ ] Used "use context7" for any new library implementations

<!-- This section doesnt seem with claude ai -->

## Session Documentation Requirements

**After each session, update PROGRESS.md with:**

- Date/Time and objective
- Features implemented or bugs fixed
- Tests added/modified
- Known issues or technical debt
- Next recommended steps

## UI/UX Guidelines

- Mobile-first responsive design
- Simple, intuitive interface (avoid financial jargon)
- User-friendly error messages (not technical)
- Real-time balance updates
- Consistent currency formatting (2 decimal places)

---

**Core Principle**: Build for relationships, not transactions. Every feature should reduce friction in shared financial management.

**Development Mantra**: Read first (filesystem MCP) → Research latest patterns (use context7) → Test first (TDD) → Implement → Verify → Document

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Splitwise MVP - Expense Splitting Application

## Project Overview

Splitwise MVP helps users **track**, **visualize**, and **settle** shared expenses transparently and automatically. Core focus: minimize awkward money conversations, save time for relationships.

**Current Status**: Phases 6, 9, 10, and comprehensive settlement workflow complete. All tests passing (146/146). Production-ready with complete settlement system including two-way confirmation, status management, and group optimization.

## Architecture Overview

**Monorepo Structure (pnpm workspaces)**:
- `apps/web/` - React 18 + TypeScript + Vite frontend
- `apps/api/` - Node.js + Express + TypeScript backend
- `packages/shared/` - Shared TypeScript types, Zod schemas, utilities

**Key Architectural Patterns**:
- **Backend**: Layered architecture (Routes → Services → Models → Database)
- **Frontend**: Component-based with React Context for global state
- **Database**: Prisma ORM with PostgreSQL, comprehensive schema with 7 models
- **Authentication**: JWT-based with role-based access control
- **Testing**: 146 tests with 100% success rate using Jest and React Testing Library

## Essential Development Commands

```bash
# Core Development
pnpm dev              # Start all services (web:3000, api:3001)
pnpm test             # Run all 146 tests (must pass before commits)
pnpm type-check       # TypeScript validation across all packages
pnpm build            # Production build with optimization

# Database Operations
pnpm db:migrate       # Run Prisma migrations
pnpm db:seed          # Seed test data (realistic demo data)
pnpm db:studio        # Visual database management

# Individual Package Commands
pnpm --filter api test              # API tests only
pnpm --filter web type-check        # Frontend type checking only
pnpm test:debug                     # Verbose test output
```

## Working Protocol (CRITICAL)

1. **Analysis First**: Use filesystem tools to examine existing code patterns before implementing
2. **TDD Approach**: All tests must pass (146/146) before any commit
3. **Quality Gates**: TypeScript compilation + tests + type-check must all pass
4. **Progress Tracking**: Update PROGRESS.md after significant changes
5. **Settlement Integration**: New features must consider settlement workflow integration

## Tech Stack & Key Libraries

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Shadcn/ui
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: PostgreSQL with decimal precision for financial calculations
- **Testing**: Jest (backend) + React Testing Library (frontend) + Supertest (API)
- **Authentication**: JWT tokens with middleware-based authorization
- **Charts**: Recharts for data visualization
- **State Management**: React Context + custom hooks (useSettlements, useAuth)

## Database Architecture

**Core Models with Business Logic**:
```typescript
User          // Authentication, profiles, CUID IDs
Group         // Expense sharing groups with admin/member roles
GroupMember   // Many-to-many with role-based permissions
Expense       // Financial transactions with decimal precision
ExpenseSplit  // How expenses are divided (equal/exact/percentage)
Settlement    // Debt resolution with status workflow (PENDING → CONFIRMED → COMPLETED)
SettlementExpense // Settlement tracking and audit trail
```

**Critical Features**:
- Decimal precision (@db.Decimal(10, 2)) for financial accuracy
- Settlement status workflow with two-way confirmation
- Advanced balance calculation with debt optimization algorithms
- ExpenseCategory enum (FOOD, TRANSPORTATION, ENTERTAINMENT, etc.)

## API Design Patterns

**RESTful Structure**:
```
/api/v1/auth/*        # JWT authentication (login, register, logout)
/api/v1/groups/*      # Group CRUD with member management
/api/v1/expenses/*    # Expense operations with split calculations
/api/v1/balances/*    # Real-time balance calculations
/api/v1/settlements/* # Settlement workflow (confirm, complete, cancel)
```

**Consistent Response Format**:
```typescript
{
  success: boolean,
  data?: any,
  error?: string,
  message?: string
}
```

**Authentication**: JWT middleware with role-based access control. Users can only access groups they belong to, only group members can add expenses.

## Frontend Component Architecture

**Component Organization**:
```
components/
├── ui/              # Shadcn/ui primitives (Button, Input, Card, etc.)
├── charts/          # Recharts visualization components
├── dashboard/       # Dashboard-specific widgets (StatsCard, ActivityFeed)
├── layout/          # Navigation and layout components
└── [feature]/       # Settlement, expense, group components
```

**Key Patterns**:
- **Settlement Workflow**: SettlementStatusBadge, SettlementActions, PendingSettlements
- **State Management**: AuthContext for global auth, custom hooks for API interactions
- **Real-time Updates**: Components automatically refresh after settlement actions
- **Mobile-First**: Responsive design with Tailwind CSS

## Code Standards

**Naming & Structure**:
- camelCase (variables/functions), PascalCase (components)
- Feature-based organization (`/components/settlements/`, `/api/v1/settlements`)
- Clean imports: `import { Button, Input } from "../components/ui"`

**Tailwind CSS**:
```tsx
// ✅ CORRECT: Clean conditional classes
className={cn(
  "flex items-center space-x-2",
  isActive && "bg-blue-100 text-blue-700",
  isLoading && "opacity-50"
)}

// ❌ WRONG: Escaped quotes or template literals
className={`flex ${isActive ? 'bg-blue-100' : ''}`}
```

**Financial Precision**: Always use Prisma Decimal types for money, convert to numbers for display: `Number(expense.amount)`

## Testing Architecture

**Backend Testing (Jest)**:
- 146 tests with 100% success rate
- Mock strategy: Prisma, shared packages, external dependencies
- Test isolation with proper setup/teardown
- Comprehensive API endpoint testing with authentication scenarios

**Test Commands**:
```bash
pnpm test                    # All tests
pnpm --filter api test       # Backend only
pnpm test:debug             # Verbose output
pnpm test:watch             # Watch mode
```

**Critical Testing Rules**:
- All tests must pass before commits
- Financial calculations require mathematical accuracy tests
- Settlement workflow needs status transition testing
- API endpoints require authentication and authorization testing

## Settlement System (Core Feature)

**Workflow States**: PENDING → CONFIRMED → COMPLETED (or CANCELLED)
- **PENDING**: Settlement created, waiting for recipient confirmation
- **CONFIRMED**: Recipient confirmed payment received
- **COMPLETED**: Payer marked as paid, affects balance calculations
- **CANCELLED**: Either party cancelled with optional reason

**Key Components**:
- `SettlementActions` - Contextual workflow buttons based on user role and status
- `PendingSettlements` - Dashboard widget showing settlements requiring action
- `GroupSettleAllButton` - Optimized group settlement minimizing transactions

**API Integration**: Settlement workflow integrates with balance calculations, only CONFIRMED/COMPLETED settlements affect balances.

## Business Rules (Non-Negotiable)

- Split amounts must equal total expense amount (mathematical validation)
- Users only see groups they belong to (authorization enforcement)
- Only group members can add expenses (role-based access control)
- Balances auto-calculate after expense changes (real-time updates)
- All monetary amounts: positive numbers, 2 decimal places (Decimal precision)
- Settlement workflow: two-way confirmation prevents disputes

## Development Best Practices

**Before Any Commit**:
- [ ] All 146 tests passing
- [ ] TypeScript compilation clean (`pnpm type-check`)
- [ ] Financial calculations tested for mathematical accuracy
- [ ] Settlement workflow integration verified
- [ ] Mobile responsiveness tested

**Performance Considerations**:
- Balance calculations optimized with proper database indexing
- Settlement optimization algorithms tested with complex debt scenarios
- Parallel API calls for dashboard data fetching
- Vite build optimization with manual chunking

**Security Requirements**:
- JWT authentication on all protected endpoints
- Input validation with Zod schemas
- SQL injection prevention with Prisma ORM
- Role-based authorization for group operations
- Financial data validation with decimal precision

---

**Core Principle**: Build for relationships, not transactions. Every feature should reduce friction in shared financial management.

**Settlement Focus**: The settlement system is the crown jewel - comprehensive workflow with status management, two-way confirmation, and mathematical optimization. All new features should consider settlement integration.
# Analyze and Fix Failing Tests

Systematically identify and resolve test failures while maintaining code quality.

**Arguments**: Specific test files or describe the failing tests: $ARGUMENTS

## Debugging Process

### Step 1: Analyze Failures

1. **Run Test Suite**
   ```bash
   pnpm test -- --verbose
   ```
2. **Categorize Failures**

   - Unit test failures (isolated function/component issues)
   - Integration test failures (component interaction issues)
   - End-to-end test failures (full workflow issues)

3. **Identify Root Causes**

   - Code changes that broke existing functionality
   - Missing test data or setup
   - Async timing issues
   - Database state problems

4. **Debugging**

   - When tests are fail and you need to console log the spesific areas use

   ```bash
   import { log, error } from "console";

   log("Test data sent:", JSON.stringify(expenseData, null, 2));
   ```

### Step 2: Fix Strategy

1. Fix One Category at a Time

   - Start with unit tests (fastest feedback)
   - Move to integration tests
   - Finish with end-to-end tests

2. Maintain Test Integrity

   - Don't modify tests unless they're genuinely incorrect
   - Fix code to meet test expectations
   - Add new tests for uncovered scenarios

### Step 3: Verification

1. Run Related Tests

   ```bash
   pnpm test -- --testPathPattern="expense"
   ```

````

2. Full Test Suite

   ```bash
   pnpm test
   ```

3. Regression Check

   - Verify no new test failures introduced
   - Check that existing functionality still works
   - Run linting and type-checking

### Common Issues and Solutions

- Database state: Reset test database between tests
- Async operations: Use proper awaits and test utilities
- Mock issues: Update mocks to match new interfaces
- Type errors: Update TypeScript types after schema changes

````

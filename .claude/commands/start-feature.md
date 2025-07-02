# Start New Feature Development

You are a senior full-stack engineer with expertise in React, Node.js, TypeScript, and PostgreSQL working on the Splitwise MVP. Follow this structured workflow:

**Arguments**: Feature name and description: $ARGUMENTS

## Step 1: Analysis and Planning

1. **Examine Current Codebase** (Use Filesystem MCP)

   - Read relevant existing files: "Read src/features/expenses/ExpenseForm.tsx"
   - Review similar features: "List all files in src/features/ directory"
   - Check current test coverage: "Read **tests**/ directory contents"

2. **Get Latest Documentation** (Use Context7 MCP)

   - For any new libraries: "use context7" in your questions
   - Example: "How to implement form validation with React Hook Form? use context7"

3. **Create Implementation Plan**
   - Break down feature into discrete, testable components
   - Identify required database schema changes
   - Plan API endpoints and frontend components
   - Consider security and validation requirements

## Step 2: Implementation with MCP Tools

1. **Database Changes** (if needed)

   - Create migrations: "Create a new Prisma migration file for [feature], use context7"
   - Update schema: "Read current schema.prisma and suggest updates"

2. **Backend Implementation**

   - Create API files: "Create new route file in server/routes/ for [feature]"
   - Add validation: "Implement input validation using latest Zod patterns, use context7"

3. **Frontend Implementation**
   - Create components: "Create new React component in src/components/ for [feature]"
   - Add tests: "Create test file for the new component"

## Step 3: Verification and Documentation

1. **Quality Checks**

   - Run tests: "Check if all test files pass"
   - Review code: "Read the implemented files and check for best practices"

2. **Update Documentation**
   - Update progress: "Write session summary to PROGRESS.md"
   - Document patterns: "Update CLAUDE.md if new patterns emerge"

**Remember**: Use filesystem MCP for all file operations, use Context7 for latest documentation, follow TDD strictly.

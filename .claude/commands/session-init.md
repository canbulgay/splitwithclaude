# Initialize Development Session

Prepare a new development session with full project context, regardless of previous session history.

**Usage**: `/session-init [optional: specific objective]`

## Session Initialization Process

### 1. Context Loading (Use Filesystem MCP)

- Read CLAUDE.md for project guidelines and standards
- Load PROGRESS.md for current status and recent changes
- Review PROJECT_PLAN.md for roadmap and priorities
- Check recent git commits for context

### 2. Environment Verification

- Verify MCP servers (filesystem, context7) are connected
- Test development commands (pnpm dev, test, lint)
- Check database connection and migration status
- Validate environment variables are set

### 3. Current State Analysis

- Analyze project structure for any changes
- Identify modified files since last session
- Check for any failing tests or lint errors
- Review any TODO comments or technical debt

### 4. Session Planning

- If specific objective provided, create implementation plan
- Otherwise, suggest next logical development step
- Identify required resources and documentation
- Plan verification checkpoints

### 5. Ready State Confirmation

Confirm the session is ready by verifying:

- [ ] Project context fully loaded
- [ ] Development environment functional
- [ ] No blocking issues identified
- [ ] Clear objective established
- [ ] Necessary tools and documentation identified

## Example Usage

```bash
# General session start
/session-init

# Specific objective session
/session-init "implement user authentication system"

# Continue from last session
/session-init "continue from last PROGRESS.md entry"
```

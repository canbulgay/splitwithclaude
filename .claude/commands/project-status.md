# Project Status Check

Get a comprehensive overview of the current project state and load necessary context for development.

**Usage**: `/project-status`

## Actions Performed

### 1. Load Current Context

- Read PROGRESS.md for recent changes and current status
- Review PROJECT_PLAN.md for upcoming priorities
- Check git status for uncommitted changes
- List recent commits for context

### 2. Environment Verification

- Verify MCP servers are connected
- Check if development server is running
- Validate database connection
- Test essential commands (lint, type-check, test)

### 3. Quick Analysis

- Identify current sprint objectives
- Check for any blocking issues
- Review technical debt items
- Suggest immediate next steps

### 4. Session Preparation

- Prepare relevant file contexts
- Identify files likely to be modified
- Check for any pending pull requests
- Review recent test failures or issues

## Output Format

Provide a structured summary including:

- **Current Status**: What phase/sprint we're in
- **Last Session**: What was accomplished recently
- **Immediate Priority**: What should be worked on next
- **Blockers**: Any issues preventing progress
- **Quick Wins**: Small tasks that can be completed quickly
- **File Context**: Key files to examine for current work

## Integration with Other Commands

After running `/project-status`, you'll have full context to use:

- `/start-feature [feature-name]` for new development
- `/review-code [area]` for quality checks
- `/fix-tests` if any test issues were identified

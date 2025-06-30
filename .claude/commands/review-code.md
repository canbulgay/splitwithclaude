# Security and Quality Code Review

Perform a comprehensive review of recent changes focusing on security, performance, and code quality.

**Arguments**: Files or areas to review: $ARGUMENTS

## Review Checklist

### Security Review

- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (parameterized queries)
- [ ] Authorization checks before database operations
- [ ] XSS prevention in user-generated content
- [ ] Rate limiting on API endpoints
- [ ] Sensitive data handling (no plain text passwords)

### Code Quality Review

- [ ] Code follows TypeScript best practices
- [ ] Proper error handling and user-friendly messages
- [ ] Components are reusable and well-structured
- [ ] Database queries are optimized
- [ ] API responses follow consistent format
- [ ] Tests cover edge cases and error scenarios

### Performance Review

- [ ] Database queries use appropriate indexes
- [ ] Frontend implements proper loading states
- [ ] API responses are paginated where needed
- [ ] Images and assets are optimized
- [ ] No unnecessary re-renders in React components

### Compliance Review

- [ ] Follows project coding standards
- [ ] Naming conventions are consistent
- [ ] Comments explain complex business logic
- [ ] Documentation is up to date

## Action Items

After review, provide:

1. List of issues found with severity levels
2. Specific recommendations for fixes
3. Suggestions for preventing similar issues
4. Updates needed for tests or documentation

# Splitwise API Developer Guide

A comprehensive guide for developers working with the Splitwise API, including setup, testing, and best practices.

## Table of Contents

- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Development Tools](#development-tools)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Common Workflows](#common-workflows)
- [Performance & Monitoring](#performance--monitoring)
- [Security Guidelines](#security-guidelines)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- Git

### Environment Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd splitwise
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Environment configuration:**
   ```bash
   # Copy environment template
   cp apps/api/.env.example apps/api/.env
   
   # Configure your environment variables
   # Required: DATABASE_URL, JWT_SECRET
   ```

4. **Database setup:**
   ```bash
   # Run migrations
   pnpm db:migrate
   
   # Seed test data
   pnpm db:seed
   ```

5. **Start development servers:**
   ```bash
   # Start both API and frontend
   pnpm dev
   
   # Or start API only
   pnpm --filter api dev
   ```

### Verify Installation

Visit these endpoints to verify your setup:
- **API Health**: http://localhost:3001/health
- **API Documentation**: http://localhost:3001/api/docs
- **Development Dashboard**: http://localhost:3001/dev/dashboard

## API Documentation

### Interactive Documentation (Swagger)

The API documentation is automatically generated and available at:
- **Development**: http://localhost:3001/api/docs
- **JSON Format**: http://localhost:3001/api/docs.json

### Authentication

Most endpoints require JWT authentication:

```bash
# 1. Register a user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "name": "Developer User",
    "password": "securePassword123!"
  }'

# 2. Use the returned token in subsequent requests
curl -X GET http://localhost:3001/api/v1/groups \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Core Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/v1/auth/register` | POST | Register new user | ❌ |
| `/api/v1/auth/login` | POST | Login user | ❌ |
| `/api/v1/auth/me` | GET | Get current user | ✅ |
| `/api/v1/groups` | GET | List user's groups | ✅ |
| `/api/v1/groups` | POST | Create group | ✅ |
| `/api/v1/groups/{id}` | GET | Get group details | ✅ |
| `/api/v1/expenses` | POST | Create expense | ✅ |
| `/api/v1/balances/group/{id}` | GET | Get group balances | ✅ |
| `/api/v1/settlements` | POST | Create settlement | ✅ |

## Development Tools

### Development Dashboard

Access the development dashboard at `/dev/dashboard` for:
- Database statistics
- Recent API requests
- Performance metrics
- Health status
- Quick links to tools

### Available Development Endpoints

```bash
# Development dashboard (comprehensive overview)
GET /dev/dashboard

# Recent API request logs
GET /dev/logs?limit=50

# Test data generation examples
GET /dev/test-data

# cURL command examples
GET /dev/curl-examples

# Clear request logs
POST /dev/clear-logs
```

### Database Tools

```bash
# View database in browser
pnpm db:studio

# Reset database (careful!)
pnpm db:reset

# Create new migration
pnpm db:migrate

# Generate Prisma client
pnpm db:generate
```

## Testing & Quality Assurance

### Automated API Testing

The project includes a comprehensive API test runner:

```bash
# Run all tests
pnpm api-test

# Run specific test suites
pnpm api-test auth        # Authentication tests
pnpm api-test groups      # Group management tests
pnpm api-test expenses    # Expense management tests

# Verbose output
pnpm api-test:verbose
```

### Unit Testing

```bash
# Run all unit tests
pnpm test

# Run tests for specific package
pnpm --filter api test
pnpm --filter web test

# Watch mode for development
pnpm test:watch
```

### Code Quality

```bash
# TypeScript type checking
pnpm type-check

# Code linting
pnpm lint

# Build verification
pnpm build
```

### Test Data Generation

Get sample test data:
```bash
curl http://localhost:3001/dev/test-data
```

## Common Workflows

### Creating a Complete Expense Flow

1. **Register users:**
   ```javascript
   // Register multiple users for testing
   const users = ['alice@example.com', 'bob@example.com', 'charlie@example.com'];
   const tokens = {};
   
   for (const email of users) {
     const response = await fetch('/api/v1/auth/register', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         email,
         name: email.split('@')[0],
         password: 'testPassword123!'
       })
     });
     const { data } = await response.json();
     tokens[email] = data.token;
   }
   ```

2. **Create a group:**
   ```javascript
   const groupResponse = await fetch('/api/v1/groups', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${tokens['alice@example.com']}`
     },
     body: JSON.stringify({
       name: 'Weekend Trip',
       description: 'Shared expenses for weekend getaway'
     })
   });
   const { data: group } = await groupResponse.json();
   ```

3. **Add members to group:**
   ```javascript
   for (const email of ['bob@example.com', 'charlie@example.com']) {
     await fetch(`/api/v1/groups/${group.id}/members`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${tokens['alice@example.com']}`
       },
       body: JSON.stringify({ email, role: 'MEMBER' })
     });
   }
   ```

4. **Create expenses:**
   ```javascript
   const expense = await fetch('/api/v1/expenses', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${tokens['alice@example.com']}`
     },
     body: JSON.stringify({
       groupId: group.id,
       amount: 120.00,
       description: 'Dinner at restaurant',
       category: 'FOOD',
       paidBy: 'alice-user-id',
       splits: [
         { userId: 'alice-user-id', amount: 40.00 },
         { userId: 'bob-user-id', amount: 40.00 },
         { userId: 'charlie-user-id', amount: 40.00 }
       ]
     })
   });
   ```

5. **Check balances:**
   ```javascript
   const balances = await fetch(`/api/v1/balances/group/${group.id}`, {
     headers: { 'Authorization': `Bearer ${tokens['alice@example.com']}` }
   });
   ```

### Testing Settlement Workflow

```javascript
// 1. Create settlement
const settlement = await fetch('/api/v1/settlements', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${payerToken}`
  },
  body: JSON.stringify({
    groupId: 'group-id',
    recipientId: 'recipient-user-id',
    amount: 40.00
  })
});

// 2. Recipient confirms payment
await fetch(`/api/v1/settlements/${settlement.id}/confirm`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${recipientToken}` }
});

// 3. Payer marks as completed
await fetch(`/api/v1/settlements/${settlement.id}/complete`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${payerToken}` }
});
```

## Performance & Monitoring

### Performance Metrics

Access real-time performance data:
```bash
# Get performance stats
curl http://localhost:3001/metrics

# Development dashboard includes performance overview
curl http://localhost:3001/dev/dashboard
```

### Key Performance Indicators

- **API Response Time**: < 200ms for most endpoints
- **Database Query Time**: < 100ms average
- **Cache Hit Rate**: > 80% for balance calculations
- **Memory Usage**: < 80% of allocated memory

### Performance Optimization

1. **Database Queries:**
   - Use indexed fields for filtering
   - Implement pagination for large datasets
   - Cache frequently accessed data

2. **API Design:**
   - Use appropriate HTTP methods
   - Implement proper error handling
   - Follow RESTful conventions

3. **Caching Strategy:**
   - Balance calculations are cached for 5 minutes
   - Group membership cached for 10 minutes
   - Use cache invalidation on data changes

## Security Guidelines

### Authentication & Authorization

1. **JWT Tokens:**
   - Set strong `JWT_SECRET` in production
   - Tokens expire after 7 days
   - Use HTTPS in production

2. **Input Validation:**
   - All inputs validated with Zod schemas
   - SQL injection prevention via Prisma ORM
   - XSS protection with input sanitization

3. **Access Control:**
   - Role-based access (ADMIN/MEMBER)
   - Group-level permissions
   - Resource ownership validation

### Security Best Practices

```bash
# Environment variables (never commit these)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters
DATABASE_URL=postgresql://user:password@localhost:5432/splitwise

# Production security headers
CORS_ORIGIN=https://your-domain.com
NODE_ENV=production
```

### Data Privacy

- Passwords are hashed with bcrypt
- Sensitive data sanitized in logs
- User data isolated by group membership
- No sensitive information in error messages

## Troubleshooting

### Common Issues

1. **Database Connection Errors:**
   ```bash
   # Check PostgreSQL status
   pg_ctl status
   
   # Verify database URL
   echo $DATABASE_URL
   
   # Test connection
   pnpm db:studio
   ```

2. **Authentication Issues:**
   ```bash
   # Verify JWT secret is set
   echo $JWT_SECRET
   
   # Check token format in requests
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/v1/auth/me
   ```

3. **API Test Failures:**
   ```bash
   # Check API is running
   curl http://localhost:3001/health
   
   # Run tests with verbose output
   pnpm api-test:verbose
   
   # Check development dashboard
   curl http://localhost:3001/dev/dashboard
   ```

### Debug Mode

Enable detailed logging:
```bash
# Set environment variable
export DEBUG=splitwise:*

# Or run with debug
DEBUG=splitwise:* pnpm dev
```

### Health Checks

Monitor API health:
```bash
# Basic health check
curl http://localhost:3001/health

# Detailed health status
curl http://localhost:3001/dev/dashboard | jq '.health'
```

## API Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data varies by endpoint
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message description",
  "details": {
    // Optional additional error details
  }
}
```

### Pagination Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

## Contributing

### Development Workflow

1. Create feature branch from `main`
2. Implement changes following existing patterns
3. Add/update tests for new functionality
4. Ensure all tests pass: `pnpm test`
5. Verify API tests pass: `pnpm api-test`
6. Update documentation as needed
7. Submit pull request

### Code Standards

- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Zod for runtime validation
- Jest for testing

### Git Conventions

```bash
# Commit message format
type(scope): description

# Examples
feat(auth): add password reset functionality
fix(groups): resolve member permission issue
docs(api): update authentication examples
test(expenses): add expense splitting validation tests
```

## Additional Resources

- **OpenAPI Specification**: `/api/docs.json`
- **Database Schema**: `apps/api/prisma/schema.prisma`
- **Test Examples**: `apps/api/src/scripts/api-test-runner.ts`
- **Development Tools**: `apps/api/src/lib/dev-tools.ts`
- **Performance Monitoring**: `apps/api/src/lib/performance.ts`

## Support

For questions and support:
1. Check this guide and API documentation
2. Review the development dashboard for diagnostics
3. Run API tests to verify functionality
4. Check the troubleshooting section
5. Create an issue in the project repository

---

**Happy coding! 🚀**
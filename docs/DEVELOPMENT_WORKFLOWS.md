# Development Workflows

This guide consolidates development workflow utilities and procedures for HomeMatch V2.

## Git Workflows

### Commit and Push Workflow

For commits that involve multiple modified files:

1. **Stage all modified files** to git (unless there are files that should not be in version control)
2. **Bundle related changes** into logical commits if needed
3. **Create semantic commits** with clear, concise one-line messages
4. **Push commits** to origin

**Semantic Commit Format:**
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Code Coverage Workflow

To improve test coverage:

1. **Analyze current coverage** percentages for each function and method
2. **Add unit tests** to functions and methods without 100% coverage
3. **Include edge cases** and negative test scenarios
4. **Use mocks** for external functionality (web services, databases)
5. **Re-run coverage analysis** and repeat as necessary

**Coverage Commands:**
```bash
pnpm test:coverage        # Generate coverage report
pnpm test:watch          # Watch mode with coverage
```

## UI Design Workflows

### Design Iteration Process

For creating design variations and UI iterations:

1. **Read style guide** (`/docs/STYLE_GUIDE.md`) for design consistency
2. **Analyze existing mockups** for reference patterns
3. **Create variations** - Build 3 parallel variations of UI components
4. **Output to iterations folder** as `ui_1.html`, `ui_2.html`, etc.
5. **Review and decide** which variation works best

**UI Iteration Goals:**
- Create multiple design options for user review
- Maintain consistency with established style guide
- Enable rapid prototyping and comparison

## Development Best Practices

### Code Quality Checklist

Before committing code:
- [ ] Run `pnpm run lint` - ESLint validation
- [ ] Run `pnpm run type-check` - TypeScript validation  
- [ ] Run `pnpm test` - All test suites pass
- [ ] Check test coverage meets standards
- [ ] Verify no `any` types introduced
- [ ] Follow Prettier formatting (automatic)

### Branch Management

- **Main branch**: `main` - Production-ready code
- **Feature branches**: `feature/descriptive-name`
- **Hotfix branches**: `hotfix/issue-description`
- **Documentation branches**: `docs/topic`

### Environment Management

- **Development**: `pnpm run dev` (port 3000)
- **Testing**: Isolated environment with test database
- **Production**: Built and deployed via CI/CD

## Automation Scripts

### Test Infrastructure

```bash
# Start local test infrastructure
pnpm run test:infra:start

# Setup test users and data  
node scripts/setup-test-users-admin.js

# Clean test environment
pnpm run test:infra:clean
```

### Database Operations

```bash
# Apply migrations
pnpm run db:migrate

# Reset database (development only)
pnpm dlx supabase@latest db reset

# Generate TypeScript types
pnpm dlx supabase@latest gen types typescript --local > src/types/database.ts
```

### Build and Deployment

```bash
# Production build
pnpm run build

# Test build for E2E testing
node scripts/build-for-tests.js

# Validate deployment
node scripts/validate-deployment.js
```

## Debugging Workflows

### Browser Debugging

Using Browser-tools MCP and Playwright:

1. **Console monitoring**: `mcp__browser_tools__getConsoleLogs()`
2. **Network analysis**: `mcp__browser_tools__getNetworkLogs()`
3. **Performance audits**: `mcp__browser_tools__runPerformanceAudit()`
4. **Visual debugging**: Screenshots and element inspection

### Test Debugging

```bash
# E2E debugging modes
pnpm test:e2e -- --headed    # See browser
pnpm test:e2e -- --ui        # Interactive mode  
pnpm test:e2e -- --debug     # Debug mode

# Unit test debugging
pnpm test:unit -- --watch    # Watch mode
pnpm test:unit -- --verbose  # Detailed output
```

## Code Review Process

### Pre-Review Checklist

- [ ] All tests pass
- [ ] Code coverage maintained
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Security considerations addressed
- [ ] Performance impact assessed

### Review Guidelines

1. **Functional correctness**: Does the code work as intended?
2. **Code quality**: Is it readable, maintainable, and well-structured?
3. **Test coverage**: Are new features adequately tested?
4. **Documentation**: Are changes properly documented?
5. **Security**: Are there any security implications?
6. **Performance**: Any performance impacts?

## Deployment Workflows

### Staging Deployment

1. **Feature branch** merged to `staging`
2. **Automated tests** run in staging environment
3. **Manual QA testing** on staging environment
4. **Performance validation** with realistic data
5. **Security scanning** for vulnerabilities

### Production Deployment

1. **Staging approval** from QA team
2. **Production build** with optimizations
3. **Database migrations** (if needed)
4. **Blue-green deployment** for zero downtime
5. **Post-deployment validation** and monitoring
6. **Rollback procedures** ready if needed

## Monitoring and Maintenance

### Regular Maintenance Tasks

- **Weekly**: Dependency updates and security patches
- **Monthly**: Performance analysis and optimization
- **Quarterly**: Architecture review and technical debt assessment

### Monitoring Dashboards

- **Application Performance**: Response times, error rates
- **Database Performance**: Query performance, connection pools
- **Infrastructure**: Server resources, network performance
- **User Experience**: Core Web Vitals, user feedback

## Emergency Procedures

### Incident Response

1. **Immediate assessment**: Severity and impact
2. **Communication**: Notify stakeholders
3. **Mitigation**: Quick fixes or rollback
4. **Investigation**: Root cause analysis
5. **Resolution**: Permanent fix and prevention
6. **Post-mortem**: Document lessons learned

### Rollback Procedures

- **Database rollback**: Migration rollback scripts
- **Application rollback**: Previous version deployment
- **Configuration rollback**: Revert environment changes
- **Cache invalidation**: Clear relevant caches

---

*This document consolidates development workflows from various utility scripts and provides a comprehensive reference for HomeMatch V2 development processes.*
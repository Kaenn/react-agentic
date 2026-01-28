# Contributing to react-agentic

Thank you for your interest in contributing to react-agentic! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/Kaenn/react-agentic.git
cd react-agentic

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## Development Workflow

### Project Structure

```
src/
├── app/           # Example commands and agents
├── cli/           # CLI entry and commands
├── parser/        # TSX parsing and transformation
├── ir/            # Intermediate representation nodes
├── emitter/       # Markdown emission
├── jsx.ts         # Component exports
└── index.ts       # Library exports

docs/              # Documentation
.claude/
├── commands/      # Generated command markdown
└── agents/        # Generated agent markdown
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build the project with tsup |
| `npm run dev` | Watch mode for development |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run typecheck` | Type check without emitting |
| `npm run watch` | Watch and rebuild commands/agents |

### Making Changes

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style guidelines below.

3. **Run checks before committing:**
   ```bash
   npm run typecheck
   npm run test:run
   npm run build
   ```

4. **Commit with a descriptive message:**
   ```bash
   git commit -m "feat: add new feature description"
   ```

5. **Push and create a pull request:**
   ```bash
   git push origin feature/your-feature-name
   ```

## Code Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Prefer `const` over `let`, avoid `var`
- Use explicit return types for public functions
- Prefer interfaces over type aliases for object shapes

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `my-component.ts` |
| Components | PascalCase | `SpawnAgent` |
| Functions | camelCase | `parseCommand()` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT` |
| Types/Interfaces | PascalCase | `CommandProps` |

### Code Organization

- Keep files focused and single-purpose
- Export public API from `index.ts`
- Place tests next to source files or in `__tests__/` directories
- Document public APIs with JSDoc comments

## Pull Request Guidelines

### Before Submitting

- [ ] Code compiles without errors (`npm run typecheck`)
- [ ] All tests pass (`npm run test:run`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventional commits

### PR Title Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Description |
|------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code change that neither fixes a bug nor adds a feature |
| `test:` | Adding or updating tests |
| `chore:` | Maintenance tasks |

Examples:
- `feat: add support for async components`
- `fix: resolve variable scoping issue in SpawnAgent`
- `docs: update getting started guide`

### PR Description

Include:
- **What** the change does
- **Why** the change is needed
- **How** to test it

## CI/CD Pipeline

### Continuous Integration

Every push and pull request triggers:
- Type checking
- Test suite
- Build verification
- Runs on Node.js 18, 20, and 22

### Publishing

Releases are automated via GitHub Actions:

1. Maintainer updates version: `npm version patch|minor|major`
2. Push with tags: `git push origin main --tags`
3. Create a GitHub Release from the tag
4. Package is automatically published to npm

## Reporting Issues

### Bug Reports

Include:
- Node.js version (`node --version`)
- npm version (`npm --version`)
- Operating system
- Minimal reproduction steps
- Expected vs actual behavior

### Feature Requests

Include:
- Use case description
- Proposed API or behavior
- Any alternatives considered

## Documentation

When adding or changing features:
- Update relevant docs in `docs/`
- Add JSDoc comments for public APIs
- Include code examples where helpful

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Open an issue or start a discussion on GitHub. We're happy to help!

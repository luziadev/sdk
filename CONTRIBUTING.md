# Contributing to @luziadev/sdk

Thank you for your interest in contributing to the Luzia SDK. This guide will help you get started with development, testing, and the release process.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) v1.0 or later
- Node.js 18+ (for npm publishing)

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/luziadev/luzia.git
   cd luzia
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Navigate to the SDK package:
   ```bash
   cd packages/sdk
   ```

4. Build the SDK:
   ```bash
   bun run build
   ```

5. Run tests:
   ```bash
   bun test
   ```

## Type Generation

The SDK types are generated from the OpenAPI specification to ensure type safety and API contract compliance.

### Regenerating Types

When the API changes, regenerate the types:

```bash
bun run generate
```

This reads `/apps/api/openapi.yaml` and outputs `src/types/generated.ts`.

### Type Re-exports

After regenerating, verify that `src/types/index.ts` properly re-exports any new types with developer-friendly names.

## Testing

### Unit Tests

Run the unit test suite:

```bash
bun test
```

### Build Integration Test

Verify the build output is valid and all exports work:

```bash
bun run test:build
```

This script:
1. Builds the SDK (`bun run build`)
2. Imports from `dist/` to verify exports
3. Runs runtime checks on all public APIs

### Manual Testing

Test against a running API server:

```bash
# Start API server in another terminal
bun dev:api

# Run manual test
bun run scripts/manual-test.ts lz_your_api_key
```

## Code Style

- Follow existing patterns in the codebase
- Use TypeScript strict mode
- Keep bundle size minimal (zero runtime dependencies)
- Write JSDoc comments for public APIs

## Release Process

The SDK uses tag-based releases via GitHub Actions.

### Version Bump

1. Update `CHANGELOG.md` with the new version and changes
2. The version in `package.json` is set automatically during publishing

### Creating a Release

1. Ensure all changes are merged to `main`
2. Create and push a version tag:
   ```bash
   git tag sdk-v1.0.0
   git push origin sdk-v1.0.0
   ```

3. The GitHub Action will automatically:
   - Build the package
   - Run tests
   - Publish to npm as `@luziadev/sdk`
   - Create a GitHub Release

### Tag Format

- Format: `sdk-v{semver}` (e.g., `sdk-v1.0.0`, `sdk-v1.2.3`)
- The version is extracted from the tag name

### Pre-release Verification

Before tagging a release:

```bash
cd packages/sdk

# Build and test
bun run build
bun run test
bun run test:build

# Verify package contents
npm pack --dry-run
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed information about:
- Package structure
- Design decisions
- Type generation workflow
- Error handling patterns
- Retry logic

## Questions?

- Open an issue on [GitHub](https://github.com/luziadev/luzia/issues)
- Contact support@luzia.dev

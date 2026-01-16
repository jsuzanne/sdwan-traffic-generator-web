# Golden Rules - SD-WAN Traffic Generator Workspace

## Docker Build & Deployment

### ⚠️ CRITICAL: Multi-Platform Docker Images
**ALWAYS build Docker images for multiple platforms when pushing to Docker Hub.**

```bash
# ❌ WRONG - Single platform (ARM64 only on Mac M1)
docker build -t jsuzanne/sdwan-web-ui:tag .
docker push jsuzanne/sdwan-web-ui:tag

# ✅ CORRECT - Multi-platform (AMD64 + ARM64)
docker buildx build --platform linux/amd64,linux/arm64 \
  -t jsuzanne/sdwan-web-ui:tag \
  -f web-dashboard/Dockerfile \
  --push .
```

**Why:** Ubuntu LAB servers are AMD64, Mac development is ARM64. Single-platform builds cause "exec format error".

### Docker Image Naming Convention
- **Beta/Testing:** `jsuzanne/sdwan-web-ui:X.Y.Z-beta`
- **Stable Release:** `jsuzanne/sdwan-web-ui:X.Y.Z` + `jsuzanne/sdwan-web-ui:latest`
- **Never push untested code to `latest` tag**

### Required Images
1. `jsuzanne/sdwan-web-ui` - Web dashboard + backend API
2. `jsuzanne/sdwan-traffic-gen` - Traffic generation script

---

## Version Management

### VERSION File
- Location: `/VERSION`
- Format: `X.Y.Z` or `X.Y.Z-beta.N`
- Update BEFORE building Docker images

### Beta Versioning Strategy
**CRITICAL:** Use incremental beta numbers for each build to track changes
- ✅ **Correct:** `1.1.0-beta.1`, `1.1.0-beta.2`, `1.1.0-beta.3`
- ❌ **Wrong:** Reusing `1.1.0-beta` for multiple builds

**Why:** Reusing the same version makes it impossible to differentiate which Docker image contains which features/fixes.

### Changelog
- Location: `/CHANGELOG.md`
- Update for ALL changes (features, fixes, breaking changes)
- Follow [Keep a Changelog](https://keepachangelog.com/) format

---

## Development Workflow

### 1. Local Development
```bash
cd web-dashboard
npm run dev  # Runs on http://localhost:5173
```

**Note:** Traffic generation won't work on macOS in dev mode (Linux-only feature)

### 2. Testing
- Security features: Test on Mac (works in dev mode)
- Traffic generation: Test in Docker on Ubuntu LAB

### 3. Beta Release
1. Update `VERSION` to `X.Y.Z-beta`
2. Update `CHANGELOG.md`
3. Build multi-platform Docker images with `--push`
4. Test in LAB environment
5. **DO NOT commit to GitHub yet**

### 4. Stable Release (After LAB Validation)
1. Update `VERSION` to `X.Y.Z` (remove `-beta`)
2. Tag Docker images as `:latest`
3. Update README.md with new features
4. Commit to GitHub with proper commit message
5. Create GitHub release tag

---

## Code Standards

### Backend (server.ts)
- Use ES Modules (`import`), NOT CommonJS (`require()`)
- All security API endpoints MUST use `authenticateToken` middleware
- Use `promisify(exec)` for shell commands, imported at top

### Frontend (React/TypeScript)
- Use TypeScript interfaces for all API responses
- Add toast notifications for user actions
- Handle loading states and errors gracefully

### Shell Scripts
- Add auto-detection fallbacks (e.g., network interfaces)
- Support both Linux and macOS when possible
- Use `#!/bin/bash` shebang

---

## Documentation Requirements

### For New Features
1. Technical documentation in `/docs/`
2. Quick reference guide
3. FAQ document (if complex feature)
4. Update main README.md
5. Add to CHANGELOG.md

### Artifacts (Brain Directory)
- `task.md` - Task checklist
- `implementation_plan.md` - Technical plan (for complex features)
- `walkthrough.md` - What was accomplished
- `TODO.md` - Next session tasks

---

## Security Testing Feature Specifics

### Configuration
- Location: `config/security-tests.json`
- Contains: test configs, statistics, history

### API Endpoints
- All under `/api/security/*`
- All require authentication
- Return consistent JSON format with `success`, `status`, `message`

### Test Types
1. URL Filtering (67 categories)
2. DNS Security (24 domains)
3. Threat Prevention (EICAR)

---

## Common Pitfalls

### ❌ Don't
- Push single-platform Docker images
- Commit untested code to main branch
- Update `latest` tag before LAB validation
- Use `require()` in ES Module files
- Forget to update VERSION file

### ✅ Do
- Build multi-platform Docker images
- Test in LAB before promoting to stable
- Update CHANGELOG.md for all changes
- Use `import` statements in TypeScript/Node
- Document all new features

---

## Quick Commands Reference

### Multi-Platform Docker Build
```bash
# Setup buildx (once)
docker buildx create --use --name multiplatform-builder

# Build and push web-ui
docker buildx build --platform linux/amd64,linux/arm64 \
  -t jsuzanne/sdwan-web-ui:1.1.0-beta \
  -f web-dashboard/Dockerfile \
  --push .

# Build and push traffic-gen
docker buildx build --platform linux/amd64,linux/arm64 \
  -t jsuzanne/sdwan-traffic-gen:1.1.0-beta \
  -f Dockerfile.traffic-gen \
  --push .
```

### Promote Beta to Stable
```bash
# Tag as stable
docker buildx build --platform linux/amd64,linux/arm64 \
  -t jsuzanne/sdwan-web-ui:1.1.0 \
  -t jsuzanne/sdwan-web-ui:latest \
  -f web-dashboard/Dockerfile \
  --push .

docker buildx build --platform linux/amd64,linux/arm64 \
  -t jsuzanne/sdwan-traffic-gen:1.1.0 \
  -t jsuzanne/sdwan-traffic-gen:latest \
  -f Dockerfile.traffic-gen \
  --push .
```

---

**Last Updated:** 2026-01-16  
**Workspace:** sdwan-traffic-generator

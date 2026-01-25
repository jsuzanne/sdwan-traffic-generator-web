# Golden Rule: Dockerfile & Versioning Synchronization

To prevent deployment failures like `ERR_MODULE_NOT_FOUND` or missing production tags, follow these steps every time changes affect the build or release.

## 1. Dockerfile Synchronization
- **Standard Root Location**: All Dockerfiles used by GitHub Actions (e.g., `Dockerfile.voice-echo`, `Dockerfile.traffic-gen`) **MUST** stay at the root of the repository.
- **Identify New Files**: List all newly created `.ts`, `.js`, or config files.
- **Verify COPY Instructions**: Ensure each new file/directory is correctly `COPY`ed in its respective root Dockerfile.
- **Local Build Test**: If possible, verify the context: `docker build -f Dockerfile.voice-echo .`

## 2. Versioning & Tagging
- **Update VERSION**: Always update the `VERSION` file in the root directory before a release (e.g., `1.1.0-patch.82`).
- **Git Tagging**: Create a version tag matching the pattern `v*.*.*` to trigger the production Docker build:
  ```bash
  git tag v1.1.0-patch.82
  git push origin main --tags
  ```

// turbo-all
## Automation
3. Verify that all backend dependencies are staged, root Dockerfiles are updated, and the version tag is pushed for every minor/patch release.

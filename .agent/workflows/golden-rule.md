---
description: Golden Rule - Dockerfile Synchronization
---

# Golden Rule: Dockerfile Synchronization

To prevent deployment failures like `ERR_MODULE_NOT_FOUND`, follow these steps every time a new source file is added to the backend or dashboard.

## Verification Steps

1. **Identify New Files**: List all newly created `.ts`, `.js`, or config files in the `web-dashboard/` directory.
2. **Check Dockerfile**: Open `web-dashboard/Dockerfile`.
3. **Verify COPY Instructions**: Ensure each new file (e.g., `new-feature.ts`) has a corresponding `COPY` instruction in the "Runtime Stage":
   ```dockerfile
   COPY web-dashboard/new-feature.ts ./
   ```
4. **Local Build Test**: If possible, try a local docker build to verify the context:
   ```bash
   docker build -f web-dashboard/Dockerfile .
   ```

// turbo-all
## Automation
3. Verify that all backend dependencies are staged for commit and included in the Docker build context.

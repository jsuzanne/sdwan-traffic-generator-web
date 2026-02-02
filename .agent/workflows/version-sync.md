---
description: Synchronize project versions across all components
---

To maintain consistency and ensure Docker builds trigger correctly, the following files MUST be updated for EVERY release push:

1.  **Root VERSION**: `/VERSION`
2.  **Engines VERSION**: `/engines/VERSION`
3.  **Web Dashboard VERSION**: `/web-dashboard/VERSION`
4.  **Web Dashboard Package**: `/web-dashboard/package.json` (update the `version` field)
5.  **Security Testing Docs**: `/docs/SECURITY_TESTING.md` (update header and footer feature version)

// turbo
### Execution Steps:
1. Identify the new version (e.g., `v1.1.2-patch.33.62`).
2. Update all mentioned files with the new version string.
3. Commit with a descriptive message including the version.
4. Push to remote.
5. Create and push a Git tag matching the version string (this triggers the Docker builds).

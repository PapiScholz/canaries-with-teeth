# Minimal Post-Mortem Human Flow (for 11-postmortem-minimal.md)

- **Who fills the post-mortem:**
  - The engineer or release owner responsible for the blocked release.
- **When it must be completed:**
  - Before any override or unblock is performed, and within 24 hours of the BLOCK decision.
- **Where it is stored:**
  - The completed post-mortem is committed to the repository under `playbook/postmortems/` (or attached as a CI artifact if not using PRs).

Every BLOCK decision must leave a filled post-mortem using the template in `playbook/11-postmortem-minimal.md`.

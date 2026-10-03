# Projects & Work Management

The Projects module is a tenant-isolated work-management system for both general business delivery and software development.

## Choosing a Template

- **General Business**: tasks, todos, requests, risks, and approvals.
- **Software Delivery**: tasks, bugs, issues, features, backlog-ready ranking, and sprints.
- **Client Implementation, Marketing, Operations, Event Planning**: focused terminology and work types for those teams.

Templates change the visible workflow without creating separate data silos. Every project remains inside its tenant and every API operation validates the authenticated tenant.

## Internal Development Workflow

Create a private project using **Software Delivery**, invite the development team, and record:

- Bugs with severity and reproduction information.
- Issues and blockers.
- Features and requests.
- Todos and delivery tasks.
- Sprints for planned work.

Developers use **Work Items** to see shared work, open an item for checklists and discussion, and move work through the board. **Reports** and **Timesheets** provide delivery and effort visibility.

## Safe Deployment

1. Back up the PostgreSQL database.
2. Run `pnpm projects:verify-migration` and confirm `safeToMigrate: true`.
3. Apply the additive migration using `pnpm exec prisma migrate deploy`.
4. Run the verification command again.
5. Run `pnpm type-check`, `pnpm test`, and `pnpm build`.

Never use `prisma migrate reset` on a shared or production database.

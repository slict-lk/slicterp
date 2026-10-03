# Projects Module Product Re-Evaluation And Recovery Plan

## Current Honest Rating

Current module state after the first implementation pass: **4/10 product readiness**.

The backend foundation has useful pieces, but the user experience felt disconnected because the pages did not guide one clear project lifecycle. Some pages showed data, some pages were empty, and several calls to action sent users into generic screens instead of the project they were working on.

The target is **8/10 mid-market readiness**: a usable internal project system for normal businesses and software teams, with strong tenant isolation, clear workflows, and enough control for planning, execution, time, files, and reporting.

## What Was Broken

- Portfolio opened a project, but the sidebar highlighted global Overview, making it feel like the user was redirected to the wrong place.
- Project creation ended on the global Overview instead of taking the user into the new project workspace.
- Project workspace had an Add Work button, but Work Items ignored `projectId` and `create=true`, so users landed on an empty global board.
- My Work was empty without explaining that only assigned work appears there.
- Work Items showed hardcoded TODO, IN PROGRESS, REVIEW, DONE columns instead of the selected project workflow.
- Templates could be cloned, but the workflow after cloning was unclear: edit, use, create project, then manage project.
- Overview, Portfolio, Project Overview, and Work Items overlapped without a clear responsibility split.
- Empty states did not push the user toward the next useful action.

## Correct Product Spine

The Projects module must follow this simple lifecycle:

1. **Choose a template**: Select a business, software, maintenance, service, or custom template.
2. **Create a project**: Name it, choose dates, budget, visibility, and billing style.
3. **Enter the project cockpit**: The user lands inside that project, not on a generic page.
4. **Set up the project**: Add first work item, assign team, create milestone.
5. **Execute work**: Use List or Board to create, assign, move, comment, attach files, and complete work.
6. **Plan delivery**: Use Timeline, Calendar, Milestones, Sprints, and Team views.
7. **Control cost and time**: Submit/approve timesheets, track cost, and prepare billing.
8. **Report outcomes**: Portfolio and Reports show health, delay, cost, workload, and delivery risk.

## Page Responsibilities

### Overview

Purpose: launchpad and operational summary.

It should show recent projects, urgent assigned work, risks, and quick actions. It should not replace Portfolio or the project cockpit.

### My Work

Purpose: personal execution queue.

Only assigned work appears here. Empty state must explain that the user needs work assigned to them and provide links to Portfolio and All Work.

### Portfolio

Purpose: compare projects and enter one project.

This page should show status, progress, team, budget, risk, due dates, and attention flags. Clicking a project must open the project cockpit.

### Project Cockpit

Purpose: manage one project end to end.

This is the main working area. It must contain Overview, List, Board, Timeline, Calendar, Milestones, Sprints/Backlog, Team, Time & Cost, Files, Activity, and Settings.

### Work Items

Purpose: cross-project triage or project-scoped execution.

When opened from a project, it must be scoped to that project. When opened from the sidebar, it is a global tenant work queue.

### Timesheets

Purpose: time capture, approval, cost control, and billing preparation.

It should connect back to projects and work items.

### Reports

Purpose: management insight.

Reports should answer what is late, overloaded, over budget, unassigned, blocked, or ready to bill.

### Templates

Purpose: configure project starting points.

Templates define allowed work types, workflow statuses, fields, and behavior. After cloning or editing, the user should be able to use the template to create a project.

## Recovery Work Already Applied

- Fixed sidebar active matching so `/projects/[id]` no longer looks like global Overview.
- Project creation now redirects into the new project cockpit.
- Portfolio now has a clear New Project action and better entry messaging.
- Project Add Work now opens project-scoped Work Items with the create dialog open.
- Work Items now respects `projectId` and loads scoped project data.
- Work Items create form preselects the project when opened from a project cockpit.
- Work Items board now uses the project workflow statuses instead of fixed columns.
- Project workspace now has a setup guide: add first work, add team, add milestone.
- My Work now explains empty assignment state and links to Portfolio and All Work.
- Type-check passes after the corrections.

## Remaining Recovery Phases

### Phase 0 - Product Spine Stabilization

- Add a Board tab inside the project cockpit, not only on global Work Items.
- Make project tabs controllable by URL, for example `/projects/:id?tab=team`.
- Replace duplicate global/project work pages with shared components.
- Add consistent breadcrumb and "back to project" behavior everywhere.
- Improve empty states across Timeline, Calendar, Milestones, Sprints, Time & Cost, Files, and Reports.

Quality gate: a new user can create a project, add work, add a team member, add a milestone, and return to the project without confusion.

### Phase 1 - Core Execution Loop

- Complete work-item drawer with edit, assignees, reporter, watchers, comments, checklist, files, dependencies, blockers, and activity.
- Add assignment controls inside create/edit forms.
- Add server-side workflow transition validation for every status move.
- Add bulk actions for assignment, status, priority, sprint, archive, and export.
- Add saved filters for personal and team views.

Quality gate: teams can run daily project work from the module without needing another task tool.

### Phase 2 - Planning Experience

- Add real project Board tab with drag-and-drop.
- Upgrade Timeline to a usable Gantt-style planning view.
- Build Calendar with due dates, milestones, and sprints.
- Complete milestone approval flow.
- Complete sprint planning, backlog ranking, sprint activation, sprint completion, velocity, and carry-forward.
- Add resource allocation warnings before assignment.

Quality gate: managers can plan project delivery and see schedule/capacity risk before assigning work.

### Phase 3 - Collaboration, Time, Cost, And Billing

- Add watchers and mentions.
- Add durable in-app notifications for assignment, mention, due date, overdue, status change, milestone approval, and timesheet approval.
- Add timesheet draft, submit, approve, reject, lock, and invoice lifecycle.
- Track employee cost rates separately from billing rates.
- Generate idempotent draft Accounting invoices from approved billable time or approved milestones.
- Preserve billing audit history and prevent duplicate billing.

Quality gate: the project can move from work planning to approved time and draft invoice without manual duplication.

### Phase 4 - Reports And Hardening

- Add portfolio health, overdue trends, milestone performance, resource capacity, estimated vs actual effort, profitability, utilization, sprint velocity, bug aging, and bottleneck reports.
- Add CSV export with permissions.
- Add cursor pagination and performance tuning for large portfolios.
- Add cross-tenant integration tests and permission tests.
- Add Playwright tests for business and software project lifecycles.
- Document rollout, migration, and rollback steps.

Quality gate: module is safe enough for production tenants and useful enough to sell.

## Golden Path Acceptance Test

This flow must pass before the module is considered workable:

1. Create a project from a business template.
2. Land inside the created project cockpit.
3. Add a project member.
4. Add a milestone.
5. Add a work item from the project cockpit.
6. See the work item in the project board/list.
7. Assign it to a user.
8. See it appear in My Work.
9. Move it through the workflow.
10. Add a comment, checklist item, dependency, and attachment.
11. Log time against it.
12. Approve the time.
13. See updated project health, cost, and reports.

## Development-Team Specific Flow

For the ERP team itself, a software project template should enable:

- Bugs
- Issues
- Features
- Technical tasks
- Story points
- Sprints
- Backlog
- Testing stages
- Severity
- Reproduction steps
- Release fields

For normal business customers, those software-specific fields should stay hidden unless their template enables them.

## Final Direction

The module should stop feeling like separate pages and become one connected operating system for work:

**Portfolio tells you where to look. Project cockpit tells you what to do. Work Items is where execution happens. My Work tells each person what they owe. Reports tell management what is drifting.**


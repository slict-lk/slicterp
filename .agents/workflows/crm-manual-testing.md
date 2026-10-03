---
description: manual QA verification for the CRM module
---

# CRM Manual Verification Workflow

Follow these steps to ensure the CRM module is functioning correctly across all high-fidelity interfaces.

## 1. Leads & Prospecting
1. Navigate to `[URL]/crm/leads`.
2. Verify that the lead list loads without errors (checks API `/api/crm/leads`).
3. **Mobile Test**: Resize browser to < 768px and verify list transforms into high-fidelity cards.
4. **Action**: Click "Add Lead" (Verify modal/button trigger).

## 2. Pipeline Management (Kanban)
1. Navigate to `[URL]/crm/pipelines`.
2. Verify stages (Prospecting, Qualification, etc.) are loaded dynamically.
3. **Drag & Drop**: Move an opportunity card from one column to another.
   - Verify the "shimmer" effect on the target column.
   - Verify the card status reflects the new stage after drop.
4. **Visuals**: Check that probability badges change color based on value (e.g., green for >70%).

## 3. Account Directory
1. Navigate to `[URL]/crm/accounts`.
2. Verify the "360° Intelligence" panel is visible on desktop.
3. **Data Check**: Verify "Annual Capital" (revenue) is formatted correctly in the user's currency.
4. **Mobile Test**: Verify the "Team" badge is visible on account cards.

## 4. Operational Activities
1. Navigate to `[URL]/crm/activities` (or view the queue in `/crm`).
2. Verify activity icons match the type (Phone for CALL, Mail for EMAIL).
3. **Status Check**: Verify "OVERDUE" badges have a pulse animation.

## 5. Global CRM Dashboard (Overview)
1. Navigate to `[URL]/crm`.
2. Verify metric cards (Pipeline Value, Leads) have gradient mesh backgrounds.
3. Verify "Operational Queue" matches the latest activities.
4. Verify the "Pipeline Dynamics" distribution chart/list is rendered.

## Workflow Builder Smoke Test

Use this checklist any time the builder UI changes. It exercises the new inspector, drag/drop logic, and JSON interchange without needing backend data beyond what already ships with the UI.

### 1. Launch + Layout
1. `npm run dev` and open the builder at http://localhost:5173/workflows/builder.
2. Confirm the gradient toolbar renders with **Execute**, **Activate**, **Import/Export**, and **Save** buttons.
3. Collapse/expand both sidebars via the chevron buttons or `⌘/Ctrl + B` (node library) and `⌘/Ctrl + I` (inspector).

### 2. Drag/Drop & Canvas Interactions
1. Drag one Source, Transform, and Destination node from the left library into the canvas; they should snap into place with the new card styling.
2. Connect the nodes by dragging from an output handle to the next input.
3. Pan/zoom with the trackpad or mouse wheel to ensure the canvas keeps the new glass background.

### 3. Inspector (Desktop)
1. Double-click a node or single-click it once; the right-hand inspector panel should slide open.
2. Verify the editor header shows the dirty-state pill (“Unsaved changes” vs “In sync”).
3. Change a field, click **Save changes**, and confirm the pill switches back to “In sync”.

### 4. Inspector (Mobile/Tablet)
1. Use devtools to simulate an iPad (≤1024px wide) and reload.
2. Tap a node; the modal inspector should open full-screen with the same styling as desktop.
3. Dismiss it via the X button.

### 5. Import/Export JSON
1. Click **Export** and download the generated JSON; confirm it contains the nodes you added.
2. Delete the nodes from the canvas, then use **Import** to re-upload the file and ensure the layout rehydrates correctly.

### 6. Execute & Activate Buttons
1. With nodes present, click **Execute**; you should see the persistent “Executing…” toast followed by success/error once the mock API responds.
2. Toggle **Activate** and confirm the button swaps between “Activate” (white) and “Deactivate” (orange) while success toasts appear.

### 7. Metadata Modal
1. If you open the builder with no `id` parameter, press **Save**. The metadata modal should appear with the new inputs.
2. Fill in the cron + IDs, save, and ensure the modal closes without errors.

> Tip: If you need to repeat tests quickly, you can reset the builder state by refreshing the page or visiting `/workflows/builder?id=<existingJobId>`.

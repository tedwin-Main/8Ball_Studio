# Major Bug Fixes

## Artigusto Gelato Logo not displaying correctly (05/08/2026, 11:50 PM)

### Problem

The Artigusto logo showed a checkerboard, appeared blank, or sat too low inside the carousel card.

### Fix

- Replaced the old JPEG with `Artigusto-Gelato_Clearned.png`.
- Added `type: 'artigusto'` for scoped styling.
- Added absolute square positioning.
- Added circular clipping to hide the baked checkerboard.
- Added caption layering above the logo.

### Files Changed

- [src/App.jsx](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/App.jsx)
  - Modified — [line 9](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/App.jsx:9) now imports the cleaned PNG.
  - Removed — the old Artigusto JPEG import.
  - Added — [line 26](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/App.jsx:26) adds `type: 'artigusto'` for scoped card styling.
- [src/styles.css](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/styles.css)
  - Added — [line 671](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/styles.css:671) adds `.project-card.is-artigusto img` to center the logo and clip the baked checkerboard.
  - Added — [line 688](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/styles.css:688) adds caption layering above the image.
- [src/assets/Artigusto-Gelato_Clearned.png](/Users/sloth/ALL%20PROJECTS/8Ball_Studio_Codex/src/assets/Artigusto-Gelato_Clearned.png)
  - Added — cleaned logo asset.

### Documentation Prompt

Update `DOCS/MAJOR BUG FIX.md` using this format:

Create one dated `##` subheading for the bug. Explain the problem and fix in plain English. Under `### Files Changed`, group entries by file. Use nested point-form bullets labeled `Added`, `Removed`, or `Modified`. Link each file and exact line number. Use inline code for changed selectors, imports, props, and values. Do not include code blocks or a separate files list.

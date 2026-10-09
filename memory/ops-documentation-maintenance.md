# OPS documentation maintenance

On 2026-10-09, the eight existing OPS failures were resolved in documentation.
Five were trailing spaces in ADR-0036. Two were file-level reports of command
examples without `--no-cache`, in ADR-0036 and historical progress entries.
All command mentions in those files now use the required option.

The remaining report was a false positive: ADR-0037 described the task-progress
tool in English, which matched the placeholder detector. Those two descriptions
now use precise Chinese terms. The `TodoWrite` identifier remains unchanged.
The checker and App implementation were not modified.

The current OPS check passes. Earlier audit and progress entries that recorded
eight failures describe their verification dates, not the current state.

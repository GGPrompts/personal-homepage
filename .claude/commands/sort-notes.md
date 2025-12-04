# Sort Quick Notes

Sort and distribute quick notes from the inbox to their respective project PLAN.md files.

## Instructions

1. **Read the quick notes file** at `~/.config/homepage/quicknotes.json`

2. **Group notes by project**:
   - `general` - Leave in place or ask user what to do
   - `personal` - Could go to `~/personal/PLAN.md` or leave in place
   - Project names - Append to `~/projects/{project}/PLAN.md`

3. **For each project with notes**:
   - Check if `PLAN.md` exists in the project directory
   - If not, create it with a basic header
   - Append notes under a `## Quick Notes` or `## Inbox` section
   - Format each note with a timestamp and checkbox: `- [ ] {note} (added {date})`

4. **After processing**:
   - Remove processed notes from quicknotes.json (keep general/personal if user wants)
   - Report what was done: which projects received notes, how many total

5. **PLAN.md format** (create if doesn't exist):
```markdown
# {Project Name} - Plan

## Quick Notes
<!-- Notes captured from Quick Notes inbox -->

## TODO
<!-- Prioritized tasks -->

## Ideas
<!-- Future improvements -->
```

## Example

If quicknotes.json contains:
```json
{
  "notes": [
    { "project": "homepage", "text": "fix auth modal on mobile", "createdAt": "2024-01-15T..." },
    { "project": "homepage", "text": "add dark mode", "createdAt": "2024-01-15T..." },
    { "project": "general", "text": "research testing frameworks", "createdAt": "2024-01-15T..." }
  ]
}
```

Then append to `~/projects/homepage/PLAN.md`:
```markdown
## Quick Notes

- [ ] fix auth modal on mobile (Jan 15)
- [ ] add dark mode (Jan 15)
```

And leave the "general" note in the inbox.

## Notes

- Only process notes for projects that exist in `~/projects/`
- If a project doesn't exist locally, warn and skip that note
- Preserve any existing content in PLAN.md files
- Use the project's existing PLAN.md format if it differs from the template

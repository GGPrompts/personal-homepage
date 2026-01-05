# Jobs

Automated Claude batch prompts across projects.

## Files
- `app/sections/jobs.tsx` - Main component
- `lib/jobs/types.ts` - Job types
- `hooks/useJobResults.ts` - Result management
- `app/api/jobs/route.ts` - Job execution API

## Features
- Create reusable job templates
- Run prompts across multiple projects
- Pre-checks (git clean, tests pass)
- Job triggers (manual, scheduled)
- Streaming output display
- Results inbox:
  - View outputs per project
  - Success/failure status
  - Copy results
- Job history
- Batch execution

## Job Configuration
- **Name**: Job identifier
- **Prompt**: Claude prompt template
- **Projects**: Target project list
- **Pre-checks**: Validation before run
- **Triggers**: Manual, cron schedule

## TabzChrome Selectors
- `data-tabz-section="jobs"` - Container
- `data-tabz-action="create-job"` - New job
- `data-tabz-action="edit-job"` - Edit template
- `data-tabz-action="run-job"` - Execute
- `data-tabz-action="stop-job"` - Cancel running
- `data-tabz-action="view-result"` - Show output
- `data-tabz-region="inbox"` - Results inbox
- `data-tabz-list="jobs"` - Job list
- `data-tabz-item="job"` - Individual job
- `data-tabz-list="results"` - Result list

## Integration
- Claude Code backend for execution
- Project list from Projects Dashboard

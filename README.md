One thing to know: GitHub branch protection only supports a single fixed "required approvals" number per branch — a workflow can't raise it dynamically. So this workflow labels + 

## Pull request review policy

The `Review requirements` workflow assigns each pull request one of two review
requirements:

- **1 approval** when every change is to `conf.py` or is a trivial edit to a
  `.md`, `.rst`, or `.txt` documentation file.
- **2 approvals** when a file is added or renamed, a documentation file has 20
  or more changed lines, or any other type of file is changed.

The cutoff is the `SIGNIFICANT_LINE_THRESHOLD` constant near the top of
`.github/workflows/review-requirements.yml`; change that value to tune what
counts as a significant documentation edit. This deterministic threshold and
the other file rules remain the floor: an AI assessment of the documentation
diff may escalate **1 to 2 approvals**, but can never lower a 2-approval
requirement. This prevents a non-deterministic model from weakening the gate.

The AI assessment is disabled by default. Set the repository variable
`ENABLE_AI_REVIEW_ASSESSMENT` to `true` to enable it for documentation edits
that otherwise need only one approval and have available patch data. Unset the
variable (or set it to anything other than `true`) to skip the AI step. The
workflow grants `models: read` for GitHub Models; usage depends on account or
organization availability and rate limits. If GitHub Models is unavailable,
fails, times out, or returns an invalid response, the deterministic result
applies and the workflow continues without blocking on the model.

GitHub branch protection cannot vary its approval requirement dynamically. For
`main`, configure branch protection to require **1 approving review** and make
the `assess` job from the `Review requirements` workflow a **required status
check**. The workflow escalates complex changes to two approvals by failing that
check until both approvals are present.

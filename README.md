# demogit
 This is anew file

 I am addint more things
 this is attempt to sign things
 second attempt
 third attempt


 fourth attempt
 test 
gggg
 testing branch 12 3j

## Pull request review policy

The `Review requirements` workflow assigns each pull request one of two review
requirements:

- **1 approval** when every change is to `conf.py` or is a trivial edit to a
  `.md`, `.rst`, or `.txt` documentation file.
- **2 approvals** when a file is added or renamed, a documentation file has 20
  or more changed lines, or any other type of file is changed.

The cutoff is the `SIGNIFICANT_LINE_THRESHOLD` constant near the top of
`.github/workflows/review-requirements.yml`; change that value to tune what
counts as a significant documentation edit.

The check is **advisory and non-blocking**: it applies the
`reviews-required-1` / `reviews-required-2` label, keeps a single sticky comment
showing the recommended and current approval counts, and writes a job summary,
but it never fails because of missing approvals. Do not mark the `assess` job as
a required status check — it always passes, so doing so would not enforce
anything.

Branch protection's own **required approvals** setting on `main` remains the only
hard gate. The workflow's 2-approval classification is a recommendation that
reviewers should honour manually before merging.

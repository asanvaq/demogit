# demogit
 This is a new file

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

GitHub branch protection cannot vary its approval requirement dynamically. For
`main`, configure branch protection to require **1 approving review** and make
the `assess` job from the `Review requirements` workflow a **required status
check**. The workflow escalates complex changes to two approvals by failing that
check until both approvals are present.

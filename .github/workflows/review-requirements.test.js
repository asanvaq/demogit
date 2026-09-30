const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const workflow = fs.readFileSync(path.join(__dirname, 'review-requirements.yml'), 'utf8');

function script(id) {
  const step = workflow.split(/^      - name: /m)
    .find(part => part.includes(`        id: ${id}\n`));
  assert.ok(step, `step ${id} exists`);
  const source = step.split('          script: |\n')[1];
  assert.ok(source, `step ${id} has an inline script`);
  return source.replace(/^            /gm, '');
}

const classify = new Function('github', 'context', 'core', 'process', `return (async () => {\n${script('classify')}\n})()`);
const enforce = new Function('github', 'context', 'core', 'process', `return (async () => {\n${script('enforce')}\n})()`);

function fixture(files, options = {}) {
  const outputs = {};
  const changes = { added: [], removed: [], created: [], updated: [] };
  const comments = options.comments || [];
  const rest = {
    pulls: { listFiles() {}, listReviews() {} },
    issues: {
      listComments() {},
      async getLabel() {},
      async createLabel() {},
      async addLabels({ labels }) { changes.added.push(...labels); },
      async removeLabel({ name }) { changes.removed.push(name); },
      async createComment({ body }) { changes.created.push(body); },
      async updateComment({ body }) { changes.updated.push(body); }
    }
  };
  const github = {
    rest,
    async paginate(method) {
      if (method === rest.pulls.listFiles) return files;
      if (method === rest.pulls.listReviews) return options.reviews || [];
      if (method === rest.issues.listComments) return comments;
      throw new Error('Unexpected pagination');
    }
  };
  const context = { repo: { owner: 'owner', repo: 'repo' }, payload: {
    pull_request: { number: 1, user: { login: 'author' } }
  } };
  const summary = {
    addHeading() { return this; },
    addTable(rows) { changes.summary = rows; return this; },
    async write() {}
  };
  const core = {
    summary,
    setOutput(key, value) { outputs[key] = String(value); },
    setFailed(message) { changes.failure = message; },
    info() {}
  };
  return {
    outputs, changes,
    async classify() {
      await classify(github, context, core, { env: {} });
      return outputs;
    },
    async enforce(response = '', outcome = 'skipped') {
      await enforce(github, context, core, { env: {
        REQUIRED_DETERMINISTIC: outputs.required_deterministic,
        REASONS: outputs.reasons,
        AI_OUTCOME: outcome,
        AI_RESPONSE: response
      } });
      return outputs;
    }
  };
}

const doc = (patch = '@@ -1 +1 @@\n-old\n+new', additions = 1, deletions = 1) => ({
  filename: 'README.md', status: 'modified', additions, deletions, patch
});

test('deterministic two is the floor and skips AI even for documentation', async () => {
  const run = fixture([doc('large patch', 21, 0)]);
  assert.equal((await run.classify()).needs_ai, 'false');
  await run.enforce('{"significant":false}', 'success');
  assert.equal(run.outputs.required, '2');
  assert.deepEqual(run.changes.added, ['reviews-required-2']);
});

test('a meaningful small doc edit escalates with a sanitized advisory comment and label', async () => {
  const run = fixture([doc()], {
    comments: [{ id: 4, user: { type: 'Bot' }, body: '### Review requirement: old' }],
    reviews: [
      { user: { login: 'author' }, state: 'APPROVED' },
      { user: { login: 'reviewer' }, state: 'APPROVED' },
      { user: { login: 'reviewer' }, state: 'DISMISSED' }
    ]
  });
  assert.equal((await run.classify()).needs_ai, 'true');
  await run.enforce('{"significant":true,"reason":"`Changed\\nmeaning`"}', 'success');
  assert.equal(run.outputs.required, '2');
  assert.equal(run.outputs.approvals, '0');
  assert.deepEqual(run.changes.added, ['reviews-required-2', 'reviews-ai-escalated']);
  assert.equal(run.changes.created.length, 0);
  assert.match(run.changes.updated[0], /AI assessment \(advisory, escalate-only\): significant doc change —  Changed meaning /);
  assert.ok(!run.changes.updated[0].includes('`Changed'));
  assert.deepEqual(run.changes.summary.at(-1), [{ data: 'AI escalation', header: true }, 'yes']);
});

test('false, failed, malformed, and non-boolean verdicts keep one approval', async () => {
  for (const [response, outcome] of [
    ['{"significant":false}', 'success'],
    ['{"significant":true}', 'failure'],
    ['broken json', 'success'],
    ['{"significant":"true"}', 'success'],
    ['```json\n{"significant":false}\n```', 'success'],
    ['', 'success']
  ]) {
    const run = fixture([doc()], {
      reviews: [{ user: { login: 'reviewer' }, state: 'APPROVED' }]
    });
    await run.classify();
    await run.enforce(response, outcome);
    assert.equal(run.outputs.required, '1', `${outcome}: ${response}`);
    assert.equal(run.changes.failure, undefined);
    assert.ok(run.changes.removed.includes('reviews-ai-escalated'));
  }
});

test('fenced valid true is parsed after removing fences', async () => {
  const run = fixture([doc()]);
  await run.classify();
  await run.enforce('```json\n{"significant":true,"reason":"New instructions"}\n```', 'success');
  assert.equal(run.outputs.required, '2');
});

test('diff contains only documentation patches and is bounded', async () => {
  const run = fixture([doc('x'.repeat(13000)), {
    filename: 'conf.py', status: 'modified', additions: 1, deletions: 0, patch: 'SECRET'
  }]);
  const outputs = await run.classify();
  assert.equal(outputs.needs_ai, 'true');
  assert.ok(outputs.diff.startsWith('--- README.md\n'));
  assert.equal(outputs.diff.length, 12000);
  assert.ok(outputs.diff.endsWith('... [truncated]'));
  assert.ok(!outputs.diff.includes('SECRET'));
});

test('no docs or no available patch skips AI', async () => {
  for (const files of [[{ filename: 'conf.py', status: 'modified', additions: 1, deletions: 0 }],
    [doc(null)]]) {
    const run = fixture(files);
    const outputs = await run.classify();
    assert.equal(outputs.needs_ai, 'false');
    assert.equal(outputs.diff, '');
  }
});

test('the repository variable disables the AI action', async () => {
  assert.match(workflow, /if: steps\.classify\.outputs\.needs_ai == 'true' && vars\.ENABLE_AI_REVIEW_ASSESSMENT == 'true'/);
  assert.match(workflow, /continue-on-error: true/);
  const run = fixture([doc()]);
  await run.classify();
  await run.enforce();
  assert.equal(run.outputs.required, '1');
});

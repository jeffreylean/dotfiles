#!/usr/bin/env node

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: codecrafter-run.js [slice description]\n\nPrints a CodeCrafter TDD response scaffold.\n\nExamples:\n  codecrafter-run.js "reactor mailbox enqueue behavior"\n  node codecrafter-run.js "parse event envelope"`);
  process.exit(0);
}

const slice = args.join(" ").trim() || "<next small behavior>";

console.log(`Plan:
- Orient on the smallest relevant context.
- Define one focused test slice.
- Write failing tests/specs only.
- Hand implementation back to the user.

Unresolved questions:
- <none or list questions>

Test slice:
- Behavior/invariant: ${slice}
- Files changed: <test/spec files>
- Command: <test command>
- Expected result: failing test because <missing API/behavior>

Your implementation task:
- Implement the minimal production code needed to satisfy this test.
- Avoid broadening scope beyond this slice.
`);

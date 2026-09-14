# Contributing

This repository is a personal configuration published as-is; issues and pull requests are welcome but may not be answered.

If you do open a pull request:

- `npm test` must pass; add a test for any change to `hooks/gate.js`.
- Keep `policy/adaptive-router.md` to one page — the policy is only useful while it is short enough to be read every session.
- Refer to models by their aliases (`sonnet`, `opus`, `fable`) rather than dated full ids wherever possible.
- No dependencies. The hooks and scripts must run on Node.js ≥ 18 on Windows, macOS, and Linux.
- Do not add anything that reads prompts or file contents inside the gate; it inspects `subagent_type` and `model` only.

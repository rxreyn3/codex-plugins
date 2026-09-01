# RPIV Codex

RPIV Codex is an independent Codex port of the RPIV feature-development workflow. It provides Codex-native skills for discovery, research, planning, revision, implementation, validation, local commits, and code review.

The plugin is under active development and currently targets local installation through its bundled Codex marketplace definition.

## Skills

- Discover
- Research
- Blueprint
- Revise
- Implement
- Validate
- Commit
- Code Review

Each stage preserves an explicit stop boundary. Recommended successor stages are handoffs for a fresh Codex task, not permission to continue automatically.

## Origin and attribution

RPIV Codex is a port and adaptation of [`@juicesharp/rpiv-pi`](https://github.com/juicesharp/rpiv-mono/tree/main/packages/rpiv-pi), created by [Sergii Guslystyi (`juicesharp`)](https://github.com/juicesharp).

The port is based on [`rpiv-pi` commit `7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7`](https://github.com/juicesharp/rpiv-mono/tree/7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7/packages/rpiv-pi). Its workflows, specialist prompts, templates, and helper scripts have been copied or adapted to replace Pi-specific mechanics with Codex-native skills, tools, collaboration, artifact references, and plugin packaging.

This repository is maintained independently by Ryan Reynolds. It is not an official RPIV-Pi release and is not affiliated with or endorsed by the upstream author.

## License

RPIV Codex is distributed under the [MIT License](LICENSE). The license preserves the upstream `juicesharp` copyright and identifies Ryan Reynolds's copyright in the Codex adaptation.

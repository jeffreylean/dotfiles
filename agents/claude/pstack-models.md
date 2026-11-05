# pstack model configuration

Per-role model overrides for pstack skills. Each pstack SKILL.md names its defaults in a Models section; the values here override those defaults. Delete a line to fall back to the skill default. A value of `inherit-parent` or `auto` runs that role on the parent session's model (the `Agent` call omits `model`); an alias entry in a panel list still counts toward that panel's fan-out. A model may carry a reasoning effort, as in `opus @xhigh` (levels: low, medium, high, xhigh, max); the role's subagent then runs at that level, each entry of a panel list on its own. `default effort` sets the level for a value without one; `session` keeps the parent session's effort. `session hook: off` stops the Claude Code, Codex, or Muse SessionStart hook, or the pstack Pi extension, from injecting the poteto-mode mandate; any other value, or no line, leaves it on.

feature, refactoring: opus @high
bug-fix: opus @high
perf-issue: opus @high
hillclimb: opus @high
judgment and prose: opus @high
strongest judgment: fable @xhigh
how explorer: opus @medium
how explainer: opus @high
why investigators: opus @medium
why synthesizer: opus @high
reflect tooling: opus @medium
reflect judgment, divergent, synthesizer: opus @high
arena runners: opus @high, fable @high, sonnet @high, haiku @medium
arena cross-judge pool: opus @high, fable @high, sonnet @high, haiku @high
swarm workers: opus @medium
architect runners: opus @xhigh, fable @xhigh, sonnet @high, haiku @high
interrogate reviewers: opus @xhigh, fable @xhigh, sonnet @high, haiku @high

default effort: high
session hook: on

// grind-mode worker context limit.
// Loaded only into grind workers, through the run's copy of settings/worker.json, never globally.
//
// Claude Code gives hooks no context usage, only the status line. So:
// - `statusline` records the context use Claude Code reports, shows it on the worker's status
//   line and reports it to herdr as the pane's `context` token, where the chief sees it.
// - `hook` runs after each tool call. Once the context passes GRIND_LIMIT (30% by default) it
//   tells the worker, once per session, to finish its step, write a handoff and tell the chief.

import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const DEFAULT_LIMIT = 30

const dir = path.join(os.tmpdir(), 'grind', 'context')
const limit = Number(process.env.GRIND_LIMIT) || DEFAULT_LIMIT
const input = JSON.parse(fs.readFileSync(0, 'utf8'))
const usageFile = path.join(dir, `${input.session_id}.json`)

function readPercent() {
  try {
    return JSON.parse(fs.readFileSync(usageFile, 'utf8')).percent
  } catch {
    return undefined
  }
}

function statusline() {
  const used = input.context_window?.used_percentage
  if (used == null) {
    process.stdout.write(`grind · limit ${limit}%`)
    return
  }
  const percent = Math.round(used)
  if (percent !== readPercent()) {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(usageFile, JSON.stringify({ percent }))
    if (process.env.HERDR_PANE_ID) {
      execFile('herdr', ['pane', 'report-metadata', process.env.HERDR_PANE_ID, '--source', 'grind', '--token', `context=${percent}%`], () => {})
    }
  }
  process.stdout.write(`grind · context ${percent}% · limit ${limit}%`)
}

function hook() {
  // A SendMessage is usually the report that ends the turn; nudging then would only buy an extra turn.
  if (input.tool_name === 'SendMessage') return
  const percent = readPercent()
  if (percent == null || percent < limit) return
  try {
    fs.writeFileSync(path.join(dir, `${input.session_id}.asked`), '', { flag: 'wx' })
  } catch {
    return // already asked in this session
  }
  const additionalContext = [
    `[grind] Your context is at ${percent}%, past the ${limit}% limit.`,
    'Finish only the step you are in and leave the files consistent.',
    'Then write a handoff following ~/.agents/skills/handoff/SKILL.md into the handoffs folder your task message names,',
    'send the chief its path with SendMessage, and end your turn.',
    'Do not say the task is finished unless it is. The chief will give you a fresh session to continue from the handoff.',
  ].join(' ')
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext } }))
}

if (process.argv[2] === 'statusline') statusline()
else hook()

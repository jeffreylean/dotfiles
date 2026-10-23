// grind-mode worker extension.
// Loaded only into grind workers (`pi -e .../grind-worker.ts --grind-limit 30`), never globally.
//
// When the worker's context passes the limit, it tells the worker, once per session, to stop at
// a safe point, write a handoff and tell the chief over intercom. The chief then restarts the
// worker in a fresh session that continues from the handoff.
// @ts-nocheck

const DEFAULT_LIMIT = 30;

export default function (pi) {
  pi.registerFlag("grind-limit", {
    type: "string",
    description: `grind-mode: percent of the context window at which the worker hands off (default ${DEFAULT_LIMIT})`,
  });

  let asked = false;

  pi.on("session_start", () => {
    asked = false;
  });

  pi.on("turn_end", (event, ctx) => {
    // A turn without tool results ends the run anyway; steering then would only buy an extra turn.
    if (asked || !event?.toolResults?.length) return;
    const usage = ctx.getContextUsage?.();
    const limit = Number(pi.getFlag("grind-limit")) || DEFAULT_LIMIT;
    if (usage?.percent == null || usage.percent < limit) return;
    asked = true;
    pi.sendUserMessage(
      [
        `[grind] Your context is at ${Math.round(usage.percent)}%, past the ${limit}% limit.`,
        "Finish only the step you are in and leave the files consistent.",
        "Then write a handoff following ~/.agents/skills/handoff/SKILL.md into the handoffs folder your task message names,",
        "send the chief its path over intercom, and end your turn.",
        "Do not say the task is finished unless it is. The chief will restart you in a fresh session to continue from the handoff.",
      ].join(" "),
      { deliverAs: "steer" },
    );
  });
}

-- Rex has no copy mode, so the "scrollback" action opens the focused pane's
-- scrollback in nvim in a floating pane. q or Esc closes it. Pressing > on a
-- visual selection quotes it into a message that is sent to the pane on exit.

local terminal = "com.superlogical.terminal"
local shell = "com.superlogical.terminal.shell"
local nvim_setup = debug.getinfo(1, "S").source:gsub("^@", ""):match("(.*)/") .. "/nvim.lua"

-- A quote starts with ">", which a shell would run as a redirect on Enter.
local SHELLS = { zsh = true, bash = true, fish = true, sh = true, dash = true, ksh = true, tcsh = true, nu = true }

local function submits(block_id)
  local proc = rex.block.call(terminal, "process", { block_id = block_id })
  local foreground = proc and proc.foreground
  return foreground ~= nil and not SHELLS[foreground.name]
end

local function scrollback_text(block_id)
  local max_bytes = 983040
  local r, err = rex.block.call(terminal, "format", {
    block_id = block_id, format = "text", trim = true, unwrap = true, max_bytes = max_bytes,
  })
  if not r then return nil, err end
  local parts, offset = { r.content }, #r.content
  while r.id and not r.eof do
    r, err = rex.block.call(terminal, "blob_read", { block_id = block_id, id = r.id, offset = offset, max_bytes = max_bytes })
    if not r then return nil, err end
    parts[#parts + 1] = r.data
    offset = offset + #r.data
  end
  return table.concat(parts)
end

rex.action{
  name = "scrollback",
  title = "Scrollback in Neovim",
  category = "Pane",
  run = function(ctx)
    local text, err = scrollback_text(ctx.block_id)
    if not text then error(err, 0) end
    local path = os.tmpname()
    local f = assert(io.open(path, "w"))
    f:write(text)
    f:close()
    local _, layer_err = rex.session.new_layer{
      bounds = { 0.05, 0.05, 0.9, 0.9 },
      focus = true,
      layout = rex.layout.block{ flavor = shell, label = "scrollback", options = {
        -- Only ~/.zshrc puts Homebrew on PATH, and this shell doesn't read it.
        path_prepend = { "/opt/homebrew/bin" },
        command = {
          "nvim", "-n", "+",
          "-c", string.format("lua dofile(%q)({ block_id = %q, submit = %s })",
            nvim_setup, ctx.block_id, tostring(submits(ctx.block_id))),
          path,
        },
      } },
    }
    if layer_err then error(layer_err, 0) end
  end,
}

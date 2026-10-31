-- Steps a new pane's font size until its cells are as tall as the pane it was
-- split from. Rex gives no way to set a pane's font size, so init.lua starts
-- this with `rex do` after a split. The app's font actions resize its focused
-- pane, whatever block they name, so this stops once the new pane loses focus.
-- Args: client_id, the app; block_id, the new pane; height, the source pane's
-- cell height in px.

local terminal = "com.superlogical.terminal"
local block_id = rex.args.block_id
local client_id = rex.args.client_id
local target = tonumber(rex.args.height)

local function height()
  local s = rex.block.call(terminal, "size", { block_id = block_id })
  if s and #(s.desired or {}) > 0 then return s.cell_height_px end
end

local function focused()
  local v = rex.session.view{}
  for _, w in ipairs(v and v.windows or {}) do
    if w.window_id == v.active_window_id then
      return w.focused_block_id == block_id
    end
  end
end

-- Waits up to `timeout` seconds for the height to differ from `old`.
local function wait_change(old, timeout)
  for _ = 1, timeout / 0.05 do
    local h = height()
    if h and h ~= old then return h end
    rex.sleep(0.05)
  end
end

local h = wait_change(nil, 3)
local last_step
for _ = 1, 16 do
  if not h or h == target then break end
  local step = h < target and "increase" or "decrease"
  -- Overshooting reverses the direction; the sizes in between don't match.
  if (last_step and step ~= last_step) or not focused() then break end
  rex.call("client.perform", { client_id = client_id, action = "client.font." .. step })
  last_step = step
  h = wait_change(h, 1.5)
end

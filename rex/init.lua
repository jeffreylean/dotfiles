-- Translated from ~/dotfiles/tmux/common.conf and macos.conf.
-- Prefix is ctrl+space, written as the first key of each sequence.

local terminal = "com.superlogical.terminal"
local shell = "com.superlogical.terminal.shell"

-- The focused pane's directory, read from its foreground process so it works
-- whether or not the shell reports its directory.
local function current_dir()
  local r = rex.block.call(terminal, "process", {})
  local p = r and (r.foreground or r.child)
  return p and p.cwd
end

local config_dir = (os.getenv("REX_CONFIG") or (os.getenv("XDG_CONFIG_HOME") or os.getenv("HOME") .. "/.config") .. "/rex/init.lua"):match("^(.*)/")
local rex_bins = {
  "rex",
  os.getenv("HOME") .. "/Library/Application Support/com.superlogical.rex/RexServer/Versions/Current/Rex Server.app/Contents/MacOS/rex",
}

-- New panes start at the default font size. Step the new pane's font to
-- match the pane it was split from; see match_font.lua.
local function match_font(ctx, block_id)
  local size = rex.block.call(terminal, "size", { block_id = ctx.block_id })
  if not (size and ctx.client_id and ctx.session_id and block_id) then return end
  for _, bin in ipairs(rex_bins) do
    local h = rex.exec.start({
      bin, "do", "-s", ctx.session_id, config_dir .. "/match_font.lua",
      "client_id=" .. ctx.client_id, "block_id=" .. block_id, "height=" .. size.cell_height_px,
    }, { detach = true, stdout = false, stderr = false })
    if h then return end
  end
end

local function split_beside(ctx, direction, options)
  local r, err = rex.session.new_split{
    anchor_id = ctx.block_id,
    direction = direction,
    side = "after",
    focus = true,
    layout = rex.layout.block{ flavor = shell, options = options },
  }
  if r then match_font(ctx, r.block_ids and r.block_ids[1]) end
  return r, err
end

-- bind v / s: split-window -c "#{pane_current_path}". The app's own splits
-- keep the directory but not the font size, so these replace them. Unlike the
-- app, rex.session.new_split starts in ~ unless it is given a cwd.
local function split(name, title, direction)
  rex.action{
    name = name,
    title = title,
    category = "Pane",
    run = function(ctx)
      return split_beside(ctx, direction, { cwd = current_dir() })
    end,
  }
end
split("split_right", "Split Right Custom", "horizontal")
split("split_down", "Split Down Custom", "vertical")
rex.bind("ctrl+space>v", "split_right")
rex.bind("ctrl+space>s", "split_down")
rex.bind("cmd+d", "split_right")
rex.bind("shift+cmd+d", "split_down")

-- bind t (c in tmux): new-window -c "#{pane_current_path}"
rex.action{
  name = "tab_here",
  title = "New Tab in This Directory",
  category = "Tab",
  run = function()
    return rex.session.new_window{
      layout = rex.layout.block{ flavor = shell, options = { cwd = current_dir() } },
    }
  end,
}
rex.bind("ctrl+space>t", "tab_here")
rex.bind("cmd+t", "tab_here")

-- Claude in a new pane, in a folder picked with zoxide's zi (fzf over your
-- recent folders). Cancelling the picker leaves a plain shell.
rex.action{
  name = "claude_pick",
  title = "Claude Code in Folder…",
  category = "Agents",
  args = { direction = "string?" },
  run = function(ctx, args)
    local direction = args and args.direction or "horizontal"
    return split_beside(ctx, direction, { initial_input = "zi && claude\r" })
  end,
}
-- a, then the same v / s as a plain split
rex.bind("ctrl+space>a>v", "claude_pick", { direction = "horizontal" })
rex.bind("ctrl+space>a>s", "claude_pick", { direction = "vertical" })

-- bind h/j/k/l: select-pane
rex.bind("ctrl+space>h", "pane.focus.left")
rex.bind("ctrl+space>j", "pane.focus.down")
rex.bind("ctrl+space>k", "pane.focus.up")
rex.bind("ctrl+space>l", "pane.focus.right")

-- bind -r H/J/K/L: resize-pane 5. The first press resizes and enters a resize
-- mode where H/J/K/L keep resizing without the prefix, like tmux's -r.
rex.mode("resize", { exclusive = true })
for key, direction in pairs{ H = "left", J = "down", K = "up", L = "right" } do
  rex.action{
    name = "resize_" .. direction,
    title = "Resize Pane " .. direction,
    category = "Pane",
    run = function()
      rex.client.queue("pane.resize", { direction = direction, amount = 5 })
      rex.client.queue("client.mode.enter", { name = "resize" })
    end,
  }
  rex.bind("ctrl+space>shift+" .. key:lower(), "resize_" .. direction)
  rex.bind("resize/shift+" .. key:lower(), "pane.resize", { direction = direction, amount = 5 })
end
rex.bind("resize/escape", "client.mode.exit")
rex.bind("resize/enter", "client.mode.exit")

-- base-index 1: prefix + number goes to that tab
for i = 1, 9 do
  rex.bind("ctrl+space>" .. i, "client.tab.goto", { index = i })
end

-- bind S: send-keys 'source ~/.zshrc' Enter
rex.action{
  name = "source_zshrc",
  title = "Reload ~/.zshrc in This Pane",
  category = "Shell",
  run = function()
    return rex.block.call(terminal, "write", { data = "source ~/.zshrc\r" })
  end,
}
rex.bind("ctrl+space>shift+s", "source_zshrc")

-- bind r: source-file ~/.tmux/tmux.conf
rex.bind("ctrl+space>r", "client.config.reload")

-- bind C-Space: send-prefix
rex.bind("ctrl+space>ctrl+space", "pane.send_key", { key = "ctrl+space" })

-- Not in tmux.conf, but Rex has no default.
rex.bind("ctrl+space>b", "client.sidebar.toggle")
rex.bind("ctrl+space>z", "pane.zoom")

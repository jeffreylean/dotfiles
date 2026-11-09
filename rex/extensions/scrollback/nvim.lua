-- Runs inside the scrollback float's nvim. The message buffer is the outgoing
-- message: quote(lines) appends to it, and leaving nvim sends it to the pane
-- the scrollback came from. :cq discards it.

local quit = "<cmd>qa!<cr>"

local function blockquote(lines)
  local indent = math.huge
  for _, line in ipairs(lines) do
    if line:find("%S") then indent = math.min(indent, #line:match("^%s*")) end
  end
  return vim.tbl_map(function(line)
    if not line:find("%S") then return ">" end
    return "> " .. line:sub(indent + 1)
  end, lines)
end

return function(opts)
  local scrollback = vim.api.nvim_get_current_buf()
  local scrollback_win = vim.api.nvim_get_current_win()
  local message

  vim.fn.delete(vim.fn.expand("%:p"))
  vim.bo[scrollback].modifiable = false
  -- Keep the last line at the bottom, as the terminal showed it.
  -- smoothscroll lets a long wrapped line start above the top row,
  -- and the pane starts at 80x24 until the app resizes it.
  vim.wo[scrollback_win].smoothscroll = true
  vim.api.nvim_create_autocmd("VimResized", {
    callback = function()
      if not vim.api.nvim_win_is_valid(scrollback_win) then return end
      vim.api.nvim_win_call(scrollback_win, function() vim.cmd("normal! zb") end)
    end,
  })
  vim.keymap.set("n", "q", quit, { buffer = scrollback })
  vim.keymap.set("n", "<Esc>", quit, { buffer = scrollback })

  local function message_loaded()
    return message ~= nil and vim.api.nvim_buf_is_loaded(message)
  end

  local function quote(lines)
    if not message_loaded() then
      message = vim.api.nvim_create_buf(false, true)
      vim.bo[message].filetype = "markdown"
      vim.keymap.set("n", "q", quit, { buffer = message })
    end
    local win = vim.fn.bufwinid(message)
    if win == -1 then
      win = vim.api.nvim_open_win(message, false, { split = "below", win = -1, height = 10 })
      local on_exit = opts.submit and "sent on exit" or "pasted on exit (not submitted)"
      vim.wo[win].winbar = "message to agent · " .. on_exit .. " · :cq discards"
    end
    local existing = vim.api.nvim_buf_get_lines(message, 0, -1, false)
    local start = table.concat(existing) == "" and 0 or -1
    -- The blank line stops a markdown renderer from folding the typed
    -- question into the quote, and the second one is where it gets typed.
    local quoted = vim.list_extend(blockquote(lines), { "", "" })
    vim.api.nvim_buf_set_lines(message, start, -1, false, quoted)
    vim.api.nvim_win_set_cursor(win, { vim.api.nvim_buf_line_count(message), 0 })
  end

  vim.keymap.set("x", ">", function()
    local first, last = vim.fn.line("v"), vim.fn.line(".")
    local lines = vim.api.nvim_buf_get_lines(scrollback, math.min(first, last) - 1, math.max(first, last), false)
    vim.cmd.normal({ vim.keycode("<Esc>"), bang = true })
    quote(lines)
  end, { buffer = scrollback })

  vim.api.nvim_create_autocmd("VimLeavePre", {
    callback = function()
      if vim.v.exiting ~= 0 or not message_loaded() then return end
      local text = table.concat(vim.api.nvim_buf_get_lines(message, 0, -1, false), "\n"):gsub("%s+$", "")
      if text == "" then return end
      local event = vim.json.encode({
        block_id = opts.block_id,
        event = { type = "paste", payload = { text = text } },
      })
      local session = vim.env.REX_SESSION
      vim.system({ "rex", "api", "call", "-s", session, "block.event", event }):wait()
      if opts.submit then
        vim.system({ "rex", "send-key", "-s", session, "-b", opts.block_id, "enter" }):wait()
      end
    end,
  })
end

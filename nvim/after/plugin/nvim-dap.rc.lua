local dap, dapui = require('dap'), require('dapui')

dap.listeners.after.event_initialized["dapui_config"] = function()
    dapui.open()
end
dap.listeners.before.event_terminated["dapui_config"] = function()
    dapui.close()
end
dap.listeners.before.event_exited["dapui_config"] = function()
    dapui.close()
end

local mason_registry = require("mason-registry")
local codelldb = mason_registry.get_package("codelldb") -- note that this will error if you provide a non-existent package name

-- key maps
vim.keymap.set('n', '<F5>', function() require('dap').continue() end)
vim.keymap.set('n', '<F10>', function() require('dap').step_over() end)
vim.keymap.set('n', '<F11>', function() require('dap').step_into() end)
vim.keymap.set('n', '<F12>', function() require('dap').step_out() end)
vim.keymap.set('n', '<Leader>B', function() require('dap').toggle_breakpoint() end)
vim.keymap.set('n', '<Leader>dr', function() require('dap').clear_breakpoints() end)

vim.keymap.set({ 'n', 'v' }, '<Leader>dh', function()
    require('dap.ui.widgets').hover()
end)
vim.keymap.set({ 'n', 'v' }, '<Leader>dp', function()
    require('dap.ui.widgets').preview()
end)
vim.keymap.set('n', '<Leader>df', function()
    local widgets = require('dap.ui.widgets')
    widgets.centered_float(widgets.frames)
end)
vim.keymap.set('n', '<Leader>ds', function()
    local widgets = require('dap.ui.widgets')
    widgets.centered_float(widgets.scopes)
end)

dap.adapters.codelldb = {
    type = 'server',
    port = "${port}",
    executable = {
        -- CHANGE THIS to your path!
        command = "$HOME/.local/share/nvim/mason/bin/codelldb",
        args = { "--port", "${port}" },
        -- On windows you may have to uncomment this:
        -- detached = false,
    }
}
dap.configurations.rust = {
    {
        -- If you get an "Operation not permitted" error using this, try disabling YAMA:
        --  echo 0 | sudo tee /proc/sys/kernel/yama/ptrace_scope
        name = "Attach to process",
        type = 'codelldb', -- Adjust this to match your adapter name (`dap.adapters.<name>`)
        request = 'attach',
        pid = require('dap.utils').pick_process,
        args = {},
        -- get rust type
        initCommands = function()
            -- Find out where to look for the pretty printer Python module
            local rustc_sysroot = vim.fn.trim(vim.fn.system('rustc --print sysroot'))

            local script_import = 'command script import "' .. rustc_sysroot .. '/lib/rustlib/etc/lldb_lookup.py"'
            local commands_file = rustc_sysroot .. '/lib/rustlib/etc/lldb_commands'

            local commands = {}
            local file = io.open(commands_file, 'r')
            if file then
                for line in file:lines() do
                    table.insert(commands, line)
                end
                file:close()
            end
            table.insert(commands, 1, script_import)

            return commands
        end,
    },
}

--dap.configurations.rust = {
--    {
--        name = "Launch file",
--        type = "codelldb",
--        request = "launch",
--        program = function()
--            return vim.fn.input('Path to executable: ', vim.fn.getcwd() .. '/', 'file')
--        end,
--        cwd = '${workspaceFolder}',
--        stopOnEntry = false,
--        -- get rust type
--        initCommands = function()
--            -- Find out where to look for the pretty printer Python module
--            local rustc_sysroot = vim.fn.trim(vim.fn.system('rustc --print sysroot'))
--
--            local script_import = 'command script import "' .. rustc_sysroot .. '/lib/rustlib/etc/lldb_lookup.py"'
--            local commands_file = rustc_sysroot .. '/lib/rustlib/etc/lldb_commands'
--
--            local commands = {}
--            local file = io.open(commands_file, 'r')
--            if file then
--                for line in file:lines() do
--                    table.insert(commands, line)
--                end
--                file:close()
--            end
--            table.insert(commands, 1, script_import)
--
--            return commands
--        end,
--    },
--}

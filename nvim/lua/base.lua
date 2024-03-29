vim.cmd("autocmd!")

vim.scriptencoding = 'utf-8'
vim.opt.encoding = 'utf-8'
vim.opt.fileencoding = 'utf-8'

vim.wo.number = true
vim.wo.relativenumber = true

vim.bo.swapfile = false

-- leader key
vim.g.mapleader = ' '

vim.opt.title = true
vim.opt.autoindent = true
vim.opt.smartindent = true
vim.opt.hlsearch = true
vim.opt.backupskip = { '/tmp/*', '/private/tmp/*' }
vim.opt.backup = false
vim.opt.showcmd = true
vim.opt.cmdheight = 1
vim.opt.laststatus = 2
vim.opt.expandtab = true
vim.opt.scrolloff = 10
vim.opt.inccommand = 'split'
vim.opt.ignorecase = true -- Case insensitive searching UNLESS /C or capital in search
vim.opt.smarttab = true
vim.opt.breakindent = true
vim.opt.shiftwidth = 4
vim.opt.tabstop = 4
vim.opt.path:append { '**' } -- Finding files - Search down into subfolders
vim.opt.wildignore:append { '*/node_modules/*' }
-- Add asterisks in block comments
vim.opt.formatoptions:append { 'r' }
vim.opt.splitbelow = true
vim.opt.splitright = true
-- Vim will use ripgrep instead of grep
vim.opt.grepprg = 'rg\\ --vimgrep\\ --smart-case\\ --follow'

--nvim tree plugins
vim.g.loaded_netrw = 1
vim.g.loaded_netrwPlugin = 1

vim.o.updatetime = 750
--
-- Set completeopt to have a better completion experience
vim.o.completeopt = 'menuone,noselect'

-- [[ Highlight on yank ]]
-- See `:help vim.highlight.on_yank()`
local highlight_group = vim.api.nvim_create_augroup('YankHighlight', { clear = true })
vim.api.nvim_create_autocmd('TextYankPost', {
    callback = function()
        vim.highlight.on_yank()
    end,
    group = highlight_group,
    pattern = '*',
})

-- set docker extension (Dockerfile.xxx) as dockerfile filetype
vim.cmd [[
au BufReadPost Dockerfile* set filetype=dockerfile
]]

local status, nvim_tree = pcall(require, "nvim-tree")
if not status then return end

nvim_tree.setup()

-- Set key mapping
vim.api.nvim_set_keymap('n', '<C-n>', ':NvimTreeToggle<CR>', { noremap = true, silent = true })

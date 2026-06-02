---- [[ Configure Telescope ]]
-- See `:help telescope` and `:help telescope.setup()`
require('telescope').setup {
    defaults = {
        mappings = {
            i = {
                ['<C-u>'] = false,
                ['<C-d>'] = false,
            },
        },
    },
    pickers = {
        -- sort buffer in last used order
        buffers = {
            ignore_current_buffer = true,
            sort_lastused = true,
        }
    }
}

-- Enable telescope fzf native, if installed
pcall(require('telescope').load_extension, 'fzf')

-- See `:help telescope.builtin`
vim.keymap.set('n', '<leader>?', require('telescope.builtin').oldfiles, { desc = '[?] Find recently opened files' })
vim.keymap.set('n', '<leader>b', require('telescope.builtin').buffers, { desc = '[ ] Find existing buffers' })
vim.keymap.set('n', '<leader>/', function()
    -- You can pass additional configuration to telescope to change theme, layout, etc.
    require('telescope.builtin').current_buffer_fuzzy_find(require('telescope.themes').get_dropdown {
        winblend = 10,
        previewer = false,
    })
end, { desc = '[/] Fuzzily search in current buffer]' })

vim.keymap.set('n', '<leader>sf', function()
    require('fff').find_files()
end, { desc = '[S]earch [F]iles (fff)' })
vim.keymap.set('n', '<leader>ff', require('telescope.builtin').git_files, { desc = '[F]ind Git [F]iles' })
vim.keymap.set('n', '<leader>sh', require('telescope.builtin').help_tags, { desc = '[S]earch [H]elp' })
vim.keymap.set('n', '<leader>sw', function()
    require('fff').live_grep({ query = vim.fn.expand('<cword>') })
end, { desc = '[S]earch current [W]ord (fff)' })
vim.keymap.set('n', '<leader>sg', function()
    require('fff').live_grep()
end, { desc = '[S]earch by [G]rep (fff)' })
vim.keymap.set('n', '<leader>sd', require('telescope.builtin').diagnostics, { desc = '[S]earch [D]iagnostics' })
vim.keymap.set('n', '<leader>ss', require('telescope.builtin').lsp_workspace_symbols,
    { desc = '[S]earch workspace [S]mbol' })
vim.keymap.set('n', '<leader>sds', require('telescope.builtin').lsp_document_symbols,
{ desc = '[S]earch document [S]ymbol' })

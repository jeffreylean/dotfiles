local status, treesitter = pcall(require, 'nvim-treesitter.configs')
if not status then return end

treesitter.setup {
    highlight = {
        enable = true,
        disable = {},
    },
    indent = {
        enable = true,
        disable = {}
    },
    incremental_selection = {
        enable = true,
        keymaps = {
            init_selection = '<c-space>',
            node_incremental = '<c-space>',
            scope_incremental = '<c-s>',
            node_decremental = '<c-backspace>',
        },
    },
    ensure_installed = {
        'tsx',
        'lua',
        'json',
        'css',
        'go',
        'rust',
        'javascript',
        'typescript',
        'gomod',
        'gowork',
        'dockerfile',
    },
    autotag = {
        enable = true,
    }
}

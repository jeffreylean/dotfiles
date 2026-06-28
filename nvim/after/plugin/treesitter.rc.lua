local status, treesitter = pcall(require, 'nvim-treesitter')
if not status then return end

local parsers = {
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
    'hcl',
    'markdown',
    'markdown_inline',
    'html',
    'yaml',
    'toml',
}

-- New nvim-treesitter `main` handles parser/query installation only.
-- Highlighting and indentation are enabled through Neovim's built-in APIs below.
treesitter.setup()

if treesitter.install then
    treesitter.install(parsers)
end

local filetypes = {
    'typescriptreact',
    'javascriptreact',
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
    'hcl',
    'markdown',
    'Avante',
    'html',
    'yaml',
    'toml',
}

vim.api.nvim_create_autocmd('FileType', {
    group = vim.api.nvim_create_augroup('user_treesitter', { clear = true }),
    pattern = filetypes,
    callback = function()
        pcall(vim.treesitter.start)
        vim.bo.indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
    end,
})

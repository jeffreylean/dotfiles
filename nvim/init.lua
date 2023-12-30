require('base')
require('highlight')
require('maps')
require('macos')

local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
    vim.fn.system({
        "git",
        "clone",
        "--filter=blob:none",
        "https://github.com/folke/lazy.nvim.git",
        "--branch=stable", -- latest stable release
        lazypath,
    })
end
vim.opt.rtp:prepend(lazypath)
require('plugins')

--vim.api.nvim_create_autocmd("FileType", {
--    pattern = "openapi.yaml",
--    callback = function()
--        vim.lsp.start({
--            name = "cendol",
--            cmd = { "/Users/jeffreylean/Project/personal/cendol/target/debug/cendol" },
--            root_dir = vim.fs.dirname(vim.fs.find({ 'Cargo.toml' }, { upward = true })[1])
--        })
--    end
--})

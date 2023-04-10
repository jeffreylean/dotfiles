local status, packer = pcall(require, 'packer')
if (not status) then
    print("Packer is not installed")
    return
end

vim.cmd [[packadd packer.nvim]]
packer.startup(function(use)
    use 'wbthomason/packer.nvim'
    -- use {
    --     'svrana/neosolarized.nvim',
    --     requires = { 'tjdevries/colorbuddy.nvim' }
    -- }
    use { 'folke/tokyonight.nvim',
        requires = { 'tjdevries/colorbuddy.nvim' }
    }
    -- Status line
    use {
        'nvim-lualine/lualine.nvim',
        requires = { 'kyazdani42/nvim-web-devicons', opt = true }
    }
    use { 'neovim/nvim-lspconfig',
        requires = {
            -- Useful status updates for LSP
            'j-hui/fidget.nvim',
        }
    } -- Configurations for Nvim LSP
    use 'hrsh7th/nvim-cmp' -- autocomplete
    use 'hrsh7th/cmp-buffer'
    use 'hrsh7th/cmp-nvim-lsp'
    use 'onsails/lspkind.nvim'
    use 'L3MON4D3/LuaSnip' -- Snippet engine
    use {
        'nvim-treesitter/nvim-treesitter',
        run = ':TSUpdate'
    }
    -- Adds extra functionality over rust analyzer
    use("simrat39/rust-tools.nvim")
    use 'windwp/nvim-autopairs'
    use 'windwp/nvim-ts-autotag'
    use {
        'jose-elias-alvarez/null-ls.nvim',
        requires = { "nvim-lua/plenary.nvim" },
    }
    use 'MunifTanjim/prettier.nvim'
    use {
        'nvim-tree/nvim-tree.lua',
        requires = {
            'kyazdani42/nvim-web-devicons', -- optional, for file icons
        },
        tag = 'nightly' -- optional, updated every week. (see issue #1193)
    }
    use 'kyazdani42/nvim-web-devicons' --file icons

    -- Git related plugins
    use 'tpope/vim-fugitive'
    use 'tpope/vim-rhubarb'
    use 'lewis6991/gitsigns.nvim'

    -- Fuzzy Finder (files, lsp, etc)
    use { 'nvim-telescope/telescope.nvim', branch = '0.1.x', requires = { 'nvim-lua/plenary.nvim' } }

    -- Fuzzy Finder Algorithm which requires local dependencies to be built. Only load if `make` is available
    use { 'nvim-telescope/telescope-fzf-native.nvim', run = 'make', cond = vim.fn.executable 'make' == 1 }
    -- Coding productivity for developers
    use 'wakatime/vim-wakatime'
    -- Markdown preview
    use({
        "iamcco/markdown-preview.nvim",
        run = function() vim.fn["mkdp#util#install"]() end,
    })
    -- Toggle terminal
    use { "akinsho/toggleterm.nvim", tag = '*', config = function()
        require("toggleterm").setup()
    end }
end)

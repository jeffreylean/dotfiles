require("lazy").setup({
    'folke/which-key.nvim',
    {
        'folke/tokyonight.nvim',
        dependencies = { 'tjdevries/colorbuddy.nvim' },
        lazy = false,
        priority = 1000,
        config = function()
            -- load the colorscheme here
            vim.cmd([[colorscheme tokyonight]])
        end,
    },
    -- Status line
    { 'nvim-lualine/lualine.nvim', dependencies = { 'kyazdani42/nvim-web-devicons', opt = true } },
    {
        'neovim/nvim-lspconfig',
        dependencies = {
            -- Useful status updates for LSP
            { 'j-hui/fidget.nvim', opts = {} },
            -- Additional lua configuration, makes nvim stuff amazing!
            'folke/neodev.nvim',
        }
    },
    {
        'hrsh7th/nvim-cmp', -- autocomplete
        -- load cmp on InsertEnter
        event = 'InsertEnter',
        dependencies = {
            'hrsh7th/cmp-buffer',
            'hrsh7th/cmp-nvim-lsp',
        }
    },
    'onsails/lspkind.nvim',
    {
        "L3MON4D3/LuaSnip",
        -- follow latest release.
        version = "v2.*", -- Replace <CurrentMajor> by the latest released major (first number of latest release)
        -- install jsregexp (optional!).
        build = "make install_jsregexp"
    },
    {
        'nvim-treesitter/nvim-treesitter',
        build = ':TSUpdate',
        cmd = { 'TSUpdateSync', 'TSUpdate', 'TSInstall' },
    },
    -- Adds extra functionality over rust analyzer
    'simrat39/rust-tools.nvim',
    {
        'windwp/nvim-autopairs',
        event = 'InsertEnter',
        opts = {},
    },
    'windwp.nvim-ts-autotag',
    {
        'jose-elias-alvarez/null-ls.nvim',
        dependencies = { 'nvim-lua/plenary.nvim' }
    },
    'MunifTanjim/prettier.nvim',
    {
        'nvim-tree/nvim-tree.lua',
        dependencies = {
            'nvim-tree/nvim-web-devicons',
        }
    },
    'nvim-tree/nvim-web-devicons',
    -- Git related plugins
    'tpope/vim-fugitive',
    'tpope/vim-rhubarb',
    'lewis6991/gitsigns.nvim',
    -- Fuzzy Finder (files,lsp,etc)
    {
        'nvim-telescope/telescope.nvim',
        tag = '0.1.4',
        dependencies = {
            'nvim-lua/plenary.nvim'
        }
    },
    -- Fuzzy Finder Algorithm which requires local dependencies to be built. Only load if `make` is available
    { 'nvim-telescope/telescope-fzf-native.nvim', build = 'make', cond = vim.fn.executable 'make' == 1
    },
    {
        "iamcco/markdown-preview.nvim",
        config = function() vim.fn["mkdp#util#install"]() end,
    },
    -- Debug adapter protocol
    { "rcarriga/nvim-dap-ui",      dependencies = { "mfussenegger/nvim-dap", "nvim-neotest/nvim-nio" } },
    -- LSP manager
    'williamboman/mason.nvim',
    'williamboman/mason-lspconfig.nvim',
    -- Toggle terminal
    {
        "akinsho/toggleterm.nvim",
        version = '*',
        config = true,
    },
    -- harpoon
    {
        "ThePrimeagen/harpoon",
        branch = "harpoon2",
        dependencies = { "nvim-lua/plenary.nvim" }
    },
    -- sourcegraph/cody
    -- Packer.nvim, also make sure to install nvim-lua/plenary.nvim
    { 'sourcegraph/sg.nvim', run = 'nvim -l build/init.lua', dependencies = { 'nvim-lua/plenary.nvim' } }
})

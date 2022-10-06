local status,packer = pcall(require,'packer')
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
    use {
        'folke/tokyonight.nvim',
        requires = { 'tjdevries/colorbuddy.nvim' }
    }
    -- Status line
    use {
      'nvim-lualine/lualine.nvim',
      requires = { 'kyazdani42/nvim-web-devicons', opt = true }
    }
    use 'neovim/nvim-lspconfig' -- Configurations for Nvim LSP
    use 'hrsh7th/nvim-cmp' -- autocomplete
    use 'hrsh7th/cmp-buffer'
    use 'hrsh7th/cmp-nvim-lsp'
    use 'onsails/lspkind.nvim'
    use 'L3MON4D3/LuaSnip' -- Snippet engine
    use {
        'nvim-treesitter/nvim-treesitter',
        run = ':TSUpdate'
    }
    use 'windwp/nvim-autopairs'
    use 'windwp/nvim-ts-autotag'
end)

if has('nvim')
  let g:plug_home = stdpath('data') . '/plugged'
endif

call plug#begin()

"Plug 'cohama/lexima.vim'
"Plug 'fatih/vim-go'
"Plug 'vim-airline/vim-airline'
"Plug 'vim-airline/vim-airline-themes'
"Plug 'sebdah/vim-delve'
"Plug 'vimwiki/vimwiki'
"Plug 'ryanoasis/vim-devicons'
"Plug 'dense-analysis/ale'
"Plug 'junegunn/fzf.vim'
"Plug 'junegunn/fzf', { 'do': { -> fzf#install() } }
"Plug 'preservim/nerdtree'
"Plug 'hashivim/vim-terraform'
" Plug 'iamcco/markdown-preview.nvim', { 'do': 'cd app && yarn install' }
"Plug 'rust-lang/rust.vim' , {'for':'rust'}


" let g:coc_global_extensions = ['coc-tslint-plugin', 'coc-tsserver', 'coc-css', 'coc-html', 'coc-json', 'coc-prettier','coc-go']  " list of CoC extensions needed

"if has('nvim')
"    Plug 'neovim/nvim-lspconfig'
" coc-go having issue with golang, autocomplete not working after write
"    Plug 'neoclide/coc.nvim',{'do': 'yarn install --frozen-lockfile'}
    " Plug 'nvim-treesitter/nvim-treesitter',{'do':':TSUpdate'}
"endif

if has('nvim')
  "Plug 'Shougo/deoplete.nvim', { 'do': ':UpdateRemotePlugins' }
else
  "Plug 'Shougo/deoplete.nvim'
"  Plug 'roxma/nvim-yarp'
"  Plug 'roxma/vim-hug-neovim-rpc'
endif


call plug#end()

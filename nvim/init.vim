" init autocmd
autocmd!
" set script encoding
scriptencoding utf-8
if !1 | finish | endif

set nocompatible
set nu
set rnu
set title
set autoindent
set showcmd
syntax enable
set fileencodings=utf-8
set encoding=utf-8
set background=dark
set nobackup
set hlsearch
set cmdheight=1
set laststatus=2
set scrolloff=10
set expandtab
set backupskip=/tmp/*,/private/tmp/*
" Set the leader button
let mapleader = ','

" incremental substitution (neovim)
if has ('nvim')
    set inccommand=split
endif

set t_BE=

" no swappppppp
set noswapfile


" Go to tab by number
noremap <leader>1 1gt
noremap <leader>2 2gt
noremap <leader>3 3gt
noremap <leader>4 4gt
noremap <leader>5 5gt
noremap <leader>6 6gt
noremap <leader>7 7gt
noremap <leader>8 8gt
noremap <leader>9 9gt
noremap <leader>0 :tablast<cr>

" switch off the status message to speed up the editing
set nosc noru nosm
" Don't redraw while executing macros for good performance
set lazyredraw
"ignore case when searching
set ignorecase
set smarttab
" access file under subdirectories
set path+=**
set wildignore+=*/node_modules/*
" Turn off paste mode when leaving insert
autocmd InsertLeave * set nopaste
" Add arterisks in block comments
set formatoptions+=r
" Vim will use ripgrep instead of grep
set grepprg=rg\ --vimgrep\ --smart-case\ --follow

" Vimrc source
nnoremap <leader>ev :vsplit $MYVIMRC<cr>
nnoremap <leader>sv :source $MYVIMRC<cr>

" set default splits below
set splitbelow
set splitright

" ---------------------------------------------------------------------
" Highlights
" ---------------------------------------------------------------------
set cursorline
"set cursorcolumn

" Set cursor line color on visual mode
highlight Visual cterm=NONE ctermbg=236 ctermfg=NONE guibg=Grey40

highlight LineNr cterm=none ctermfg=240 guifg=#2b506e guibg=#000000

augroup BgHighlight
  autocmd!
  autocmd WinEnter * set cul
  autocmd WinLeave * set nocul
augroup END

if &term =~ "screen"
  autocmd BufEnter * if bufname("") !~ "^?[A-Za-z0-9?]*://" | silent! exe '!echo -n "\ek[`hostname`:`basename $PWD`/`basename %`]\e\\"' | endif
  autocmd VimLeave * silent!  exe '!echo -n "\ek[`hostname`:`basename $PWD`]\e\\"'
endif

" Clear last search highlight
nnoremap <esc> :noh<return><esc>

" ---------------------------------------------------------------------
" File types
" ---------------------------------------------------------------------

"Create new file type extension
"  Javascript
au BufNewFile,BufRead *.jsx setf javascript
" Rustlang
au BufNewFile,BufRead *.rs setf rust
" Typescript
au BufNewFile,BufRead *.tsx setf typescript
" Markdown
au BufNewFile,BufRead *.md setf markdown
au BufNewFile,BufRead *.mdx setf markdown

" FORMATTERS
au FileType javascript setlocal formatprg=prettier
au FileType javascript.jsx setlocal formatprg=prettier
au FileType typescript setlocal formatprg=prettier\ --parser\ typescript
au FileType html setlocal formatprg=js-beautify\ --type\ html
au FileType scss setlocal formatprg=prettier\ --parser\ css
au FileType css setlocal formatprg=prettier\ --parser\ css

"----------------------------------------------------------------------
"Plugin: deoplete
"----------------------------------------------------------------------
"enable deoplete autocomplete
let g:deoplete#enable_at_startup = 1

" use tab for completion
function! s:check_back_space() abort "{{{
  let col = col('.') - 1
  return !col || getline('.')[col - 1]  =~ '\s'
endfunction"}}}
inoremap <silent><expr> <TAB>
      \ pumvisible() ? "\<C-n>" :
      \ <SID>check_back_space() ? "\<TAB>" :
      \ deoplete#manual_complete()

" Disable preview
set completeopt-=preview

"----------------------------------------------------------------------
"Plugin: ale
"----------------------------------------------------------------------
let g:ale_linter_aliases = {'jsx': 'javascript','ts':'typescript','tsx':'typescript'}
let g:ale_fixers = {
\   'javascript': ['prettier', 'eslint'],
  \    'typescript': ['prettier', 'tslint'],
  \    'react': ['eslint'],
  \    'scss': ['prettier'],
  \    'html': ['prettier'],
  \    'reason': ['refmt'],
\   '*': ['remove_trailing_lines', 'trim_whitespace'],
  \    'rust': ['rustfmt'],
\}

let g:ale_linters = {
\ 'go': ['gopls'],
\   'javascript': ['tsserver'],
\   'rust': ['rust-analyzer'],
\   'typescript': ['tsserver','tslint','eslint'],
\ }
let g:ale_linters_explicit = 1
let g:ale_lint_on_save = 1
let g:ale_javascript_prettier_options = '--trailing-comma none'
let g:ale_fix_on_save = 1
let g:ale_lint_on_enter = 0
let g:ale_lint_on_text_changed = 'never'
let g:ale_completion_enabled = 1
let g:ale_history_log_output = 1

" Error and warning signs.
let g:ale_sign_error = '✘'
let g:ale_sign_warning = ''

" Go to definition
au FileType javascript,typescriptreact nmap <F12> :ALEGoToDefinition<cr>

"----------------------------------------------------------------------
"Plugin: airline
"----------------------------------------------------------------------
" Enable integration with airline.
 let g:airline#extensions#hunks#enabled = 0
 let g:airline#extensions#branch#enabled = 1
 let g:airline#extensions#ale#enabled = 1

"----------------------------------------------------------------------
"Plugin: fzf bind
"----------------------------------------------------------------------
nnoremap <leader>, :Files<cr>
inoremap <leader>, <esc>:Files<cr>
vnoremap <leader>, <esc>:Files<cr>

nnoremap <leader>h :History<cr>
nnoremap <leader>ch :History:<cr>
nnoremap <leader>b :Buffers<cr>
nnoremap <leader>w :Wipeouts<cr>
nnoremap <leader>c :Commands<cr>
nnoremap <silent> <Leader>f :Rg<CR>
" To exclude file name for FZF and ripgrep searching
command! -bang -nargs=* Rg call fzf#vim#grep("rg --column --line-number --no-heading --color=always --smart-case ".shellescape(<q-args>), 1, {'options': '--delimiter : --nth 4..'}, <bang>0)

"----------------------------------------------------------------------
"Plugin: NERDTree
"----------------------------------------------------------------------
" automatically open NERDTree when vim start
"autocmd VimEnter * NERDTree
nnoremap <C-n> :NERDTreeToggle<CR>
let NERDTreeShowHidden=1

"----------------------------------------------------------------------
" language: golang
"----------------------------------------------------------------------
au FileType go set noexpandtab
au FileType go set shiftwidth=4
au FileType go set softtabstop=4
au FileType go set tabstop=4

" Highlight
" let g:go_highlight_build_constrainst = 1
" let g:go_highlight_extra_types = 1
" let g:go_highlight_fields = 1
" let g:go_highlight_functions = 1
" let g:go_highlight_methods = 1
" let g:go_highlight_operators = 1
" let g:go_highlight_structs = 1
" let g:go_highlight_types = 1
" let g:go_auto_sameids = 1

" Auto import dependencies
let g:go_fmt_command = "goimports"

" Navigation
au FileType go nmap <leader>gt :GoDeclsDir<cr>

" Type and function definition
let g:go_auto_type_info = 1
" Go to definition
au FileType go nmap <F12> <Plug>(go-def)
" Go to implementation
au FileType go nmap <leader><F12> <Plug>(go-implements)

" disable vim-go :GoDef short cut (gd)
" this is handled by LanguageClient [LC]
let g:go_def_mapping_enabled = 0
"JSON tag stuct
let g:go_addtags_transform = "snakecase"

" Debugging
let g:delve_backend = "native"

" Go binding
let g:go_decls_includes = "func,type"
let g:go_diagnostics_enabled = 1

augroup go
  autocmd!

  autocmd FileType go nmap <silent> <Leader>gop  <Plug>(go-doc-browser)
  autocmd FileType go nmap <silent> <Leader>go  <Plug>(go-doc)
  autocmd FileType go nmap <silent> <Leader>gf  <Plug>(go-referrers)
  autocmd FileType go nmap <silent> <Leader>gd  <Plug>(go-decls)
  autocmd FileType go nmap <silent> <Leader>gl  <Plug>(go-metalinter)
  autocmd FileType go nmap <silent> <Leader>gr  <Plug>(go-run)
  autocmd FileType go nmap <silent> <leader>i  <Plug>(go-info)
  autocmd FileType go nmap <silent> <leader>gi  <Plug>(go-imports)
  autocmd FileType go nmap <silent> <leader>t :GoTest<return>
  autocmd FileType go nmap <silent> <leader>tf  <Plug>(go-test-func)
  autocmd Filetype go command! -bang AV call go#alternate#Switch(<bang>0, 'vsplit')
autocmd Filetype go command! -bang AS call go#alternate#Switch(<bang>0, 'split')
augroup END

"----------------------------------------------------------------------
" language: rustlang
"----------------------------------------------------------------------
let g:rustfmt_autosave = 1

"" Autocomplete (coc.NVIM)
"" -------------------------------------------------------------------------------------------------
"" coc.nvim default settings
"" -------------------------------------------------------------------------------------------------
"
""augroup cocgo
""        autocmd BufWrite *.go :CocRestart
""augroup END
"
"" if hidden is not set, TextEdit might fail.
"set hidden
"" Better display for messages
"set cmdheight=2
"" Smaller updatetime for CursorHold & CursorHoldI
"set updatetime=300
"" don't give |ins-completion-menu| messages.
"set shortmess+=c
"" always show signcolumns
"set signcolumn=yes
"
"" Use tab for trigger completion with characters ahead and navigate.
"" Use command ':verbose imap <tab>' to make sure tab is not mapped by other plugin.
"
"inoremap <silent><expr> <CR> coc#pum#visible() ? coc#pum#confirm() : "\<C-g>u\<CR>\<c-r>=coc#on_enter()\<CR>"
"inoremap <silent><expr> <C-x><C-z> coc#pum#visible() ? coc#pum#stop() : "\<C-x>\<C-z>"
"" remap for complete to use tab and <cr>
"inoremap <silent><expr> <TAB>
"    \ coc#pum#visible() ? coc#pum#next(1):
"    \ <SID>check_back_space() ? "\<Tab>" :
"    \ coc#refresh()
"inoremap <expr><S-TAB> coc#pum#visible() ? coc#pum#prev(1) : "\<C-h>"
"inoremap <silent><expr> <c-space> coc#refresh()
"
"function! s:check_back_space() abort
"  let col = col('.') - 1
"  return !col || getline('.')[col - 1]  =~# '\s'
"endfunction
"
"" Use `[c` and `]c` to navigate diagnostics
"nmap <silent> [c <Plug>(coc-diagnostic-prev)
"nmap <silent> ]c <Plug>(coc-diagnostic-next)
"
"" Remap keys for gotos
"nmap <silent> gd <Plug>(coc-definition)
"nmap <silent> gy <Plug>(coc-type-definition)
"nmap <silent> gi <Plug>(coc-implementation)
"nmap <silent> gr <Plug>(coc-references)
"
"" Use U to show documentation in preview window
"nnoremap <silent> U :call <SID>show_documentation()<CR>
"
"" Show all diagnostics
"nnoremap <silent> <space>a  :<C-u>CocList diagnostics<cr>
"" Manage extensions
"nnoremap <silent> <space>e  :<C-u>CocList extensions<cr>
"" Show commands
"nnoremap <silent> <space>c  :<C-u>CocList commands<cr>
"" Find symbol of current document
"nnoremap <silent> <space>o  :<C-u>CocList outline<cr>
"" Search workspace symbols
"nnoremap <silent> <space>s  :<C-u>CocList -I symbols<cr>
"" Do default action for next item.
"nnoremap <silent> <space>j  :<C-u>CocNext<CR>
"" Do default action for previous item.
"nnoremap <silent> <space>k  :<C-u>CocPrev<CR>
"" Resume latest coc list
"nnoremap <silent> <space>p  :<C-u>CocListResume<CR>


" ---------------------------------------------------------------------
"  Vimwiki
" ---------------------------------------------------------------------

" split vertical wiki index note
nmap <Leader>vv :vs \| :VimwikiIndex<CR>

" split horizontal wiki index note
nmap <Leader>vs :sp \| :VimwikiIndex<CR>


" ---------------------------------------------------------------------
" Imports
" ---------------------------------------------------------------------
runtime ./plug.vim
if has("unix")
  let s:uname = system("uname -s")
  " Do Mac stuff
  if s:uname == "Darwin\n"
    runtime ./macos.vim
  endif
endif
if has('win32')
  runtime ./windows.vim
endif

runtime ./maps.vim

" ---------------------------------------------------------------------
" Syntax theme
" ---------------------------------------------------------------------
" true color
if exists("&termguicolors") && exists("&winblend")
  syntax enable
  set termguicolors
  set winblend=0
  set wildoptions=pum
  set pumblend=5
  set background=dark
  " Use NeoSolarized
  let g:neosolarized_termtrans=1
  runtime ./colors/NeoSolarized.vim
  colorscheme NeoSolarized
endif

" ---------------------------------------------------------------------
"  Icon
" ---------------------------------------------------------------------
let g:webdevicons_enable_ctrlp = 1

" ---------------------------------------------------------------------
" Extras
" ---------------------------------------------------------------------
set exrc

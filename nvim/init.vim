lua require('base')
lua require('highlight')
lua require('maps')
lua require('macos')
lua require('plugins')

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

autocmd InsertLeave * set nopaste

" ---------------------------------------------------------------------
" Highlights
" ---------------------------------------------------------------------
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
"au FileType go set noexpandtab
"au FileType go set shiftwidth=4
"au FileType go set softtabstop=4
"au FileType go set tabstop=4

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
"let g:go_fmt_command = "goimports"

" Navigation
"au FileType go nmap <leader>gt :GoDeclsDir<cr>

" Type and function definition
let g:go_auto_type_info = 1
" Go to definition
"au FileType go nmap <F12> <Plug>(go-def)
" Go to implementation
"au FileType go nmap <leader><F12> <Plug>(go-implements)

" disable vim-go :GoDef short cut (gd)
" this is handled by LanguageClient [LC]
let g:go_def_mapping_enabled = 0
"JSON tag stuct
"let g:go_addtags_transform = "snakecase"

" Debugging
let g:delve_backend = "native"

" Go binding
let g:go_decls_includes = "func,type"
let g:go_diagnostics_enabled = 1

"augroup go
"  autocmd!
"
"  autocmd FileType go nmap <silent> <Leader>gop  <Plug>(go-doc-browser)
"  autocmd FileType go nmap <silent> <Leader>go  <Plug>(go-doc)
"  autocmd FileType go nmap <silent> <Leader>gf  <Plug>(go-referrers)
"  autocmd FileType go nmap <silent> <Leader>gd  <Plug>(go-decls)
"  autocmd FileType go nmap <silent> <Leader>gl  <Plug>(go-metalinter)
"  autocmd FileType go nmap <silent> <Leader>gr  <Plug>(go-run)
"  autocmd FileType go nmap <silent> <leader>i  <Plug>(go-info)
"  autocmd FileType go nmap <silent> <leader>gi  <Plug>(go-imports)
"  autocmd FileType go nmap <silent> <leader>t :GoTest<return>
"  autocmd FileType go nmap <silent> <leader>tf  <Plug>(go-test-func)
"  autocmd Filetype go command! -bang AV call go#alternate#Switch(<bang>0, 'vsplit')
"autocmd Filetype go command! -bang AS call go#alternate#Switch(<bang>0, 'split')
"augroup END

"----------------------------------------------------------------------
" language: rustlang
"----------------------------------------------------------------------
" let g:rustfmt_autosave = 1

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

" ---------------------------------------------------------------------
"  Icon
" ---------------------------------------------------------------------
let g:webdevicons_enable_ctrlp = 1

" ---------------------------------------------------------------------
" Extras
" ---------------------------------------------------------------------
set exrc

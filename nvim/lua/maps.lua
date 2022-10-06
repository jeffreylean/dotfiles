local keymap = vim.keymap

-- Vimrc source
keymap.set('n','<leader>ev',':vsplit $MYVIMRC<cr>')
keymap.set('n','<leader>sv',':source $MYVIMRC<cr>')

-- Clear last search highlight
keymap.set('n','<esc>',':noh<return><esc>')


" start with vim settings, not vi - dependency for various vim extensions
set nocompatible
let mapleader="|"

if has("autocmd")
	autocmd bufwritepost .vimrc source $MYVIMRC
endif

" vundle dependency
filetype off
set rtp+=~/.vim/bundle/vundle/
call vundle#rc()
" Bundles
" vundle bundle is to be managed by vundle - say that three times fast
Bundle 'gmarik/vundle'
" feature plugins
Bundle 'Shougo/neocomplcache'
Bundle 'garbas/vim-snipmate'
Bundle 'honza/snipmate-snippets'
Bundle 'kien/ctrlp.vim'
Bundle 'briandoll/change-inside-surroundings.vim'
"Bundle 'chrisbra/color_highlight'
Bundle 'mattn/zencoding-vim'
"Bundle 'nathanaelkane/vim-indent-guides'
Bundle 'Raimondi/delimitMate'
Bundle 'scrooloose/syntastic'
"Bundle 'vim-scripts/YankRing.vim'
"Bundle 'skwp/YankRing.vim'
"Bundle 'Lokaltog/vim-easymotion'
Bundle 'tomtom/tcomment_vim'
Bundle 'tpope/vim-surround'
"Bundle 'vim-scripts/matchit.zip'
Bundle 'scrooloose/nerdtree'
Bundle 'jistr/vim-nerdtree-tabs'
"" UI plugins
"Bundle 'vim-scripts/ZoomWin'
"" theme plugins
Bundle 'altercation/vim-colors-solarized'
"" syntax plugins
Bundle 'hallison/vim-markdown'
Bundle 'jtratner/vim-flavored-markdown'
"Bundle 'pangloss/vim-javascript'
"Bundle 'vim-scripts/AnsiEsc.vim'
"Bundle 'tpope/vim-haml'
"" git plugins
Bundle 'tpope/vim-fugitive'
Bundle 'tpope/vim-git'
"Bundle 'gregsexton/gitv'
"Bundle 'mattn/gist-vim'
" misc plugins
Bundle 'MarcWeber/vim-addon-mw-utils'
Bundle 'tomtom/tlib_vim'
Bundle 'tpope/vim-fugitive'
Bundle 'vim-scripts/a.vim'
Bundle 'jwhitley/vim-matchit'
" vundle cleanup
filetype plugin indent on

" basic settings

if has('gui_running')
	set background=dark
	colorscheme solarized 
endif
syntax on
set linebreak
set number
set ts=2
set shiftwidth=2
set guifont=Menlo:h18
"NERDTree
runtime bundle/vim-matchit/plugin/matchit.vim

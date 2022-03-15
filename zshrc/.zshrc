export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
export NVM_DIR=~/.nvm
source $(brew --prefix nvm)/nvm.sh
export GO111MODULE=on
export PATH=$PATH:/usr/local/go/bin
export PATH=$PATH:/Users/jeffreylean/go/bin
#export GOPRIVATE=gitlab.revenuemonster.my/*

# The next line updates PATH for the Google Cloud SDK.
if [ -f '/Users/jeffreylean/google-cloud-sdk/path.zsh.inc' ]; then . '/Users/jeffreylean/google-cloud-sdk/path.zsh.inc'; fi

# The next line enables shell command completion for gcloud.
if [ -f '/Users/jeffreylean/google-cloud-sdk/completion.zsh.inc' ]; then . '/Users/jeffreylean/google-cloud-sdk/completion.zsh.inc'; fi

[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

eval "$(direnv hook zsh)"

alias vim='nvim'
export EDITOR='nvim'

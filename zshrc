export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
export NVM_DIR=~/.nvm
source $(brew --prefix nvm)/nvm.sh
export GO111MODULE=on
export PATH=$PATH:/usr/local/go/bin
export PATH=$PATH:/Users/jeffreylean/go/bin
export GOPRIVATE=gitlab.revenuemonster.my/*

# The next line updates PATH for the Google Cloud SDK.
if [ -f '/Users/jeffreylean/google-cloud-sdk/path.zsh.inc' ]; then . '/Users/jeffreylean/google-cloud-sdk/path.zsh.inc'; fi

# The next line enables shell command completion for gcloud.
if [ -f '/Users/jeffreylean/google-cloud-sdk/completion.zsh.inc' ]; then . '/Users/jeffreylean/google-cloud-sdk/completion.zsh.inc'; fi

[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

#Direnv setup
eval "$(direnv hook zsh)"

#nvim setup
alias vim='nvim'
export EDITOR='nvim'

#Oh my zsh theme
ZSH_THEME="mrp"

#go swagger
alias swagger='docker run --rm -it  --user $(id -u):$(id -g) -e GOPATH=$(go env GOPATH):/go -v $HOME:$HOME -w $(pwd) quay.io/goswagger/swagger'

plugins=(git kubectl)

# Path to your oh-my-zsh configuration.
ZSH=$HOME/.oh-my-zsh

# Set name of the theme to load.
# Look in ~/.oh-my-zsh/themes/
# Optionally, if you set this to "random", it'll load a random theme each
# time that oh-my-zsh is loaded.
export ZSH_THEME="random"

# Set to this to use case-sensitive completion
# CASE_SENSITIVE="true"

# Comment this out to disable weekly auto-update checks
# DISABLE_AUTO_UPDATE="true"

# Uncomment following line if you want to disable colors in ls
# DISABLE_LS_COLORS="true"

# Uncomment following line if you want to disable autosetting terminal title.
# DISABLE_AUTO_TITLE="true"

# Uncomment following line if you want disable red dots displayed while waiting for completion
# DISABLE_COMPLETION_WAITING_DOTS="true"

# Which plugins would you like to load? (plugins can be found in ~/.oh-my-zsh/plugins/*)
# Example format: plugins=(rails git textmate ruby lighthouse)
plugins=(git)

source $ZSH/oh-my-zsh.sh

# Customize to your needs...
export PATH=/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/usr/X11/bin:/Applications/android-sdk-macosx/tools:.

alias cl='clear'
alias l='ls -al'
alias cr='open -a /Applications/Google\ Chrome.app --args --incognito'
alias matrix='ssh nmayuranathan@matrix.senecac.on.ca'
alias prj='ssh -t prj666_132a02@zenit.senecac.on.ca "cd public_html/prj666 ; bash ; cl"'
alias aws='ssh -i /Users/Tesh/AWS_Keypair_1.pem ec2-user@ec2-50-16-24-103.compute-1.amazonaws.com'
alias prjvm='ssh student@zenit.senecac.on.ca -p 9090'

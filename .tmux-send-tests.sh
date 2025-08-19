#!/usr/bin/env bash
set -euo pipefail

repo="/home/shan/code/homematch-v2"
mkdir -p "$repo/.bus"

target="${1-:tests}"   # default to tests window, allow override
dest="${2-:code}"     # default to code window, allow override   

# Clear the bus file first to ensure fresh content
> "$repo/.bus/tests.last"

# Capture last ~2000 lines into the bus file
tmux capture-pane -t "$target" -p -S -1000 > "$repo/.bus/tests.last"

# Send a command that runs in bash -lc inside the review window
tmux send-keys -t "$dest" "bash -lc '\cat < \"$repo/.bus/tests.last\"'" C-m

tmux display-message "📋 Sent tests.last from $target to $dest"

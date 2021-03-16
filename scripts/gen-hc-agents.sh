#!/bin/bash
hc sandbox clean
hc sandbox generate ./tests/integration/setup/bundle/elemental-chat.happ -a='elemental-chat-1'
hc sandbox generate ./tests/integration/setup/bundle/elemental-chat.happ -a='elemental-chat-2'
#!/bin/bash
cd tests/integration/setup/bundle # cd into bundle folder
# randomize the UUID
sed "s/uuid: UUID_PLACEHOLDER/uuid: \"$(node -e 'console.log(`test@${new Date()}`)')\"/" happ-template.yaml > happ.yaml
hc app pack . -o elemental-chat.happ

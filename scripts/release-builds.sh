#!/bin/bash
build () {
    sed -i "s/const DNA_UUID = \".*\"/const DNA_UUID = \"$1\"/" src/consts.js
    npm run build-self-hosted
    cd dist
    rm service-worker.js
    zip -r elemental-chat.zip .
    cd ..
    rm elemental-chat-for-dna-alpha19-$1.zip
    mv dist/elemental-chat.zip elemental-chat-for-dna-alpha19-$1.zip
}
build 0002
#build develop
#build 0001

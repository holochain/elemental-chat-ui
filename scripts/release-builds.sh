#!/bin/bash
build () {
    sed -i "s/const DNA_UUID = '.*'/const DNA_UUID = '$2'/" src/consts.js
    sed -i "s/const DNA_VERSION = '.*'/const DNA_VERSION = '$1'/" src/consts.js
    npm run build:self-hosted
    cd dist
    rm service-worker.js
    zip -r elemental-chat.zip .
    cd ..
    rm elemental-chat-for-dna-$1-$2.zip
    mv dist/elemental-chat.zip elemental-chat-for-dna-$1-$2.zip
}
build 0_1_0_alpha2 0002
build 0_1_0_alpha2 0001
build 0_1_0_alpha2 develop

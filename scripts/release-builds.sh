#!/bin/bash
build () {
    export VUE_APP_DNA_VERSION=$1
    export VUE_APP_DNA_UID=$2
    yarn run build:self-hosted
    cd dist
    rm service-worker.js
    zip -r elemental-chat.zip .
    cd ..
    rm elemental-chat-for-dna-$1-$2.zip
    mv dist/elemental-chat.zip elemental-chat-for-dna-$1-$2.zip
}

DNA_VERSION=$1
DNA_UID=$2

if [ -z "$DNA_VERSION" ]; then
    echo 'Error: Must provide the DNA_VERSION'
    exit 1
fi

build $DNA_VERSION 0002
build $DNA_VERSION 0001
build $DNA_VERSION develop
build $DNA_VERSION $2 # should match DEV_UID_OVERRIDE in holo-nixpkgs for dev!

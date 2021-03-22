# elemental-chat-ui

[![Project](https://img.shields.io/badge/project-holochain-blue.svg?style=flat-square)](http://holochain.org/)
[![Forum](https://img.shields.io/badge/chat-forum%2eholochain%2enet-blue.svg?style=flat-square)](https://forum.holochain.org)
[![Chat](https://img.shields.io/badge/chat-chat%2eholochain%2enet-blue.svg?style=flat-square)](https://chat.holochain.org)

[![Twitter Follow](https://img.shields.io/twitter/follow/holochain.svg?style=social&label=Follow)](https://twitter.com/holochain)
License: [![License: CAL 1.0](https://img.shields.io/badge/License-CAL%201.0-blue.svg)](https://github.com/holochain/cryptographic-autonomy-license)

Vue based user interface for [elemental-chat DNA](https://github.com/holochain/elemental-chat)

## For dev testing:

1. Install these as per their READMEs:
   - [`holochain`](https://github.com/holochain/holochain)
   - [`hc`](https://github.com/holochain/holochain/tree/develop/crates/hc)
   - [elemental-chat DNA](https://github.com/holochain/elemental-chat)
2. Now you can fire everything up with:

   1. In one terminal window install and run the dna with with `hc` like this:

   ```shell
   hc generate -a elemental-chat-test ../elemental-chat/elemental-chat.dna.gz
   hc run -l -p 8888
   ```

   2. In another terminal window serve the UI with:

   ```shell
   yarn install
   VUE_APP_INSTALLED_APP_ID=elemental-chat-test yarn run serve-develop
   ```

3. When you're done and you want to clean up all the holochain databases that `hc` created in `/tmp`, run `hc clean`

## How to run automated tests:
For unit tests
- `yarn test:unit`
For integration tests
- In a holochain envoriment `yarn test:integration-hc`
- In a holo envoriment `yarn test:integration-holo`

## Build:

For hosted context:

```shell
yarn run build
```

For self-hosted context:

```shell
yarn run build-self-hosted
```

## Contribute

Holochain is an open source project. We welcome all sorts of participation and are actively working on increasing surface area to accept it. Please see our [contributing guidelines](/CONTRIBUTING.md) for our general practices and protocols on participating in the community, as well as specific expectations around things like code formatting, testing practices, continuous integration, etc.

- Connect with us on our [forum](https://forum.holochain.org)

## License

[![License: CAL 1.0](https://img.shields.io/badge/License-CAL%201.0-blue.svg)](https://github.com/holochain/cryptographic-autonomy-license)

Copyright (C) 2020, Holochain Foundation

This program is free software: you can redistribute it and/or modify it under the terms of the license
provided in the LICENSE file (CAL-1.0). This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
PURPOSE.

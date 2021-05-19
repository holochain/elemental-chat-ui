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
2. Now you can fire everything up with a few commmands:

### General setup:
   1. install the deps: `yarn install`
   2. enter into nix-shell: `nix-shell`
### holochain environment:
   1. In one terminal window, install and configure the happs for 2 agents: `yarn hc:gen-agents`
   2a. Thereafter, in the same window, run the dna for agent 1: `yarn hc:run-agent-1`
      2b. Optionally, in a second window run the dna for agent 2: `yarn hc:run-agent-2`
   3a. After the command from step 2 completes, serve the UI for agent 1: `yarn serve:hc-agent-1`
      3b. Optionally, in the corresponding terminal for agent 2, serve the UI for agent 2: `yarn serve:hc-agent-2`
### holo host (self-hosted) environment:
   1. In one terminal window, install and configure the happs for the host agent: `yarn hc-host:gen-agent`
   2. Thereafter, in the same window, run the dna for the host agent: `yarn hc-host:run`
   3. After the command from step 2 completes, serve the UI for the host agent: `yarn serve:self-hosted`
### holo hosting web environment:
   1. In a second terminal window, spin up your conductor server.  This server can be two options: HCC or DEVELOP.
       - HCC: Use this mode when connecting to chaperone, but circumventing holo-envoy. The UI will still behave as though in holo-network, but will instead use a local connection to conductor. 
            - This mode requires steps 2 & 3 below. 
            - To spin up chaperone in HCC mode, run: `run:chaperone-hcc`
       - DEVELOP: Use this mode when connecting to chaperone and envoy, but circumventing the resolvers to assign a host.  You may instead update the host setting in `chaperone-dev.json` file to the address of the holoport you wish to connect to for envoy (and holochain). 
            - This mode skips steps 2 & 3 below. 
            - To spin up chaperone in DEVLEOP mode, run: `run:chaperone-dev` 
   2. ONLY IN HHC MODE: In a second terminal window, install and configure the happs for the holo-hosted (web user) agent: `yarn hc-holo:gen-agent`
   3. ONLY IN HHC MODE: Thereafter, in the same window, run the dna for the holo-hosted agent: `yarn hc-holo:run`
   4. In a new terminal window, serve the UI for the host agent in the same terminal window: `yarn serve:self-hosted`

3. When you're done and you want to clean up all the holochain databases that `hc` created in `/tmp`, run one of the following depending on your prior context:
  - holochain: `yarn clear:hc && yarn clear:lair`
  - holo host (self-hosted): `yarn clear:hc && yarn clear:lair`
  - holo-hosted web user: `yarn clear:hc-holo`

## How to run automated tests:
For all tests
- `yarn test`

For unit tests
- In a holochain environment `yarn test:unit-hc`
- In a holo environment `yarn test:unit-holo`

For integration tests
- In a holochain environment `yarn test:integration-hc`
- In a holo environment `yarn test:integration-holo`


## Build:

For holochain context:

```shell
yarn run build-holochain
```

For self-hosted context:

```shell
yarn run build-self-hosted
```

For production hosted context:

```shell
yarn run build-holo-hosted
```

For development hosted context:

```shell
yarn run build-holo-dev
```

For test hosted context:

```shell
build-holo-scale-test
```

## Self-hosted release:
1. Edit `scripts/release-builds.sh` for correct DNA id
1. Run: `scripts/release-builds.sh`
1. Create release on github and upload created `.zip` artifacts
1. Edit release URL value in holo-nixpkgs and create branch
1. Test on holoport after hydra builds

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

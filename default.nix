# This file follows the example here https://github.com/holochain/holonix/blob/1cd2d19988d3bf38250e8168fb8b23471616b288/examples/custom-holochain/README.md
# To re-generate holochain_version.nix, run
# ```
# nix run -f https://github.com/holochain/holochain-nixpkgs/archive/develop.tar.gz packages.update-holochain-versions -c update-holochain-versions --git-src=revision:holochain-0.0.126 --lair-version-req=0.1.0 --output-file=holochain_version.nix
# ```
let
  # Try updating holonixCommit to tip of develop if there's an issue
  # Find out what's on the tip of develop with git ls-remote https://github.com/holochain/holonix develop
  holonixCommit = "1cd2d19988d3bf38250e8168fb8b23471616b288";
  holonixPath = builtins.fetchTarball "https://github.com/holochain/holonix/archive/${holonixCommit}.tar.gz";
  holonix = import (holonixPath) {
    holochainVersionId = "custom";
    holochainVersion = import ./holochain_version.nix;
  };
  nixpkgs = holonix.pkgs;
in nixpkgs.mkShell {
  inputsFrom = [ holonix.main ];
  packages = with nixpkgs; [ nodejs-16_x ];

  # Developers in this repo can create a nix-shell.cfg.sh file containing commands they would like to run at the start of nix-shell
  # e.g. setting environment variables
  shellHook = ''
   if [ -e nix-shell.cfg.sh ]; then source nix-shell.cfg.sh; fi
  '';
}

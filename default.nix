let
  holonixPath = builtins.fetchTarball "https://github.com/holochain/holonix/archive/1ea4c88f05557a5cea0e507c36eeb6f03bd29b54.tar.gz";
  holonix = import (holonixPath) {
    holochainVersionId = "custom";
    holochainVersion = import ./holochain_version.nix;
  };
  nixpkgs = holonix.pkgs;
in nixpkgs.mkShell {
  inputsFrom = [ holonix.main ];
  packages = [
  ];
}

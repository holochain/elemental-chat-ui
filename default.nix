let
  holonixPath = builtins.fetchTarball "https://github.com/holochain/holonix/archive/8cfa69e6c3069e9efbda32cff39d5e9571dcec9a.tar.gz";
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

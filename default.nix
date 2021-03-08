{ pkgs ? import ./nixpkgs.nix {} }:

with pkgs;

{
  elemental-chat-ui = mkYarnPackage rec {
    name = "elemental-chat-ui";
    src = gitignoreSource ./.;

    nativeBuildInputs = [
      nodejs
      makeWrapper
      ps
    ];

    packageJSON = "${src}/package.json";
    yarnLock = "${src}/yarn.lock";

    buildPhase = ''
      yarn build
    '';

    installPhase = ''
        mkdir $out
        mv node_modules $out
        cd deps/@holochain/elemental-chat-ui/
        mv build websocket-wrappers server.js $out
        makeWrapper ${nodejs}/bin/node $out/bin/${name} \
          --add-flags $out/server.js
    '';

    fixupPhase = ''
      patchShebangs $out
    '';

    distPhase = '':'';

    doCheck = true;
  };
}
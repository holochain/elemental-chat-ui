# This file was generated with the following command:
# update-holochain-versions --git-src=revision:holochain-0.0.127 --lair-version-req=~0.0 --output-file=holochain_version.nix --rust-version 1.58.1
# For usage instructions please visit https://github.com/holochain/holochain-nixpkgs/#readme

{
    url = "https://github.com/holochain/holochain";
    rev = "57e5003e44aed57d60a20f66dad101521ae1df95";
    sha256 = "1izax2syk9nkswql60llh42f7hs9khjfjn3q5j6g8g888ryi6p7h";
    cargoLock = {
        outputHashes = {
        };
    };

    binsFilter = [
        "holochain"
        "hc"
        "kitsune-p2p-tx2-proxy"
    ];

    rustVersion = "1.58.1";

    lair = {
        url = "https://github.com/holochain/lair";
        rev = "v0.0.9";
        sha256 = "sha256-glSixh2GtWtJ1wswAA0Q2hnLIFPQY+Tsh36IcUgIbRs=";

        binsFilter = [
            "lair-keystore"
        ];

        rustVersion = "1.58.1";

        cargoLock = {
            outputHashes = {
            };
        };
    };
}
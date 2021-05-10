let
  holonixPath = builtins.fetchTarball {
    url = "https://github.com/holochain/holonix/archive/87ad95a9a0b08deea64ad77ac14a68a7f12cff52.tar.gz";
    sha256 = "0fvbbaps9aggqkjr00b3b331avh0fjb2b8gn07yglshsgix7wrhh";
  };
  holonix = import (holonixPath) {
    includeHolochainBinaries = true;
    holochainVersionId = "custom";

    holochainVersion = {
     rev = "1050f6b064a44a6d6b845940bf4b83cb92f0472f";
     sha256 = "0pr2nfqvc416yq44py3w5r71a25bxjjypn0m2x5mp95qnbf0619k";
     cargoSha256 = "0q9nl0wqvyd5jbxq92f1h4l7i439kl5j1bkzxlz929q4m43r3apn";
     bins = {
       holochain = "holochain";
       hc = "hc";
     };
    };
    holochainOtherDepsNames = ["lair-keystore"];
  };
in holonix.main

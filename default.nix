let 
  holonixPath = builtins.fetchTarball {
    url = "https://github.com/holochain/holonix/archive/cdf1d199d5489ebc943b88e552507f1063e3e571.tar.gz";
    sha256 = "1b5pdlxj91syg1qqf42f49sxlq9qd3qnz7ccgdncjvhdfyricagh";
  };
  holonix = import (holonixPath) {
    includeHolochainBinaries = true;
    holochainVersionId = "custom";
    
    holochainVersion = { 
     rev = "a82372a62d46a503e48f345360d0fb18cc5822d1";  
     sha256 = "1flz7cqm2rpnchsnfai83vw65m57x69ajrhd8v5zgnjcnc1plymx";  
     cargoSha256 = "1fpkb3ga1f4xvgazpd31v45y4gbf6ss1y1rjzqx300vlp99237f9";
     bins = {
       holochain = "holochain";
       hc = "hc";
     };
    };
  };
in holonix.main
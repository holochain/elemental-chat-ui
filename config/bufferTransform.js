"use strict";

const fs = require("fs");
module.exports = {
  process(src, filename) {
    const data = fs.readFileSync(filename, "hex");
    return (
      'module.exports=Buffer.from("' +
      data +
      '","hex");module.exports.default=module.exports;'
    );
  }
};

module.exports = {
  plugins: ["cypress"],
  env: {
    jest: true,
    "cypress/globals": true
  },
  rules: {
    strict: "off"
  }
};

module.exports = {	
  root: true,	
  env: {	
    node: true	
  },	
  extends: ["plugin:vue/essential", "standard", "@vue/prettier"],	
  parserOptions: {	
    parser: "babel-eslint"	
  },	
  overrides: [	
    {	
      files: [	
        "**/__tests__/*.{j,t}s?(x)",	
        "**/tests/unit/**/*.spec.{j,t}s?(x)"	
      ],	
      env: {	
        mocha: true	
      }	
    }	
  ]	
};
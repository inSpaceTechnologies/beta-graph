module.exports = {
  "extends": [
    "airbnb-base"
  ],
  "rules": {
    "no-param-reassign": [2, { "props": false }],
    'max-len': ['off'],
    'no-underscore-dangle': ['off'],
  },
  "env": {
    "browser": true,
    "node": true
  },
};

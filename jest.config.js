module.exports = {
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc-node/jest"],
  },
  testMatch: ["**/*.test.ts"],
  transformIgnorePatterns: [],
};

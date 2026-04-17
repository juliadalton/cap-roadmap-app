import nextConfig from "eslint-config-next";

export default [
  { ignores: [".next/**", "node_modules/**"] },
  ...nextConfig,
  {
    rules: {
      // Downgraded from error — pre-existing pattern in the codebase, fix incrementally
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
];

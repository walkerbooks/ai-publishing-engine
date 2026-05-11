import { createRequire } from "module";

const require = createRequire(import.meta.url);

const next = require("eslint-config-next/core-web-vitals");

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...next,
  {
    rules: {
      "import/no-anonymous-default-export": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/refs": "off",
    },
  },
];

export default eslintConfig;

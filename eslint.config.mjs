import globals from "globals";
import pluginJs from "@eslint/js";

export default [
    {
        files: ["**/*.js"],
        languageOptions: {
            sourceType: "script",
            globals: {
                ...globals.browser,
                ...globals.node, // Add Node.js globals like `require`, `module`, `__dirname`
                ...globals.mocha, // Add Mocha globals like `describe`, `it`
            },
        },
    },
    pluginJs.configs.recommended,
];

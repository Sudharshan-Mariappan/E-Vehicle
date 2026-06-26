module.exports = [
    {
        ignores: ["node_modules/**"],
    },
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: {
                require: "readonly",
                process: "readonly",
                __dirname: "readonly",
                module: "readonly",
                console: "readonly",
                setInterval: "readonly",
                setTimeout: "readonly",
                Buffer: "readonly"
            },
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error",
        },
    },
];

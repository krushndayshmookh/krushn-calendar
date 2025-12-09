/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        './pages/**/*.{js,jsx,vue}',
        './components/**/*.{js,jsx,vue}',
        './app/**/*.{js,jsx,vue}',
        './src/**/*.{js,jsx,vue}',
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {},
    },
    plugins: [
        require("tailwindcss-animate")
    ],
}

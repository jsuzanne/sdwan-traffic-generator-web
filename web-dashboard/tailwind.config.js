/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                border: "var(--border)",
                card: "var(--card)",
                "card-hover": "var(--card-hover)",
                accent: "var(--accent)",
            }
        },
    },
    plugins: [],
}

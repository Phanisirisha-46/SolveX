/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Dichromatic Palette (Slate & Blue)
                primary: {
                    DEFAULT: '#ffffff', // Light mode bg
                    dark: '#0f172a',    // Dark mode bg (Slate 900)
                },
                secondary: {
                    DEFAULT: '#f8fafc', // Light mode bg-alt (Slate 50)
                    dark: '#1e293b',    // Dark mode bg-alt (Slate 800)
                },
                accent: {
                    DEFAULT: '#3b82f6', // Blue 500
                    hover: '#2563eb',   // Blue 600
                    glow: 'rgba(59, 130, 246, 0.5)'
                },
                surface: {
                    DEFAULT: '#ffffff',
                    dark: '#1e293b'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                width: ['Inter', 'sans-serif'], // For number transitions usually
            },
            animation: {
                'slide-up': 'slideUp 0.3s ease-out forwards',
                'fade-in': 'fadeIn 0.2s ease-out forwards',
                'pulse-slow': 'pulse 3s infinite',
            },
            keyframes: {
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                }
            }
        },
    },
    plugins: [],
}

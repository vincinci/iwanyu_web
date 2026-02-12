
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: {
				DEFAULT: '0.75rem',
				sm: '1rem',
				md: '1.5rem',
				lg: '2rem',
				xl: '3rem',
				'2xl': '4rem'
			},
			screens: {
				'sm': '100%',
				'md': '100%',
				'lg': '100%',
				'xl': '1400px',
				'2xl': '1600px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				iwanyu: {
					primary: 'hsl(42 100% 55%)',
					'primary-glow': 'hsl(42 100% 65%)',
					secondary: 'hsl(0 100% 50%)',
					dark: 'hsl(0 0% 0%)',
					light: 'hsl(0 0% 20%)',
					background: 'hsl(0 0% 100%)',
					foreground: 'hsl(0 0% 0%)',
					muted: 'hsl(0 0% 96%)',
					hover: 'hsl(42 100% 90%)',
					border: 'hsl(0 0% 90%)'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					from: {
						opacity: '0'
					},
					to: {
						opacity: '1'
					}
				},
				'fade-up': {
					from: {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					to: {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-in-right': {
					from: {
						transform: 'translateX(100%)'
					},
					to: {
						transform: 'translateX(0)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-up': 'fade-up 0.4s ease-out',
				'slide-in-right': 'slide-in-right 0.3s ease-out'
			},
			fontFamily: {
				sans: [
					'"Source Sans 3"',
					'system-ui',
					'-apple-system',
					'BlinkMacSystemFont',
					'"Segoe UI"',
					'sans-serif',
				],
				heading: [
					'"Space Grotesk"',
					'system-ui',
					'-apple-system',
					'BlinkMacSystemFont',
					'"Segoe UI"',
					'sans-serif',
				],
			},
			boxShadow: {
				'product': '0 4px 20px rgba(0, 0, 0, 0.05)',
				'hover': '0 6px 24px rgba(0, 0, 0, 0.08)',
				'subtle': '0 2px 10px rgba(0, 0, 0, 0.03)'
			},
			transitionProperty: {
				'height': 'height',
				'spacing': 'margin, padding',
			},
			transitionDuration: {
				'400': '400ms',
			},
			transitionTimingFunction: {
				'bounce-in': 'cubic-bezier(0.5, 0, 0.3, 1.5)',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

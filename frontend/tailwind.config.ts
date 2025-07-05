import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
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
  			success: 'hsl(var(--success))',
  			'success-foreground': 'hsl(var(--success-foreground))',
  			
  			/* Standardized color palette */
  			red: {
  				'50': 'hsl(var(--red-50))',
  				'100': 'hsl(var(--red-100))',
  				'200': 'hsl(var(--red-200))',
  				'300': 'hsl(var(--red-300))',
  				'400': 'hsl(var(--red-400))',
  				'500': 'hsl(var(--red-500))',
  				'600': 'hsl(var(--red-600))',
  				'700': 'hsl(var(--red-700))',
  				'800': 'hsl(var(--red-800))',
  				'900': 'hsl(var(--red-900))'
  			},
  			blue: {
  				'50': 'hsl(var(--blue-50))',
  				'100': 'hsl(var(--blue-100))',
  				'200': 'hsl(var(--blue-200))',
  				'300': 'hsl(var(--blue-300))',
  				'400': 'hsl(var(--blue-400))',
  				'500': 'hsl(var(--blue-500))',
  				'600': 'hsl(var(--blue-600))',
  				'700': 'hsl(var(--blue-700))',
  				'800': 'hsl(var(--blue-800))',
  				'900': 'hsl(var(--blue-900))'
  			},
  			green: {
  				'50': 'hsl(var(--green-50))',
  				'100': 'hsl(var(--green-100))',
  				'200': 'hsl(var(--green-200))',
  				'300': 'hsl(var(--green-300))',
  				'400': 'hsl(var(--green-400))',
  				'500': 'hsl(var(--green-500))',
  				'600': 'hsl(var(--green-600))',
  				'700': 'hsl(var(--green-700))',
  				'800': 'hsl(var(--green-800))',
  				'900': 'hsl(var(--green-900))'
  			},
  			yellow: {
  				'50': 'hsl(var(--yellow-50))',
  				'100': 'hsl(var(--yellow-100))',
  				'200': 'hsl(var(--yellow-200))',
  				'300': 'hsl(var(--yellow-300))',
  				'400': 'hsl(var(--yellow-400))',
  				'500': 'hsl(var(--yellow-500))',
  				'600': 'hsl(var(--yellow-600))',
  				'700': 'hsl(var(--yellow-700))',
  				'800': 'hsl(var(--yellow-800))',
  				'900': 'hsl(var(--yellow-900))'
  			},
  			purple: {
  				'50': 'hsl(var(--purple-50))',
  				'100': 'hsl(var(--purple-100))',
  				'200': 'hsl(var(--purple-200))',
  				'300': 'hsl(var(--purple-300))',
  				'400': 'hsl(var(--purple-400))',
  				'500': 'hsl(var(--purple-500))',
  				'600': 'hsl(var(--purple-600))',
  				'700': 'hsl(var(--purple-700))',
  				'800': 'hsl(var(--purple-800))',
  				'900': 'hsl(var(--purple-900))'
  			},
  			orange: {
  				'50': 'hsl(var(--orange-50))',
  				'100': 'hsl(var(--orange-100))',
  				'200': 'hsl(var(--orange-200))',
  				'300': 'hsl(var(--orange-300))',
  				'400': 'hsl(var(--orange-400))',
  				'500': 'hsl(var(--orange-500))',
  				'600': 'hsl(var(--orange-600))',
  				'700': 'hsl(var(--orange-700))',
  				'800': 'hsl(var(--orange-800))',
  				'900': 'hsl(var(--orange-900))'
  			},
  			gray: {
  				'50': 'hsl(var(--gray-50))',
  				'100': 'hsl(var(--gray-100))',
  				'200': 'hsl(var(--gray-200))',
  				'300': 'hsl(var(--gray-300))',
  				'400': 'hsl(var(--gray-400))',
  				'500': 'hsl(var(--gray-500))',
  				'600': 'hsl(var(--gray-600))',
  				'700': 'hsl(var(--gray-700))',
  				'800': 'hsl(var(--gray-800))',
  				'900': 'hsl(var(--gray-900))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		spacing: {
  			'0': 'var(--spacing-0)',
  			'1': 'var(--spacing-1)',
  			'2': 'var(--spacing-2)',
  			'3': 'var(--spacing-3)',
  			'4': 'var(--spacing-4)',
  			'5': 'var(--spacing-5)',
  			'6': 'var(--spacing-6)',
  			'8': 'var(--spacing-8)',
  			'10': 'var(--spacing-10)',
  			'12': 'var(--spacing-12)',
  			'16': 'var(--spacing-16)',
  			'20': 'var(--spacing-20)',
  			'24': 'var(--spacing-24)',
  			'32': 'var(--spacing-32)',
  			'40': 'var(--spacing-40)',
  			'48': 'var(--spacing-48)',
  			'56': 'var(--spacing-56)',
  			'64': 'var(--spacing-64)',
  			xs: 'var(--padding-xs)',
  			sm: 'var(--padding-sm)',
  			md: 'var(--padding-md)',
  			lg: 'var(--padding-lg)',
  			xl: 'var(--padding-xl)',
  		},
  		sizing: {
  			'0': 'var(--size-0)',
  			'1': 'var(--size-1)',
  			'2': 'var(--size-2)',
  			'3': 'var(--size-3)',
  			'4': 'var(--size-4)',
  			'5': 'var(--size-5)',
  			'6': 'var(--size-6)',
  			'8': 'var(--size-8)',
  			'10': 'var(--size-10)',
  			'12': 'var(--size-12)',
  			'16': 'var(--size-16)',
  			'20': 'var(--size-20)',
  			'24': 'var(--size-24)',
  			'32': 'var(--size-32)',
  			'40': 'var(--size-40)',
  			'48': 'var(--size-48)',
  			'56': 'var(--size-56)',
  			'64': 'var(--size-64)',
  			auto: 'var(--size-auto)',
  			full: 'var(--size-full)',
  			screen: 'var(--size-screen)',
  			'screen-h': 'var(--size-screen-h)',
  			min: 'var(--size-min)',
  			max: 'var(--size-max)',
  			fit: 'var(--size-fit)',
  		},
  		boxShadow: {
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)',
  			inner: 'var(--shadow-inner)',
  			none: 'var(--shadow-none)',
  		},
  		borderWidth: {
  			'0': 'var(--border-width-0)',
  			'1': 'var(--border-width-1)',
  			'2': 'var(--border-width-2)',
  			'4': 'var(--border-width-4)',
  			'8': 'var(--border-width-8)',
  		},
  		borderRadius: {
  			none: 'var(--radius-none)',
  			sm: 'var(--radius-sm)',
  			md: 'var(--radius-md)',
  			lg: 'var(--radius-lg)',
  			xl: 'var(--radius-xl)',
  			'2xl': 'var(--radius-2xl)',
  			'3xl': 'var(--radius-3xl)',
  			full: 'var(--radius-full)',
  		},
  		opacity: {
  			'0': 'var(--opacity-0)',
  			'5': 'var(--opacity-5)',
  			'10': 'var(--opacity-10)',
  			'20': 'var(--opacity-20)',
  			'25': 'var(--opacity-25)',
  			'30': 'var(--opacity-30)',
  			'40': 'var(--opacity-40)',
  			'50': 'var(--opacity-50)',
  			'60': 'var(--opacity-60)',
  			'70': 'var(--opacity-70)',
  			'75': 'var(--opacity-75)',
  			'80': 'var(--opacity-80)',
  			'90': 'var(--opacity-90)',
  			'95': 'var(--opacity-95)',
  			'100': 'var(--opacity-100)',
  		},
  		blur: {
  			none: 'var(--blur-none)',
  			sm: 'var(--blur-sm)',
  			md: 'var(--blur-md)',
  			lg: 'var(--blur-lg)',
  			xl: 'var(--blur-xl)',
  			'2xl': 'var(--blur-2xl)',
  			'3xl': 'var(--blur-3xl)',
  		},
  		backdropBlur: {
  			none: 'var(--backdrop-blur-none)',
  			sm: 'var(--backdrop-blur-sm)',
  			md: 'var(--backdrop-blur-md)',
  			lg: 'var(--backdrop-blur-lg)',
  			xl: 'var(--backdrop-blur-xl)',
  			'2xl': 'var(--backdrop-blur-2xl)',
  			'3xl': 'var(--backdrop-blur-3xl)',
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
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;

import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1f4ab8',
          foreground: '#f8fafc',
          muted: '#d0dcff',
        },
        accent: '#ff6b6b',
        // 科技感霓虹色彩系统
        neon: {
          cyan: '#00f5ff',
          blue: '#0066ff',
          purple: '#8b5cf6',
          pink: '#ec4899',
          green: '#10b981',
          yellow: '#fbbf24',
          orange: '#f97316',
        },
        // 渐变色调
        glow: {
          cyan: 'rgba(0, 245, 255, 0.5)',
          purple: 'rgba(139, 92, 246, 0.5)',
          pink: 'rgba(236, 72, 153, 0.5)',
        }
      },
      backgroundImage: {
        // 炫酷渐变背景
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-aurora': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-sunset': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'gradient-ocean': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'gradient-fire': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'gradient-neon': 'linear-gradient(135deg, #00f5ff 0%, #8b5cf6 50%, #ec4899 100%)',
        'gradient-cyber': 'linear-gradient(135deg, #0066ff 0%, #00f5ff 100%)',
        'gradient-matrix': 'linear-gradient(135deg, #10b981 0%, #00f5ff 100%)',
        // 光晕效果
        'glow-cyan': 'radial-gradient(circle at center, rgba(0, 245, 255, 0.3), transparent 70%)',
        'glow-purple': 'radial-gradient(circle at center, rgba(139, 92, 246, 0.3), transparent 70%)',
        'glow-pink': 'radial-gradient(circle at center, rgba(236, 72, 153, 0.3), transparent 70%)',
      },
      boxShadow: {
        brand: '0 20px 45px -20px rgba(31, 74, 184, 0.45)',
        // 霓虹光效阴影
        'neon-cyan': '0 0 20px rgba(0, 245, 255, 0.5), 0 0 40px rgba(0, 245, 255, 0.3)',
        'neon-purple': '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3)',
        'neon-pink': '0 0 20px rgba(236, 72, 153, 0.5), 0 0 40px rgba(236, 72, 153, 0.3)',
        'neon-blue': '0 0 20px rgba(0, 102, 255, 0.5), 0 0 40px rgba(0, 102, 255, 0.3)',
        'glow-lg': '0 10px 40px -10px rgba(139, 92, 246, 0.4)',
        'glow-xl': '0 20px 60px -15px rgba(139, 92, 246, 0.5)',
        'inner-glow': 'inset 0 0 20px rgba(139, 92, 246, 0.2)',
      },
      borderRadius: {
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
      },
      animation: {
        // 炫酷动画效果
        'gradient-x': 'gradient-x 15s ease infinite',
        'gradient-y': 'gradient-y 15s ease infinite',
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'bounce-slow': 'bounce 3s infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'scan': 'scan 4s linear infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'rotate-slow': 'rotate 20s linear infinite',
      },
      keyframes: {
        'gradient-y': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'center top'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'center center'
          }
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        'rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [tailwindcssAnimate],
};

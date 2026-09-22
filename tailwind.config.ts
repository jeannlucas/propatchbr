// tailwind.config.ts
module.exports = {
  // ... seu config existente
  theme: {
    extend: {
      // ... suas extensões existentes
      keyframes: {
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'in': 'slide-in-from-top 0.3s ease-out, fade-in 0.3s ease-out',
      },
    },
  },
}
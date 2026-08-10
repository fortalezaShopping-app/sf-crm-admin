import localFont from 'next/font/local';

export const daxline = localFont({
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
  src: [
    {
      path: './DaxlinePro-Light.otf',
      style: 'normal',
      weight: '300',
    },
    {
      path: './DaxlinePro-Regular.otf',
      style: 'normal',
      weight: '400',
    },
    {
      path: './DaxlinePro-Medium.otf',
      style: 'normal',
      weight: '500',
    },
    {
      path: './DaxlinePro-Bold.otf',
      style: 'normal',
      weight: '700',
    },
    {
      path: './DaxlinePro-ExtraBold.otf',
      style: 'normal',
      weight: '800',
    },
  ],
  variable: '--font-daxline',
});

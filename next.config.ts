const nextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/Antioch' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://obedlee.github.io/Antioch/' : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
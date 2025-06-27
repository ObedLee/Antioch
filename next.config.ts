const nextConfig = {
  reactStrictMode: true,
  output: "export",
  //아래 코드 추가
  assetPrefix:
    process.env.NODE_ENV === "production"
      ? "https://github.com/ObedLee/Antioch/"
      : "",
};
 
module.exports = nextConfig;


module.exports = nextConfig;
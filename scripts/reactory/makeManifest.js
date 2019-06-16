var manifestJson = {
  "short_name": process.env.REACT_APP_SHORT_NAME || "Reactory",
  "name": process.env.REACT_APP_TITLE || "Reactory Framework",
  "icons": [
    {
      "src": process.env.REACT_APP_CDN + "/themes/" + process.env.REACT_APP_THEME + "/images/favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    },
    {
      "src": process.env.REACT_APP_CDN + "/themes/" + process.env.REACT_APP_THEME + "/images/icon-44.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": process.env.REACT_APP_CDN + "/themes/" + process.env.REACT_APP_THEME + "/images/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": process.env.REACT_APP_CDN + "/themes/" + process.env.REACT_APP_THEME + "/images/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "start_url": "./",
  "display": "standalone",
  "theme_color": process.env.REACT_APP_THEME_PRIMARY || "#000000",
  "background_color": process.env.REACT_APP_THEME_BG || "#ffffff"
};


module.exports = manifestJson
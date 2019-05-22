var manifestJson = {
  "short_name": process.env.REACT_APP_SHORT_NAME || "Reactory",
  "name": process.env.REACT_APP_TITLE || "Reactory Framework",
  "icons": [
    {
      "src": process.env.REACT_APP_CDN + "/themes/" + process.env.REACT_APP_THEME + "/favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    }
  ],
  "start_url": "./index.html",
  "display": "standalone",
  "theme_color": process.env.REACT_APP_THEME_PRIMARY || "#000000",
  "background_color": process.env.REACT_APP_THEME_BG || "#ffffff"
};



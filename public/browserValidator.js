let browser = bowser.getParser(window.navigator.userAgent);
let browserName = browser.getBrowser().name;
let version = browser.getBrowser().version;
let message = "";
switch (browserName) {
  case bowser.BROWSER_MAP.ie:
    message =
      "<h1>" +
      browserName +
      " is not supported for security reasons</h1>" +
      "<h2>We recommend that you use : </h2>" +
      "<h2>Chrome version **** released on this day or greater</h2>" +
      "<h2>Firefox version *** released on this day or greater</h2>" +
      "<h2>Microsoft Edge Version **** or greater should be fine</h2>";
    break;
  case bowser.BROWSER_MAP.chrome:
    if (version <= "91") {
      message =
        "<h1>" +
        browserName +
        " " +
        version +
        " is not supported please update to atleast version 93</h1>";
    }
    break;
  default:
    break;
}
if (message !== "") {
  let _browser_not_supported = document.getElementById("browser-not-supported");
  _browser_not_supported.innerHTML = message;
  _browser_not_supported.style.display = "flex";
  document.getElementById("root").style.display = "none";
}

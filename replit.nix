{pkgs} : {
  deps = [
    pkgs.playwright-driver.browsers
    pkgs.playwright
  ];
  env = {
    PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
    PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = true;
  };
}
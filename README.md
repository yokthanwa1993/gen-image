# SVG to WebP Server

A simple Express.js server that generates a WebP image from a given text string using Puppeteer.

## Usage

1.  Install Node.js dependencies:
    ```bash
    npm install
    ```

2.  Start the server:
    ```bash
    npm start
    ```
    The server will run on `http://localhost:3000`.

3.  Make a request to the API:
    ```
    GET http://localhost:3000/?text=Your%20text%20here
    ```

## System Dependencies for Puppeteer

When running this server on a minimal Linux environment (like a Docker container), you must install the system-level dependencies required by the headless Chrome browser that Puppeteer uses. The original error `libatk-1.0.so.0: cannot open shared object file` is a symptom of these missing dependencies.

On Debian/Ubuntu-based systems, you can install them with the following command:

```bash
sudo apt-get update && sudo apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2t64 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils
```

**Note:** On newer versions of Ubuntu (like 24.04 Noble), `libasound2` has been replaced by `libasound2t64`. The command above uses the correct version for modern systems.

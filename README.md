Clockdocs
=========

Write client documents like Clockwork.
-------------------------------------

### Prerequisites for Development
 - [http://www.google.com/chrome/](Chrome) browser
 - [http://nodejs.org/](node.js) JavaScript runtime
 - [https://www.npmjs.org/](npm) Node Packaged Modules
 - [http://gruntjs.com](Grunt) task runner
 - [http://bower.io](Bower) package manager

### Installation
 1. Install prerequisites.
 2. Checkout the repository.
    `git clone https://github.com/ClockworkNet/clockdocs.git`
 3. Install server-side packages.
    `npm update`
 4. Install client-side packages.
    `bower update`
 5. Build the source code. This will create a minified version of the app in `./clockdocs/dist`
    `grunt build`
 6a. Install the app in Chrome.
    1. Open the [chrome://extensions/](extensions page.)
    2. Make sure "Developer mode" is checked.
    3. Click "Load unpacked extension..." and select the `./clockdocs/dist` directory.
 6b. Install the app through [https://chrome.google.com/webstore/detail/chrome-apps-extensions-de/ohmmkhmmmpcnpikjeljgnaoabkaalbgc?hl=en-US](Chrome Apps & Extensions Developer Tool)
    1. Open the developer tool.
    2. Click "Load unpacked..." and select the `./clockdocs/dist` directory.


### Development
The Gruntfile.js included with this app has a developer mode. When you run `grunt dev` from the command line,
grunt will watch for changes to certain files in the `./clockdocs/app` directory and then reload an uncompressed
version of the app in the `./clockdocs/dist` directory.

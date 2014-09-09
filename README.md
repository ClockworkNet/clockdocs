Clockdocs
=========

Write client documents like Clockwork.
-------------------------------------

### Prerequisites for Development
 - [Chrome](http://www.google.com/chrome/) browser
 - [node.js](http://nodejs.org/) JavaScript runtime
 - [npm](https://www.npmjs.org/) Node Packaged Modules
 - [Grunt](http://gruntjs.com/) task runner
 - [Bower](http://bower.io/) package manager

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
 6. Install the app in Chrome. (See the [Chrome Apps & Extensions Developer Tool](https://chrome.google.com/webstore/detail/chrome-apps-extensions-de/ohmmkhmmmpcnpikjeljgnaoabkaalbgc?hl=en-US) for an alternative method.
    1. Open the [extensions page](chrome://extensions/).
    2. Make sure "Developer mode" is checked.
    3. Click "Load unpacked extension..." and select the `./clockdocs/dist` directory.

### Development
The Gruntfile.js included with this app has a developer mode. When you run `grunt dev` from the command line,
grunt will watch for changes to certain files in the `./clockdocs/app` directory and then reload an uncompressed
version of the app in the `./clockdocs/dist` directory.

# Inviso

A cross-platform tool for designing interactive virtual soundscapes. <br/>
Accessible online at: <a link href="http://inviso.cc">inviso.cc</a>

<img width="1440" alt="inviso" src="https://user-images.githubusercontent.com/10594286/31970006-9fdb31f4-b8e4-11e7-95f8-ebbd7c5280e1.png">

The ACM UIST paper about INVISO, including a video, can be found <a link href="https://dl.acm.org/citation.cfm?doid=3126594.3126644">here</a>.

## Project Structure
* build - Directory for built and compressed files from the npm build script
* src - Directory for all dev files
* src/css - Contains all SCSS files, that are compiled to `src/public/assets/css`
* src/js - All the Three.js app files, with `app.js` as entry point. Compiled to `src/public/assets/js` with webpack
* src/js/app/components - Three.js components that get initialized in `main.js`
* src/js/app/helpers - Classes that provide ideas on how to set up and work with defaults
* src/js/app/managers - Manage complex tasks such as GUI or input
* src/js/app/model - Classes that set up the model object
* src/js/data - Any data to be imported into app
* src/js/utils - Various helpers and vendor classes
* src/public - Used by webpack-dev-server to serve content and is copied over to build folder with build command. Place external vendor files here.

## Getting started
Install dependencies:

```
yarn install
```

Then run dev script:

```
yarn dev
```

Spins up a webpack dev server at localhost:8080 and keeps track of all js and sass changes to files. Only reloads automatically upon save of js files.

## Build
```
yarn build
```

Cleans existing build folder and then copies over the public folder from src. Then sets environment to production and compiles js and css into build.

## Deploy
```
yarn deploy
```

Deploys `build/public` to gh-pages branch.

## Other Yarn Scripts
You can run any of these individually if you'd like with the npm run command:
* prebuild - Cleans build folder and lints `src/js`
* clean - Cleans build folder
* lint - Runs lint on `src/js` folder and uses `.eslintrc` file in root as linting rules
* webpack-server - Create webpack-dev-server with hot-module-replacement
* webpack-watch - Run webpack in dev environment with watch
* dev:sass - Run node-sass on `src/css` folder and output to `src/public` and watch for changes
* dev:js - Run webpack in dev environment without watch
* build:dir - Copy files and folders from `src/public` to `build`
* build:sass - Run node-sass on `src/css` and output compressed css to `build` folder
* build:js - Run webpack in production environment

## Input Controls
* Arrow controls will pan
* Mouse left click will rotate/right click will pan
* Scrollwheel zooms in and out
* Delete objects with 'delete' or 'backspace'
* Move dummyhead with 'w/a/s/d'
* Hide stats with 'h' -- dev mode only

## Team
Project leader, primary developer: Anıl Çamcı [<acamci@umich.edu>]<br/>
Contributors: Kristine Lee [<khlee2@uic.edu>] (DevOps), Cody J. Roberts [<codyroberts@protonmail.com>] (DevOps), Angus Forbes [<angus@ucsc.edu>]

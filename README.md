# Inviso

A cross-platform tool for designing interactive virtual soundscapes. 

## TO-DO
✓ Code refactoring, adding a test framework

• Revising/implementing parametric view windows

• Constaining camera movement to bottom-right corner icons

• Switching between perspective and bird's-eye views should be tween'ed.

• Implementing state pause, play, save and load

• Omnidirectional sound source implementation for base spheres.

• In object edit view, the user-controlled objects in the scene besides the object that's being edited should be set to invisible (or removed from the scene) until exiting the object view mode.

✓ (Given that the above item is implemented) In object edit view the listener node, which is normally mapped to the head model, can (should?) be mapped to the camera. It is handed over to the head model upon leaving object edit view.


## GUI Details

• Back and forward scroll buttons (possibly next to object, cone name) to switch between objects, and also cones (for when an object, or a cone is hard to grab onto interactively)

• Interface for attaching omnidirectional Web Audio nodes to sound objects (textual elements in the object paramter window).

• Dialogue bubbles for Add Button ("Click anywhere on screen to create a sound object; click and drag for drawing sound zones"), and Camera Control ("Rotate the scene to change the height of a sound object or a trajectory point") UI elements.

• A dot that tracks the mouse cursor can be used between Add Button click and Scene click/click-and-drag events to make it clear that the user is in a state where they are adding objects or zones to the scene. Another possibility could be to highlight the floor plane  when user is in this state. Currently there is no indication of having hit the Add Button.

• ...

## Interaction bugs

• Navigation controls getting reversed after edit object state (possibly due to lookAt() flipping the y normal of the headModel –but not the model itself–); a possible fix could be ditching lookAt() and using a simpler rotate.y

• Object close-up view interactions need to be revisited: currently a toggle (select-unselect) behavior is implemented; this was mainly intended for the close-up view, which is currently phased out. Color and selection changes should happen with hover actions rather than click actions. 

• oMouseMove() and onMouseDown() functions is a mix of main and former object close-up view interactions. There should be unified interaction scheme. Currently, states like placingCone and isMousePressed are overlapping to a certain extent and should be simplified.

• Currently, if the zones are not drawn as convex hulls (i.e. if a point is dragged across a zone boundary) the shape utils fail to handle this, and ideally we want the zones to be only convex hulls. Shape Utils is throwing an exception when the the dragging across the boundary is attampted so we could use that to prevent the user from doing this (i.e. the dragged point stops moving when a boundary is hit).

• ...

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
yarn run dev
```

Spins up a webpack dev server at localhost:8080 and keeps track of all js and sass changes to files. Only reloads automatically upon save of js files.

## Build
```
yarn run build
```

Cleans existing build folder while linting js folder and then copies over the public folder from src. Then sets environment to production and compiles js and css into build.

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
* Enable camera with 'c'
* Reset camera with 'r'
* Arrow controls will pan
* Mouse left click will rotate/right click will pan
* Scrollwheel zooms in and out
* Delete objects with 'delete' or 'backspace'
* Move dummyhead with 'w/a/s/d'
* Hide stats with 'h' -- dev mode only
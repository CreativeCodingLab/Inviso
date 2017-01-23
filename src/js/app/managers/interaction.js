import * as THREE from 'three';
import Keyboard from '../../utils/keyboard';
import Config from '../../data/config';

// Manages all input interactions
export default class Interaction {
  constructor(main, renderer, scene, camera, controls) {
    // Properties
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;

    this.timeout = null;

    // Instantiate keyboard helper
    this.keyboard = new Keyboard();

    // Listeners
    // Mouse events
    this.renderer.domElement.addEventListener('mousemove', event => this.onMouseMove(main, event), false);
    this.renderer.domElement.addEventListener('mouseleave', event => this.onMouseUp(main,event, false), false);
    this.renderer.domElement.addEventListener('mouseover', event => this.onMouseOver(event), false);
    this.renderer.domElement.addEventListener('mouseup', event => this.onMouseUp(main, event, true), false);
    this.renderer.domElement.addEventListener('mousedown', event => this.onMouseDown(main, event), false);

    // Keyboard events
    this.keyboard.domElement.addEventListener('keydown', (event) => {
      // Only once
      if (event.repeat) {
        return;
      }

      if (this.keyboard.eventMatches(event, 'w')) {
        main.moveForward = 1 * main.movementSpeed;
      }

      if (this.keyboard.eventMatches(event, 'a')) {
        main.yawRight = 1 * main.rotationSpeed;
      }

      if (this.keyboard.eventMatches(event, 'd')) {
        main.yawLeft = 1 * main.rotationSpeed;
      }

      if (this.keyboard.eventMatches(event, 's')) {
        main.moveBackwards = 1 * main.movementSpeed;
      }

      if (this.keyboard.eventMatches(event, 'backspace') ||
         this.keyboard.eventMatches(event, 'delete')) {

        if (main.activeObject && main.activeObject.type === 'SoundTrajectory') {
          if (main.activeObject.selectedPoint && main.activeObject.splinePoints.length > 3) {
            main.activeObject.removePoint();
          }
        }

        if (main.activeObject && main.activeObject.type === 'SoundZone') {
          if (main.activeObject.selectedPoint && main.activeObject.splinePoints.length > 3) {
            main.activeObject.removePoint();
          } else {
            main.removeSoundZone(main.activeObject);
            main.activeObject = null;
          }
        }

        if (main.activeObject && main.activeObject.type === 'SoundObject') {
          if(main.isEditingObject){
            if (main.interactiveCone) {
              main.removeCone(main.activeObject, main.interactiveCone);
            }
          }else{
            main.removeSoundObject(main.activeObject);

            if (main.activeObject.trajectory)
              main.removeSoundTrajectory(main.activeObject.trajectory);

            main.activeObject = null;
          }
        }
      }

      if(Config.isDev) {
        if (this.keyboard.eventMatches(event, 'h')) {
          const base = document.getElementsByClassName('rs-base')[0];

          if (base.style.display === 'none') base.style.display = 'block';
          else base.style.display = 'none';
        }
      }
    });

    this.keyboard.domElement.addEventListener('keyup', (event) => {
      // Only once
      if (event.repeat) {
        return;
      }

      if (this.keyboard.eventMatches(event, 'w')) {
        main.moveForward = 0;
      }

      if (this.keyboard.eventMatches(event, 'a')) {
        main.yawRight = 0;
      }

      if (this.keyboard.eventMatches(event, 'd')) {
        main.yawLeft = 0;
      }

      if (this.keyboard.eventMatches(event, 's')) {
        main.moveBackwards = 0;
      }

      if (this.keyboard.eventMatches(event, 'r')) {
        main.controls.threeControls.reset();
        main.cameraViewer.reset();

        if (main.isEditingObject) {

          main.exitEditObjectView();
        }
      }
    });
  }

  onMouseOver(event) {
    event.preventDefault();

    Config.isMouseOver = true;
  }

  onMouseLeave(event) {
    event.preventDefault();

    Config.isMouseOver = false;
  }

  onMouseMove(main, event) {
    event.preventDefault();

    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => { Config.isMouseMoving = false; }, 200);

    Config.isMouseMoving = true;

    main.setMousePosition(event);
    if (main.isMouseDown === true && !main.isEditingObject) {
      if (main.isAddingTrajectory === true) {
        if (main.activeObject.type === 'SoundObject') {
          main.mouse.y = main.activeObject.containerObject.position.y;
          main.path.addPoint(main.mouse);
        }
      }

      if (main.isAddingObject === true) {
        main.path.addPoint(main.mouse);
      }

      if (main.activeObject && main.activeObject.type === 'SoundTrajectory') {
        const intersection = main.activeObject.objectUnderMouse(main.ray);

        if (main.isMouseDown === true) {
          // click+drag
          main.activeObject.move(main.mouse, main.nonScaledMouse, main.perspectiveView);
        } else if (intersection && intersection.object.type === 'Line') { // hover cursor over line
          main.activeObject.showCursor();
          main.activeObject.setCursor(intersection.point);
        } else if (intersection && intersection.object.parent.type === 'Object3D') {
          main.activeObject.showCursor();
          main.activeObject.setCursor(intersection.object.parent.position);
        } else {
          main.activeObject.showCursor(false);
        }
      } else if (main.activeObject) {
        main.activeObject.move(main);
      }
    }

    if (main.isEditingObject) {
      let intersect3;

      if (main.isMouseDown) {
        // point cone towards mouse pointer
        intersect3 = main.ray.intersectObject(main.activeObject.raycastSphere)[0];

        if (main.interactiveCone != null && intersect3) {
          const coneRotation = new THREE.Vector3();
          coneRotation.subVectors(intersect3.point, main.activeObject.containerObject.position);
          main.interactiveCone.lookAt(coneRotation);
          main.activeObject.setAudioPosition(main.interactiveCone);

        }
        else {
          // console.log('no cone is a snow cone')
        }
      }
      else {
        intersect3 = main.ray.intersectObjects(main.activeObject.cones)[0];

        // temp set color on hover
        main.activeObject.cones.forEach(cone => {
          if (intersect3 && intersect3.object.uuid === cone.uuid) {
            cone.isHighlighted = true;
            cone.material.color.set(cone.hoverColor());
          }
          else if (cone.isHighlighted) {
            cone.isHighlighted = false;
            cone.material.color.set(cone.baseColor);
          }
        });
      }
    }
  }

  onMouseUp(main, event, hasFocus) {
    // turn gui pointer events back on
    main.gui.enable();

    // mouse leaves the container
    if (!hasFocus) { Config.isMouseOver = false; }
    if (main.isMouseDown === false) { return; }

    // actual mouseup interaction
    main.setMousePosition(event);
    let obj;

    if (main.isAddingTrajectory) {
      obj = main.path.createObject(main);

      main.toggleAddTrajectory();
      main.isAddingTrajectory = false;
    }

    if (main.isAddingObject) {
      obj = main.path.createObject(main);

      main.setActiveObject(obj);
      main.toggleAddObject();
      main.isAddingObject = false;
    }

    if (main.isEditingObject) {
      if (main.interactiveCone) {
        main.interactiveCone.material.color.set(main.interactiveCone.baseColor);
      }
    }

    main.isMouseDown = false;

    for (const i in main.soundObjects) {
      if (main.soundObjects[i].type === 'SoundObject') main.soundObjects[i].calculateMovementSpeed();
    }
  }

  onMouseDown(main, event) {
    // turn gui events off when interacting with scene objects
    main.gui.disable();

    /**
     * !keyPressed is added to avoid interaction with object when the camera
     * is being rotated. It can (should) be changed into a flag more specific
     * to this action.
     */
    if (!main.keyPressed) {
      main.isMouseDown = true;

      /**
       * Create a collection array of all the object in the scene and check if
       * any of these objects isUnderMouse (a function which is passed our raycaster).
       *
       * If there is indeed an intersected object, set it as the activeObject.
       */
      const everyComponent = [].concat(main.soundObjects, main.soundZones, main.soundTrajectories);
      const intersectObjects = everyComponent.filter((obj) => {
        return obj.isUnderMouse(main.ray);
      });

      // check if adding trajectory
      main.isAddingTrajectory = (main.isAddingTrajectory && intersectObjects[0] === main.activeObject);

      if (intersectObjects.length > 0) {
        main.setActiveObject(intersectObjects[0]);
      }
      else if (!main.isEditingObject) {
        main.setActiveObject(null);
      }

      if (main.isAddingTrajectory || main.isAddingObject || main.activeObject) {
        main.controls.disablePan();
      }
      else {
        main.controls.enablePan();
      }

      /**
       * If adding a trajectory, ask the trajectory interface to initate a new
       * trajectory at the mouse position determined in setMousePosition()
       *
       * Same for the zone.
       */
      if (main.isAddingTrajectory) {
        main.mouse.y = main.activeObject.containerObject.position.y;
        main.path.beginAt(main.mouse, main.activeObject);
      }

      if (main.isAddingObject) {
        main.path.beginAt(main.mouse);
      }

      /* If the most recent active object interacted with again, select it: */
      if (main.activeObject && main.activeObject.isUnderMouse(main.ray)) {
        // click inside active object
        if (main.activeObject.type != 'SoundObject'){
          const intersect = main.activeObject.objectUnderMouse(main.ray);
          main.activeObject.select(intersect);
        } else {
          main.activeObject.select(main);
        }
      }

      /**
      * In object edit mode a different interaction scheme is followed.
      */
      if (main.isEditingObject) {
        if (!main.activeObject || !main.activeObject.cones) { 
          console.log('wheres my cone :(', main.activeObject); //error check
        }

        const intersect2 = main.ray.intersectObjects(main.activeObject.cones)[0];
        if (intersect2) {
          main.interactiveCone = intersect2.object;
        }
        else {
          main.interactiveCone = null;
        }
      }
    }
  }
}

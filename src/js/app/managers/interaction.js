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
    this.renderer.domElement.addEventListener('mouseleave', event => this.onMouseLeave(event), false);
    this.renderer.domElement.addEventListener('mouseover', event => this.onMouseOver(event), false);
    this.renderer.domElement.addEventListener('mouseup', event => this.onMouseUp(main, event), false);
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

      if (this.keyboard.eventMatches(event, 'c')) {
        main.controls.threeControls.enabled = true;
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
          main.removeSoundObject(main.activeObject);

          if (main.activeObject.trajectory)
            main.removeSoundTrajectory(main.activeObject.trajectory);

          main.activeObject = null;
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

      if (this.keyboard.eventMatches(event, 'c')) {
        main.controls.threeControls.enabled = false;
      }

      if (this.keyboard.eventMatches(event, 'r')) {
        main.controls.threeControls.reset();

        if (main.isEditingObject) {
          main.isEditingObject = false;
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
      if (main.activeObject) {
        main.activeObject.move(main);
      }

      if (main.isAddingTrajectory === true) {
        if (main.activeObject.type === 'SoundObject') {
          main.mouse.y = main.activeObject.containerObject.position.y;
          main.trajectory.addPoint(main.mouse);
        }
      }

      if (main.isAddingObject === true) {
        main.zone.addPoint(main.mouse);
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
      }
    }

    if (main.isEditingObject) {
      const intersects3 = main.ray.intersectObject(main.activeObject.raycastSphere);
      const intersect3 = intersects3[0];

      if (intersects3.length > 0 && main.placingCone) {
        main.activeObject.cones[main.interactiveCone].lookAt(intersect3.point);
        main.setPosition(main.activeObject.cones[main.interactiveCone]);
      } else if (main.isMouseDown) {
        if(intersects3.length > 0 && main.replacingCone) {

          const coneRotation = new THREE.Vector3();
          coneRotation.subVectors(intersect3.point, main.activeObject.containerObject.position);
          main.activeObject.cones[main.interactiveCone].lookAt(coneRotation);
          main.activeObject.setAudioPosition(main.activeObject.cones[main.interactiveCone]);
        }
      }
    }
  }

  onMouseUp(main, event) {
    main.setMousePosition(event);
    let obj;

    if (main.isAddingTrajectory) {
      obj = main.trajectory.createObject();
      main.activeObject.trajectory = obj;
      obj.parentSoundObject = main.activeObject;

      if (obj && obj.type === 'SoundTrajectory') {
        main.soundTrajectories.push(obj);
      }

      main.toggleAddTrajectory();
      main.isAddingTrajectory = false;
    }

    if (main.isAddingObject) {
      obj = main.zone.createObject(main);

      if (obj && obj.type === 'SoundZone') {
        main.soundZones.push(obj);
      }

      if (obj && obj.type === 'SoundObject') {
        main.soundObjects.push(obj);
      }

      main.setActiveObject(obj);
      main.setupAudio();
      main.toggleAddObject();
      main.isAddingObject = false;
    }

    main.isMouseDown = false;

    for (const i in main.soundObjects) {
      if (main.soundObjects[i].type === 'SoundObject') main.soundObjects[i].calculateMovementSpeed();
    }
  }

  onMouseDown(main, event) {
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

      if (everyComponent.length > 0) main.setActiveObject(intersectObjects[0]);
      else main.setActiveObject(null);

      /**
       * If adding a trajectory, ask the trajectory interface to initate a new
       * trajectory at the mouse position determined in setMousePosition()
       *
       * Same for the zone.
       */
      if (main.isAddingTrajectory) {
        main.mouse.y = main.activeObject.containerObject.position.y;
        main.trajectory.beginAt(main.mouse);
      }

      if (main.isAddingObject) {
        main.zone.beginAt(main.mouse);
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
        const intersects2 = main.ray.intersectObjects(main.activeObject.containerObject.children);

        if (intersects2.length > 0) {
          const intersect2 = intersects2[0];

          switch (intersect2.object.name) {
            case 'cone': {
              main.previousInteractiveCone = main.interactiveCone;

              if (main.interactiveCone == intersect2.object.id - main.activeObject.cones[0].id) {
                main.placingCone = false;
                main.interactiveCone = null;
              } else {
                main.interactiveCone = intersect2.object.id - main.activeObject.cones[0].id;
                main.replacingCone = true;
              }

              break;
            }
            case 'visibleSphere': {
              main.replacingCone = false;

              break;
            }
            // case 'addButton': {
            //   const x = document.getElementById('soundPicker');
            //
            //   if (main.activeObject.type === 'SoundObject') {
            //     main.activeObject.createCone(`assets/${x.files[0].name}`);
            //   }
            //
            //   main.previousInteractiveCone = main.interactiveCone;
            //   main.placingCone = true;
            //   main.createCone(intersect2.point);
            //   main.interactiveCone = main.soundCones.length - 1;
            //
            //   break;
            // }
          }
        } else {
          main.previousInteractiveCone = main.interactiveCone;
          main.placingCone = false;
          main.replacingCone = false;
          main.interactiveCone = null;
        }

        if (main.previousInteractiveCone !== null) {
          main.activeObject.cones[main.previousInteractiveCone].material.color = new THREE.Color(main.unselectedConeColor);
        }

        if (main.interactiveCone !== null) {
          main.activeObject.cones[main.interactiveCone].material.color = new THREE.Color(main.selectedConeColor);
        }
      }
    }
  }
}

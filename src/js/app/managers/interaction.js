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
        document.getElementById('help-head').style.display = 'none';
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

      // if (this.keyboard.eventMatches(event, 'e')) {
      //   this.data = main.export();
      //
      //   const a = document.createElement('a');
      //   const blob = new Blob([this.data], {'type':'text/plain'});
      //   a.href = window.URL.createObjectURL(blob);
      //   a.download = 'export.json';
      //   a.click();
      // }

      // if (this.keyboard.eventMatches(event, 'i')) {
      //   const i = document.getElementById('import');
      //   i.click();
      //   i.addEventListener('change', handleFiles, false);
      //
      //   function handleFiles() {
      //     const reader = new FileReader();
      //     reader.addEventListener('load', (e) => {
      //       main.import(e.target.result);
      //     });
      //     reader.readAsText(this.files[0]);
      //   }
      // }

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
        main.reset(true);
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

      if (main.activeObject) {
        if (main.activeObject.type === 'SoundTrajectory') {
          main.activeObject.move(main.mouse, main.nonScaledMouse, main.perspectiveView);
        }
        else {
          main.activeObject.move(main);
        }
      }
    }//end if(main.isMouseDown...)

    // show cursor on hover
    else if (!main.isEditingObject && main.activeObject) {
      // make sure object to raycast to is the trajectory
      let obj = main.activeObject;
      if (obj.type === 'SoundObject') {
        if (obj.trajectory) {
          obj = obj.trajectory;
        }
        else {
          return;
        }
      }

      switch (obj.type) {
        case 'SoundTrajectory':
        case 'SoundZone':
          const intersection = obj.objectUnderMouse(main.ray);
          if (intersection) {
            obj.showCursor(intersection.object, intersection.point);
          }
          else {
            obj.hideCursor();
          }
          break;
        default:
          break;
      }

    }

    if (main.isEditingObject) {
      let intersect3;

      if (main.isMouseDown) {
        // point cone towards mouse pointer
        intersect3 = main.ray.intersectObject(main.activeObject.raycastSphere)[0];

        if (main.interactiveCone != null && intersect3) {
          main.activeObject.pointCone(main.interactiveCone, intersect3.point);
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
    }//end if(main.isEditingObject)
  }

  onMouseUp(main, event, hasFocus) {
    // turn gui pointer events back on
    main.gui.enable();

    // turn controls back on
    main.controls.enable();

    // mouse leaves the container
    if (!hasFocus) { Config.isMouseOver = false; }
    if (main.isMouseDown === false) { return; }

    // actual mouseup interaction
    main.setMousePosition(event);
    let obj;

    if (main.isAddingTrajectory) {
      obj = main.path.createObject(main);

      main.toggleAddTrajectory(false);
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
      const everyComponent = [].concat(main.soundObjects, main.soundTrajectories, main.soundZones);
      const intersectObjects = everyComponent.filter((obj) => {
        return obj.isUnderMouse(main.ray);
      });

      // if adding trajectory, check that mousedown is valid
      main.isAddingTrajectory = (main.isAddingTrajectory && intersectObjects[0] === main.activeObject);

      // set activeObject to intersected object
      if (!main.isEditingObject) {
        if (intersectObjects.length > 0 && !main.isAddingObject) {
          // if soundzones overlap, keep last selected
          if (!(main.activeObject && main.activeObject.type === 'SoundZone' && intersectObjects[0].type === 'SoundZone' && intersectObjects.indexOf(main.activeObject) > -1)) {
            main.setActiveObject(intersectObjects[0]);
          }
        }
        else {
          main.setActiveObject(null);
        }
      }

      // disable controls when add or moving an object
      if (main.isAddingTrajectory || main.isAddingObject || (main.activeObject && !main.isEditingObject)) {
        main.controls.disable();
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
          main.controls.disable();
        }
        else {
          main.interactiveCone = null;
        }
      }
    }
  }
}

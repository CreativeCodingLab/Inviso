import * as THREE from 'three';
import TWEEN from 'tween.js';
import OBJLoader from 'three-obj-loader';

// Components
import Renderer from './components/renderer';
import Camera from './components/camera';
import Light from './components/light';
import CameraViewer from './components/cameraviewer';
import Controls from './components/controls';
import PathDrawer from './components/pathdrawer';

// Helpers
import Geometry from './helpers/geometry';

// Model
import Model from './model/model';

// Managers
import Interaction from './managers/interaction';
import GUIWindow from './managers/guiwindow';
// import DatGUI from './managers/datGUI';

// data
import Config from './../data/config';

// Local vars for rStats
let rS, bS, glS, tS;

// This class instantiates and ties all of the components together
// starts the loading process and renders the main loop
export default class Main {
  constructor(container) {
    OBJLoader(THREE);
    this.setupAudio();

    this.mouse = new THREE.Vector3();
    this.nonScaledMouse = new THREE.Vector3();
    this.ray = new THREE.Raycaster();
    this.walkingRay = new THREE.Raycaster();

    this.isMouseDown = false;
    this.isAddingTrajectory = false;
    this.isAddingObject = false;
    this.isEditingObject = false;

    this.activeObject = null;

    this.floor;
    this.counter = 1;
    this.movementSpeed = 7;
    this.increment = 0.01;
    this.direction = 1;

    this.soundObjects = [];
    this.soundTrajectories = [];
    this.soundZones = [];

    this.loader;
    this.moveForward = 0;
    this.moveBackwards = 0;
    this.yawLeft = 0;
    this.yawRight = 0;
    this.rotationSpeed = 0.05;
    this.listenerMovementSpeed = 5;

    this.perspectiveView = false;
    this.keyPressed = false;

    this.interactiveCone = null;

    this.cameraDestination = new THREE.Vector3();

    this.ray.linePrecision = 10;

    // Set container property to container element
    this.container = container;

    // Start Three clock
    this.clock = new THREE.Clock();

    // Main scene creation
    this.scene = new THREE.Scene();

    // Add GridHelper
    const grid = new THREE.GridHelper(Config.grid.size, Config.grid.divisions);
    grid.position.y = -300;
    grid.material.opacity = 0.25;
    grid.material.transparent = true;
    this.scene.add(grid);

    /**
     * The X-Z raycasting plane for determining where on the floor
     * the user is clicking.
     */
    const planeGeometry = new THREE.PlaneGeometry(Config.grid.size*2, Config.grid.size*2);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      visible: false,
    });
    this.floor = new THREE.Mesh(planeGeometry, planeMaterial);
    this.floor.rotation.x = Math.PI / 2;
    this.scene.add(this.floor);

    // Get Device Pixel Ratio first for retina
    if (window.devicePixelRatio) {
      Config.dpr = window.devicePixelRatio;
    }

    // Main renderer instantiation
    this.renderer = new Renderer(this.scene, container);

    // Components instantiation
    this.camera = new Camera(this.renderer.threeRenderer);
    this.controls = new Controls(this.camera.threeCamera, document);
    this.light = new Light(this.scene);
    this.loader = new THREE.OBJLoader();

    // Create and place lights in scene
    const lights = ['ambient', 'directional'];
    for (let i = 0; i < lights.length; i += 1) {
      this.light.place(lights[i]);
    }

    const lightBoxGeo = new THREE.BoxGeometry(1000, 1000, 1000);
    const lightBoxMat = new THREE.MeshBasicMaterial( {
      color: 0x0055FF,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    } );
    this.editViewLightBox = new THREE.Mesh(lightBoxGeo, lightBoxMat);
    this.editViewLightBox.visible = false;
    this.scene.add(this.editViewLightBox);

    // Create planar grid
    // this.grid = new Geometry(this.scene);
    // this.grid.make('plane')(5000, 5000, 10, 10);
    // this.grid.place([0, 0, 0], [Math.PI / 2, 0, 0]);

    /**
     * Setting up interface to create object/zone/trajectory instances.
     */
    this.path = new PathDrawer(this.scene);

    this.cameraViewer = new CameraViewer(this);
    new Interaction(this, this.renderer.threeRenderer, this.scene, this.camera.threecamera, this.controls.threeControls);

    // Set up rStats if dev environment
    if(Config.isDev) {
      bS = new BrowserStats();
      glS = new glStats();
      tS = new threeStats(this.renderer.threeRenderer);

      rS = new rStats({
        CSSPath: './assets/css/',
        userTimingAPI: false,
        values: {
          frame: { caption: 'Total frame time (ms)', over: 16, average: true, avgMs: 100 },
          fps: { caption: 'Framerate (FPS)', below: 30 },
          calls: { caption: 'Calls (three.js)', over: 3000 },
          raf: { caption: 'Time since last rAF (ms)', average: true, avgMs: 100 },
          rstats: { caption: 'rStats update (ms)', average: true, avgMs: 100 },
          texture: { caption: 'GenTex', average: true, avgMs: 100 }
        },
        groups: [
          { caption: 'Framerate', values: [ 'fps', 'raf' ] },
          { caption: 'Frame Budget', values: [ 'frame', 'texture', 'setup', 'render' ] }
        ],
        fractions: [
          { base: 'frame', steps: [ 'texture', 'setup', 'render' ] }
        ],
        plugins: [bS, tS, glS]
      });
    }

    // Create user head
    const dummyHead = new Model(this.scene, this.loader);
    dummyHead.load();

    // AxisHelper for the Head Model
    this.axisHelper = new THREE.AxisHelper(60);
    this.axisHelper.rotation.y += Math.PI;
    this.scene.add(this.axisHelper);

    document.getElementById('add-object-button').onclick = this.toggleAddObject.bind(this);

    this.gui = new GUIWindow(this);

    // Start render which does not wait for model fully loaded
    this.container.querySelector('#loading').style.display = 'none';
    this.render();
    Config.isLoaded = true;
  }

  render() {
    // Render rStats if Dev
    if(Config.isDev) {
      rS('frame').start();
      glS.start();

      rS('rAF').tick();
      rS('FPS').frame();

      rS('render').start();
    }

    // Call render function and pass in created scene and camera
    this.renderer.render(this.scene, this.camera.threeCamera);

    // rStats has finished determining render call now
    if(Config.isDev) {
      rS('render').end(); // render finished
      rS('frame').end(); // frame finished

      // Local rStats update
      rS('rStats').start();
      rS().update();
      rS('rStats').end();
    }

    /* Camera tweening object update */
    TWEEN.update();

    /* Updating camera controls. */
    this.controls.threeControls.update();

    /**
     * Hands over the positioning of the listener node from the head model
     * to the camera in object edit view
    **/
    if(this.isEditingObject) this.setListenerPosition(this.camera.threeCamera);

    /**
     * Differentiating between perspective and bird's-eye views. If the camera is tilted
     * enough the perspective view is activated, restring user's placement of object in the
     * X-Z plane
     */
    if (this.controls.threeControls.getPolarAngle() > 0.4) {
      this.perspectiveView = true;
    } else {
      this.perspectiveView = false;
    }

    /* Checking if the user has walked into a sound zone in each frame. */
    this.checkZones();

    /* Updating the head model's position and orientation in each frame. */
    this.updateDummyHead();

    /**
     * Stops an object trajectory motion if the used clicks onto a moving object
     */
    for (const i in this.soundObjects) {
      if (!this.isMouseDown || this.soundObjects[i] !== this.activeObject) {
        if (this.soundObjects[i].type === 'SoundObject') {
          this.soundObjects[i].followTrajectory();
        }
      }
    }

    /* Making the GUI visible if an object is selected */
    this.gui.display(this.activeObject);

    // if (this.activeObject) {
    //   document.getElementById('guis').style.display = 'block';
    // } else {
    //   document.getElementById('guis').style.display = 'none';
    // }

    requestAnimationFrame(this.render.bind(this)); // Bind the main class instead of window object
  }

  setupAudio() {
    const a = {};
    window.AudioContext = window.AudioContext || window.webkitAudioContext;

    a.context = new AudioContext();
    a.context.listener.setOrientation(0, 0, -1, 0, 1, 0);
    a.context.listener.setPosition(0, 1, 0);
    a.destination = a.context.createGain();
    a.destination.connect(a.context.destination);

    this.audio = a;
  }

  setListenerPosition(object) {
    const q = new THREE.Vector3();
    object.updateMatrixWorld();
    q.setFromMatrixPosition(object.matrixWorld);
    this.audio.context.listener.setPosition(q.x, q.y, q.z);

    const m = object.matrix;
    const mx = m.elements[12];
    const my = m.elements[13];
    const mz = m.elements[14];
    m.elements[12] = m.elements[13] = m.elements[14] = 0;

    const vec = new THREE.Vector3(0, 0, -1);
    vec.applyProjection(m);
    vec.normalize();

    const up = new THREE.Vector3(0, -1, 0);
    up.applyProjection(m);
    up.normalize();

    this.audio.context.listener.setOrientation(vec.x, vec.y, vec.z, up.x, up.y, up.z);

    m.elements[12] = mx;
    m.elements[13] = my;
    m.elements[14] = mz;
  }

  /**
   * Checks if the user has walked into a sound zone by raycasting from the
   * head model's position onto each sound zone into scene and checking if there
   * is a hit.
   */
  checkZones() {
    if (this.soundZones.length > 0) {
      const walkingRayVector = new THREE.Vector3(0, -1, 0);
      this.walkingRay.set(this.head.position, walkingRayVector);

      for (const i in this.soundZones) {
        const intersects = this.walkingRay.intersectObject(this.soundZones[i].shape);
        if (intersects.length > 0) {
          /**
           * Flagging a zone "under user" to activate the audio file associated
           * with the sound zone.
           */
          this.soundZones[i].underUser(this.audio);
        } else {
          this.soundZones[i].notUnderUser(this.audio);
        }
      }
    }
  }

  enterEditObjectView() {

    // slightly hacky fix: orbit controls tween works poorly from top view
    if (this.controls.threeControls.getPolarAngle() < 0.01) {
      this.controls.threeControls.constraint.rotateUp(-0.05);
      this.controls.threeControls.update();

      this.cameraViewer.controls.constraint.rotateUp(-0.05);
      this.cameraViewer.controls.update();
    }

    this.originalCameraPosition = this.camera.threeCamera.position.clone();
    this.originalCameraCenter = this.controls.threeControls.center.clone();
    this.cameraDestination.lerpVectors(this.activeObject.containerObject.position, this.head.position,
    500 / this.head.position.distanceTo(this.activeObject.containerObject.position));

    new TWEEN.Tween(this.camera.threeCamera.position)
      .to(this.cameraDestination, 800)
      .start();

    new TWEEN.Tween(this.controls.threeControls.center)
      .to(this.activeObject.containerObject.position, 800)
      .onUpdate(() => {
        // rotate cam viewer along with world camera
        var c = this.controls.threeControls;
        var cv = this.cameraViewer.controls;
        cv.constraint.rotateUp(cv.getPolarAngle() - c.getPolarAngle());
        cv.constraint.rotateLeft(cv.getAzimuthalAngle() - c.getAzimuthalAngle());
      })
      .start();

    /**
      * Edit Object View only applies to sound objects. A Sound Object in the scene
      * is represented with 4 elements: Raycast Sphere Mesh, AxisHelper,
      * AltitudeHelper Line, and the containerObject which holds the omniSphere
      * and the cones. To make only the activeObject and nothing else in the scene,
      * first we set every object after scene defaults (i.e. grid, collider plane,
      * lights, edit view light box and camera helper) invisible. Then we find the
      * index of the raycast sphere that belongs to the active object and make
      * this and the following 3 object visible to bring the activeObject back
      * in the scene.
    **/

    if (this.head) {
      this.head.visible = false;
      this.axisHelper.visible = false;
    }
    this.gui.disableGlobalParameters();
    [].concat(this.soundObjects, this.soundZones).forEach((object) => {
      if (object.type === "SoundObject") {
        object.pause();
      }
      if (object !== this.activeObject) {
        if (object.type === "SoundObject") {
          object.axisHelper.visible = false;
          object.altitudeHelper.visible = false;
          object.cones.forEach(cone => cone.material.opacity = 0.1);
          object.omniSphere.material.opacity = 0.2;
        }
        else if (object.type === "SoundZone") {
          object.shape.material.opacity = 0.05;
          // object.shape.visible = false;
        }
      }
    });

    /* lightbox effect */
    this.renderer.threeRenderer.setClearColor(0xe0eaf0);

  }

  exitEditObjectView(){
    if (this.gui.editor) { this.gui.editor.click(); }
    this.isEditingObject = false;
    if (this.head) {
      this.head.visible = true;
      this.axisHelper.visible = true;
    }
    this.gui.enableGlobalParameters();
    [].concat(this.soundObjects, this.soundZones).forEach((object) => {
      if (object.type === "SoundObject") {
        object.axisHelper.visible = true;
        object.altitudeHelper.visible = true;
        object.cones.forEach(cone => cone.material.opacity = 0.8);
        object.omniSphere.material.opacity = 0.8;
        object.unpause();
      }
      else if (object.type === "SoundZone") {
        object.shape.material.opacity = 0.2;
        // object.shape.visible = true;
      }
    });

    new TWEEN.Tween(this.camera.threeCamera.position)
      .to(this.originalCameraPosition, 800)
      .start();

    new TWEEN.Tween(this.controls.threeControls.center)
      .to(this.originalCameraCenter, 800)
      .onUpdate(() => {
        // rotate cam viewer along with world camera
        var c = this.controls.threeControls;
        var cv = this.cameraViewer.controls;
        cv.constraint.rotateUp(cv.getPolarAngle() - c.getPolarAngle());
        cv.constraint.rotateLeft(cv.getAzimuthalAngle() - c.getAzimuthalAngle());
      })
      .start();

    /* turn off lightbox effect */
    this.renderer.threeRenderer.setClearColor(0xf0f0f0);
  }

  set audio(audio) {
    this._audio = audio;
  }

  get audio() {
    return this._audio;
  }

  /**
   * Sets the trajectory adding state on. If the scene is in perspective view when
   * this is called, it will be reset to bird's eye.
   */
  toggleAddTrajectory(state) {
    if (this.perspectiveView) {
      this.exitEditObjectView();
      this.controls.threeControls.reset();
      this.cameraViewer.reset();
    }
    this.isAddingTrajectory = (state === undefined) ? !this.isAddingTrajectory : state;
  }

  /**
   * Sets the object adding state on. If the scene is in perspective view when
   * this is called, it will be reset to bird's eye.
   */
  toggleAddObject() {
    if (this.perspectiveView) {
      this.controls.threeControls.reset();
      this.cameraViewer.reset();
    }
    if (this.isEditingObject) this.exitEditObjectView();
    this.isAddingObject = !this.isAddingObject;

    var btn = document.getElementById('add-object-button');
    btn.classList.toggle('active', this.isAddingObject);
    btn.innerHTML = this.isAddingObject ? '×' : '+';
  }

  /**
   * Sets the the last clicked (active) object.
   * Calls a "secActive()" function ob the selected object.
   */
  setActiveObject(obj) {
    if (this.activeObject) {
      this.activeObject.setInactive();
    }

    this.activeObject = obj;

    if (obj) {
      if (obj.cones && obj.cones.length > 0) {
        this.interactiveCone = obj.cones[0];
      }
      obj.setActive(this);
    }
  }

  /* Updates the head model's position and orientation in each frame. */
  updateDummyHead() {
    this.head = this.scene.getObjectByName('dummyHead', true);

    if (this.head && !this.isEditingObject) {
      this.axisHelper.rotation.y += -this.yawLeft + this.yawRight;
      this.head.rotation.y += -this.yawLeft + this.yawRight;
      this.axisHelper.translateZ(-this.moveBackwards + this.moveForward);
      this.head.translateZ(-this.moveBackwards + this.moveForward);
      this.setListenerPosition(this.head);
    }
  }

  setMousePosition(event) {
    const pointer = new THREE.Vector3();
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);

    this.nonScaledMouse = pointer;

    this.ray.setFromCamera(pointer, this.camera.threeCamera);

    const intersects = this.ray.intersectObject(this.floor);
    if (intersects.length > 0) {
      this.mouse = intersects[0].point;
    }
  }

  removeSoundZone(soundZone) {
    const i = this.soundZones.indexOf(soundZone);
    this.soundZones[i].notUnderUser(this.audio);
    soundZone.removeFromScene(this.scene);
    this.soundZones.splice(i, 1);
  }

  removeSoundObject(soundObject) {
    soundObject.removeFromScene(this.scene);
    const i = this.soundObjects.indexOf(soundObject);
    this.soundObjects.splice(i, 1);
  }

  removeCone(object, cone) {
    object.removeCone(cone);
    this.gui.removeCone(cone);
  }

  removeSoundTrajectory(soundTrajectory) {
    soundTrajectory.removeFromScene(this.scene);
    const i = this.soundTrajectories.indexOf(soundTrajectory);
    this.soundTrajectories.splice(i, 1);
  }
}

import * as THREE from 'three';
import TWEEN from 'tween.js';
import Config from '../../data/config';

export default class GUIWindow {
  constructor(main) {
    this.id = null,        // uuid of displayed "shape" or "containerObject"
    this.obj = null,       // the object whose information is being displayed
    this.parameters = {},  // list of parameter key-DOM element pairs

    this.app = main;
    this.container = document.getElementById('guis');
    this.container.style.width = '250px';
    this.display();
  }

  display(obj) {
    if (obj) {
        this.show(obj);
    }
    else {
        this.hide();
        this.id = this.obj = null;
    }
  }

  // clear gui
  clear() {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }

  // show gui
  show(obj) {
    if (!obj) { return; }

    // get details of object
    switch (obj.type) {
        case 'SoundTrajectory':
            obj = obj.parentSoundObject;
            // no break => get details of sound object
        case 'SoundObject':
            if (this.id !== obj.containerObject.uuid) {
                // init a new gui
                this.clear();
                this.id = obj.containerObject.uuid;
                this.obj = obj;
                this.initObjectGUI(obj);
            }
            else {
                // read and update object parameters
                this.updateObjectGUI(obj);
            }
            break;
        case 'SoundZone': 
            if (this.id !== obj.shape.uuid) {
                // init a new gui
                this.clear();
                this.id = obj.shape.uuid;
                this.obj = obj;
                this.initSoundzoneGUI(obj);
            }
            else {
                // read and update object parameters
                this.updateSoundzoneGUI(obj);
            }
            break;
        default:
            console.log('cannot show ui for type',obj.type);
            break;
    }
    this.container.style.opacity = 1;
    this.container.style.pointerEvents = 'all';
  }

  // hide gui
  hide() {
      this.container.style.opacity = 0;
      this.container.style.pointerEvents = 'none';
  }

  // set up initial parameters for a sound object
  initObjectGUI(object) {
      var mesh = object.containerObject;
      var elem = this.addElem('Object ' + (this.app.soundObjects.indexOf(object)+1));

      this.addParameter({
          property: 'Volume',
          value: '75',
          suffix: '%',
          type: 'number'
      },elem);

      this.addParameter({
          property: 'x',
          value: Number(mesh.position.x.toFixed(2)),
          type: 'number',
          cls: 'x'
      },elem);

      this.addParameter({
          property: 'y',
          value: Number(mesh.position.y.toFixed(2)),
          type: 'number',
          cls: 'y'
      },elem);

      this.addParameter({
          property: 'z',
          value: Number(mesh.position.z.toFixed(2)),
          type: 'number',
          cls: 'z'
      },elem);

      var self = this;

      // "edit object" dialog
      this.addParameter({
        value: 'Edit object',
        events: [{
          type: 'click', 
          callback: function() { self.editObject(object); }
        }]
      });

      // insert cone window
      object.cones.forEach(function(cone) {
        self.addCone(cone);
      });

      // "add cone" dialog
      var addConeElem = this.addParameter({
        value: 'Add cone',
        events: [{
          type: 'click', 
          callback: this.addSound.bind(this)
        }]
      });
      addConeElem.id = 'add-cone'

      if (object.trajectory) {
        this.addTrajectory(object);
      }
      else {
        // "add trajectory" dialog
        var addTrajectoryElem = this.addParameter({
          value: 'Add trajectory',
          events: [{
            type: 'click', 
            callback: this.app.toggleAddTrajectory.bind(this.app)
          }]
        });
        addTrajectoryElem.id = 'add-trajectory'
      }
  }

  // update parameters of sound object
  updateObjectGUI(object) {
      // update position parameters
      var pos = object.containerObject.position;
      var x = this.container.querySelector('.x .value');
      var y = this.container.querySelector('.y .value');
      var z = this.container.querySelector('.z .value');
      while (x.firstChild) { x.removeChild(x.firstChild); }
      while (y.firstChild) { y.removeChild(y.firstChild); }
      while (z.firstChild) { z.removeChild(z.firstChild); }
      x.appendChild(document.createTextNode(Number(pos.x.toFixed(2))));
      y.appendChild(document.createTextNode(Number(pos.y.toFixed(2))));
      z.appendChild(document.createTextNode(Number(pos.z.toFixed(2))));

      // check if trajectory exists
      if (object.trajectory) {

        // check if option to add trajectory still exists
        var addTrajectory = document.getElementById('add-trajectory');
        if (addTrajectory) { 
          this.container.removeChild(addTrajectory);
          this.addTrajectory(object);
        }
        else {
          // update trajectory parameters

        }
      }

      // get cone information
      if (object.cones) {
        object.cones.forEach(function(cone) {

          var lat  = cone.rotation._x * 180/Math.PI,
              long = cone.rotation._y * 180/Math.PI;
        })
      }
  }

  // set up initial parameters for a soundzone
  initSoundzoneGUI(zone) {
      var elem = this.addElem('Zone ' + (this.app.soundZones.indexOf(zone)+1));
      this.addParameter({
          property: 'File',
          value: zone.sound ? zone.sound.name.split('/').pop() : 'None',
          type: 'file-input',
          events: [{ type: 'click', callback: this.addSound.bind(this) }]
      },elem);

      this.addParameter({
          property: 'Volume',
          value: '75',
          suffix: '%',
          type: 'number'
      },elem);

      var pos = this.getSoundzonePosition(zone.splinePoints);
      this.addParameter({
          property: 'x',
          value: Number(pos.x.toFixed(2)),
          type: 'number',
          cls: 'x'
      },elem);

      this.addParameter({
          property: 'z',
          value: Number(pos.z.toFixed(2)),
          type: 'number',
          cls: 'z'
      },elem);
  }

  // update parameters of sound object
  updateSoundzoneGUI(zone) {
      // update position parameters
      var pos = this.getSoundzonePosition(zone.splinePoints);
      var x = this.container.querySelector('.x .value');
      var z = this.container.querySelector('.z .value');
      while (x.firstChild) { x.removeChild(x.firstChild); }
      while (z.firstChild) { z.removeChild(z.firstChild); }
      x.appendChild(document.createTextNode(Number(pos.x.toFixed(2))));
      z.appendChild(document.createTextNode(Number(pos.z.toFixed(2))));

  }

  // average positions of all the spline points
  getSoundzonePosition(points) {
      var reduce = function(a,b) { return a + b; };
      var meanX = points.map(function(v) { return v.x; })
                      .reduce(reduce) / points.length;
      var meanZ = points.map(function(v) { return v.z; })
                      .reduce(reduce) / points.length;
      return {x: meanX, z: meanZ};
  }

  // add a new div
  addElem(name, siblingAfter) {
      var div = document.createElement('div');
      var title = document.createElement('h4');
      title.appendChild(document.createTextNode(name));

      div.appendChild(title);
      this.container.insertBefore(div, siblingAfter || null);
      return div;
  }

  // add a line for the parameter in the UI
  // parameter p can contain properties: 
  //      property
  //      value
  //      cls:     class name for quicker dom access
  //      type:    number, file, etc?
  //      suffix:  a string to be appended to the value
  //      events:  array of event names & callback functions
  addParameter(p, container) {
      container = container || this.container;

      var div = document.createElement('div');
      if (p.cls) { div.className = p.cls; }

      var prop = document.createElement('span');
      prop.className = 'property';
      prop.appendChild(document.createTextNode(p.property));

      var val = document.createElement('span');
      val.className = 'valueSpan';

      if (p.type === 'number') {
          val.style.cursor = 'ew-resize';
      }

      if (p.events) {
          p.events.forEach(function(evt) {
              val['on'+evt.type] = evt.callback;
          })
      }

      if (p.suffix) {
          var span = document.createElement('span');
          span.className = 'value';
          span.appendChild(document.createTextNode(p.value));
          val.appendChild(span);
          val.appendChild(document.createTextNode(p.suffix));
      }
      else {
          val.appendChild(document.createTextNode(p.value));
          val.className += ' value';
      }


      // append all values to dom
      if (p.property != undefined) { div.appendChild(prop); }
      if (p.value != undefined) { div.appendChild(val); }

      container.append(div);
      return div;
  }

  // event handler additions
  addSound(e) {
      var obj = this.obj;
      var span = e.target;
      var input = document.getElementById('soundPicker');
      // listen to click
      var self = this;
      input.onchange = function(e) {
        var file = e.target.files[0];

        if (file) {
          var path = 'assets/sounds/'+file.name;

          // load sound onto obect
          switch (obj.type) {
            case 'SoundTrajectory': 
              obj = obj.parentSoundObject;
            case 'SoundObject':
              // replace sound attached to existing cone
              var text = span.innerText || span.textContent;
              if (obj.cones && obj.cones.length > 0 && text) {
                var coneToSplice = obj.cones.findIndex(function(cone) {
                  return cone.filename === text;
                });
                if (coneToSplice > -1) {
                  var cone = obj.cones[coneToSplice];
                  var sound = cone.sound;

                  // copy properties of previous sound
                  cone.sound = obj.loadSound(path, self.app.audio);
                  cone.sound.panner.refDistance = sound.panner.refDistance;
                  cone.sound.panner.distanceModel = sound.panner.distanceModel;
                  cone.sound.panner.coneInnerAngle = sound.panner.coneInnerAngle;
                  cone.sound.panner.coneOuterAngle = sound.panner.coneOuterAngle;
                  cone.sound.panner.coneOuterGain = sound.panner.coneOuterGain;
                  cone.sound.volume.gain.value = sound.volume.gain.value;

                  // replace text with file name
                  cone.filename = file.name;
                  while(span.firstChild) { span.removeChild(span.firstChild); }
                  span.appendChild(document.createTextNode(file.name));
                  return; // quit early
                }
              }

              // create new cone
              var cone = obj.createCone(path, self.app.audio);
              cone.filename = file.name;
              self.addCone(cone);

              // automatically enter edit mode after brief delay
              window.setTimeout(function() {
                self.app.isEditingObject = false;
                self.editObject(obj);
              }, 500)
              break;
            case 'SoundZone':
              // replace text with file name
              while(span.firstChild) { span.removeChild(span.firstChild); }
              span.appendChild(document.createTextNode(file.name));

              // add sound to zone
              obj.loadSound(path, self.app.audio);
              break;
            default:
              break;
          }
        }
      };
      input.click();
  }
  addCone(cone) {
    var elem = this.addElem('Cone '+cone.id, document.getElementById('add-cone'));
    elem.id = 'cone-'+cone.id;

    this.addParameter({
      property: 'File',
      value: cone.filename,
      events: [{
        type: 'click', 
        callback: this.addSound.bind(this)
      }]
    }, elem);
    this.addParameter({
      property: 'Volume',
      value: Number((cone.sound.volume.gain.value).toFixed(3)),
      type: 'number'
    }, elem);
    this.addParameter({
      property: 'Longitude',
      value: Number((cone.rotation._y * 180/Math.PI).toFixed(2)),
      type: 'number',
      suffix: '˚'
    }, elem);
    this.addParameter({
      property: 'Latitude',
      value: Number((cone.rotation._x * 180/Math.PI).toFixed(2)),
      type: 'number',
      suffix: '˚'
    }, elem);
    this.addParameter({
      value: 'Delete'
    }, elem)
    // todo: click on a cone to make it vis? accordion?

  }
  addTrajectory(object) {
    var elem = this.addElem('Trajectory');
    elem.id = 'trajectory';

    this.addParameter({
      property: 'Speed',
      value:object.movementSpeed,
      suffix:' m/s',
      type:'number'
    }, elem)

    return elem;
  }
  editObject(object) {
    if(!this.app.isEditingObject){
      this.app.isEditingObject = true;

      var objectPosition = object.containerObject.position;
      var cameraTo = new THREE.Object3D();
      var head = this.app.head;
      var axis = this.app.axisHelper;
      cameraTo.position.lerpVectors(objectPosition, head.position,
          500 / head.position.distanceTo(objectPosition));
      cameraTo.lookAt(objectPosition);

      var tween = new TWEEN.Tween(this.app.camera.threeCamera.position)
        .to(cameraTo.position, 1000)
        .onComplete(function() {
          head.position.copy(cameraTo.position);
          head.lookAt(objectPosition);

          axis.position.copy(cameraTo.position);
          axis.lookAt(objectPosition);
        });

      var tween2 = new TWEEN.Tween(this.app.controls.threeControls.center)
        .to(objectPosition, 1000);
      

      // slightly hacky fix: orbit controls tween works poorly from top view
      if (this.app.controls.threeControls.getPolarAngle() < 0.01) {
        this.app.controls.threeControls.constraint.rotateUp(-0.05);
        this.app.controls.threeControls.update();

        this.app.cameraViewer.controls.constraint.rotateUp(-0.05);
        this.app.cameraViewer.controls.update();
      }
      tween.start();

      var c = this.app.controls.threeControls;
      var cv = this.app.cameraViewer.controls;
      tween2.onComplete(function() {
        var pa = cv.getPolarAngle(),
            aa = cv.getAzimuthalAngle();
        cv.constraint.rotateUp(pa - c.getPolarAngle());
        cv.constraint.rotateLeft(aa - c.getAzimuthalAngle());
      }).start();
    }
    else {
      this.app.isEditingObject = false;
    }
  }
}

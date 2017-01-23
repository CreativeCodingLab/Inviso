export default class GUIWindow {
  constructor(main) {
    this.id = null;        // uuid of displayed "shape" or "containerObject"
    this.obj = null;       // the object whose information is being displayed
    
    this.editedParameter = null; // parameter value being manipulated in window

    this.app = main;
    this.container = document.getElementById('guis');
    this.isDisabled = false;
    this.display();
  }

  // ------- showing/hiding the overall gui ---------- //

  display(obj) {
    if (obj) {
        this.show(obj);
    }
    else {
        this.hide();
        this.id = this.obj = null;
    }
  }

  // disable/enable pointer events
  disable() {
    this.isDisabled = true;
  }
  enable() {
    this.isDisabled = false;
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
    this.container.style.pointerEvents = this.isDisabled ? 'none' : 'auto';
  }

  // hide gui
  hide() {
      this.container.style.opacity = 0;
      this.container.style.pointerEvents = 'none';
  }


  //----------- initiating objects --------- //

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
          cls: 'z',
          events: [
          {
            type:'mousedown',
            callback: this.startDragging.bind(this)
          },
          {
            type:'mousemove',
            target: document,
            callback: this.drag.bind(this)
          },
          {
            type:'mouseup',
            target: document,
            callback: this.stopDragging.bind(this)
          }]
      },elem);

      // "edit object" dialog
      this.addParameter({
        value: 'Edit object',
        cls: 'edit-toggle',
        events: [{
          type: 'click', 
          callback: this.toggleEditObject.bind(this)
        }]
      });

      // insert cone window
      object.cones.forEach((cone) => {
        this.addCone(cone);
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

  // set up initial parameters for a sound object cone
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
      cls: 'long',
      suffix: '˚'
    }, elem);
    this.addParameter({
      property: 'Latitude',
      value: Number((cone.rotation._x * 180/Math.PI).toFixed(2)),
      type: 'number',
      cls: 'lat',
      suffix: '˚'
    }, elem);
    this.addParameter({
      value: 'Delete'
    }, elem);
    // todo: click on a cone to make it vis? accordion?

  }

  // set up initial parameters for a sound object trajectory path
  addTrajectory(object) {
    var elem = this.addElem('Trajectory');
    elem.id = 'trajectory';

    this.addParameter({
      property: 'Speed',
      value:object.movementSpeed,
      suffix:' m/s',
      type:'number'
    }, elem);

    this.addParameter({
      value: 'Delete'
    }, elem);

    return elem;
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


  //----- updating objects -------//

  // update parameters of sound object
  updateObjectGUI(object) {
      // update position parameters
      var pos = object.containerObject.position;
      var x = this.container.querySelector('.x .value');
      var y = this.container.querySelector('.y .value');
      var z = this.container.querySelector('.z .value');

      this.replaceTextContent(x, pos.x);
      this.replaceTextContent(y, pos.y);
      this.replaceTextContent(z, pos.z);

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
      if (object.cones && object.cones.length > 0) {
        var longitudes = this.container.querySelectorAll('.long .value');
        var latitudes  = this.container.querySelectorAll('.lat .value');
        object.cones.forEach((cone, i) => {

          var lat  = cone.rotation._x * 180/Math.PI,
              long = cone.rotation._y * 180/Math.PI;

          this.replaceTextContent(longitudes[i], long);
          this.replaceTextContent(latitudes[i], -lat);

        });
      }
  }

  // update parameters of sound zone
  updateSoundzoneGUI(zone) {
      // update position parameters
      var pos = this.getSoundzonePosition(zone.splinePoints);
      var x = this.container.querySelector('.x .value');
      var z = this.container.querySelector('.z .value');
      this.replaceTextContent(x, pos.x);
      this.replaceTextContent(z, pos.z);
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

  // ------------ event callbacks ------------ //
  // attach a sound to an object
  addSound(e) {
      var obj = this.obj;
      var span = e.target;
      var input = document.getElementById('soundPicker');
      // listen to click
      var self = this;
      input.onchange = function(e) {
        var file = e.target.files[0];
        input.parentNode.reset();

        if (file) {
          var path = 'assets/sounds/'+file.name;

          // load sound onto obect
          switch (obj.type) {
            case 'SoundTrajectory': 
              obj = obj.parentSoundObject;
            case 'SoundObject':
              // replace sound attached to existing cone
              var text = span.innerText || span.textContent;
              let cone = null;
              if (obj.cones && obj.cones.length > 0 && text) {
                cone = obj.cones.find(c => c.filename === text);
              }

              // create new cone
              obj.loadSound(path, self.app.audio, cone)
                .then((sound) => {
                  if (cone) {
                    // copy properties of previous cone
                    sound.panner.refDistance = cone.sound.panner.refDistance;
                    sound.panner.distanceModel = cone.sound.panner.distanceModel;
                    sound.panner.coneInnerAngle = cone.sound.panner.coneInnerAngle;
                    sound.panner.coneOuterAngle = cone.sound.panner.coneOuterAngle;
                    sound.panner.coneOuterGain = cone.sound.panner.coneOuterGain;
                    sound.volume.gain.value = cone.sound.volume.gain.value;
                    cone.sound = sound;

                    // replace text with file name
                    cone.filename = file.name;
                    self.replaceTextContent(span, file.name);
                  }
                  else {
                    cone = obj.createCone(sound);
                    cone.filename = file.name;
                    self.addCone(cone);

                    // automatically enter edit mode after brief delay
                    window.setTimeout(function() {
                      self.app.isEditingObject = false;
                      self.toggleEditObject();
                    }, 500);
                  }
                })
                .catch((err) => {
                  // no file was loaded: do nothing
                });
              break;
            case 'SoundZone':

              // add sound to zone
              obj.loadSound(path, self.app.audio)
                .then(() => {
                  // replace text with file name
                  self.replaceTextContent(span, file.name);
                })
                .catch((err) => {
                  // no file was loaded: do nothing
                });
              break;
            default:
              break;
          }
        }
      };
      input.click();
  }

  // move into/out of object edit mode
  toggleEditObject() {
    var span = this.container.querySelector('.edit-toggle .value');
    if (!this.app.isEditingObject) {
      this.editor = span;
      this.container.classList.add('editor');
      this.replaceTextContent(span, 'Exit editor');
      this.app.isEditingObject = true;
      this.app.enterEditObjectView();
    }
    else {
      this.editor = null;
      this.container.classList.remove('editor');
      this.replaceTextContent(span, 'Edit object')
      this.app.isEditingObject = false;
      this.app.exitEditObjectView();
    }
  }

  startDragging(e) {
    console.log('hello', e.target)
    this.editedParameter = e.target;
  }
  drag(e) {

  }
  stopDragging(e) {
    if (!this.editedParameter) {
      return;
    }

    this.editedParameter = null;
    console.log('bye')

  }


  //---------- dom building blocks -----------//
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
            if (!evt.target) {
              val['on'+evt.type] = evt.callback;
            }
            else {
              evt.target.addEventListener(evt.type, evt.callback, false)
            }
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

  // updating text in html
  replaceTextContent(parent, text, sigfigs) {
    while(parent.firstChild) { parent.removeChild(parent.firstChild); }
    if (!isNaN(text)) { text = Number((+text).toFixed(sigfigs || 2)); }
    parent.appendChild(document.createTextNode(text));
  }

}

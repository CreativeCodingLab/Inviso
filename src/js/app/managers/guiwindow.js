export default class GUIWindow {
  constructor(main) {
    this.id = null;        // uuid of displayed "shape" or "containerObject"
    this.obj = null;       // the object whose information is being displayed

    this.listeners = [];

    this.app = main;
    this.container = document.getElementById('guis');
    this.isDisabled = false;
    this.display();

    // add listeners for dragging parameters
    document.addEventListener('mousemove', this.drag.bind(this));
    document.addEventListener('mouseup', this.stopDragging.bind(this));
    this.dragEvent = {};
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

  // clear gui and listeners
  clear() {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    this.listeners = [];
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

  // add navigation arrows
  addNav(e, elem) {
    var arrow = document.createElement('div');
    arrow.className = 'nav nav-' + e.direction + ' nav-' + e.type;

    let glyph = e.direction === 'left' ? '‹' : '›';

    arrow.appendChild(document.createTextNode(glyph));
    elem.appendChild(arrow);
    arrow.onclick = this.nav.bind(this, e);
  }

  // set up initial parameters for a sound object
  initObjectGUI(object) {
      var mesh = object.containerObject;
      var elem = this.addElem('Object ' + (this.app.soundObjects.indexOf(object)+1));

      function setObjectPosition(component,dx) {
        let destination = mesh.position.clone();
        destination[component] += dx;

        // clamp y to [-300,300]
        destination.y = Math.min(Math.max(-300,destination.y), 300);

        // move all child objects of the object
        object.containerObject.position.copy(destination);
        object.axisHelper.position.copy(destination);
        object.altitudeHelper.position.copy(destination);
        object.altitudeHelper.position.y = 0;
        object.raycastSphere.position.copy(destination);

        if (object.trajectory) {
          // move trajectory
          object.trajectory.objects.forEach((obj) => {
            obj.position[component] += dx;
          })
          object.trajectory.splinePoints.forEach((pt) => {
            pt[component] += dx;
          });
        }
      }//end setObjectPosition

      function changeVolume(dx) {
        if (object.omniSphere.sound && object.omniSphere.sound.volume) {
          // clamp value to (0.05, 2)
          const volume = Math.max(Math.min(object.omniSphere.sound.volume.gain.value + dx/50, 2), 0.05);
          object.omniSphere.sound.volume.gain.value = volume;
          object.changeRadius();
        }
      }

      this.addParameter({
          property: 'File',
          value: object.omniSphere.sound ? object.omniSphere.sound.name.split('/').pop() : 'None',
          type: 'file-input',
          events: [{ type: 'click', callback: this.addSound.bind(this) }]
      },elem).id = "omnisphere-sound-loader";

      this.addParameter({
          property: 'Volume',
          value: object.omniSphere.sound && object.omniSphere.sound.volume ? object.omniSphere.sound.volume.gain.value : 'N/A',
          type: 'number',
          cls: 'volume',
          bind: changeVolume
      },elem);
/*
      if (object.sound) {
        this.addParameter({
          value: 'Remove sound',
          events:[{
            type: 'click',
            callback: function() {}
          }]
        }, elem);
      }
*/
      /* global object parameters */
      var gElem = document.createElement('div');
      gElem.id = "object-globals";
      elem.appendChild(gElem);
      gElem.style.display = this.app.isEditingObject ? 'none' : 'block';

      this.addParameter({
          property: 'x',
          value: Number(mesh.position.x.toFixed(2)),
          type: 'number',
          cls: 'x',
          bind: setObjectPosition.bind(this, "x")
      },gElem);

      this.addParameter({
          property: 'y',
          value: Number(mesh.position.y.toFixed(2)),
          type: 'number',
          cls: 'y',
          bind: setObjectPosition.bind(this, "y")
      },gElem);

      this.addParameter({
          property: 'z',
          value: Number(mesh.position.z.toFixed(2)),
          type: 'number',
          cls: 'z',
          bind: setObjectPosition.bind(this, "z")
      },gElem);

      let coneCount = this.addParameter({
        property: '# of cones',
        value: object.cones.length
      }, gElem);
      coneCount.id = 'cone-count';

      // insert cone window
      object.cones.forEach((cone) => {
        this.addCone(cone).style.display = 'none';
      });

      // "add cone" dialog
      var addConeElem = this.addParameter({
        value: 'Add cone',
        events: [{
          type: 'click',
          callback: this.addSound.bind(this)
        }]
      });
      addConeElem.id = 'add-cone';

      if (object.trajectory) {
        this.addTrajectory(object);
      }
      else {
        this.addTrajectoryDialog();
      }

    this.addNav({type: "object", direction: "left"}, elem);
    this.addNav({type: "object", direction: "right"}, elem);
  }

  // "add trajectory" dialog
  addTrajectoryDialog() {
    var addTrajectoryElem = this.addParameter({
      value: 'Add trajectory',
      events: [{
        type: 'click',
        callback: this.app.toggleAddTrajectory.bind(this.app, true)
      }]
    });
    addTrajectoryElem.id = 'add-trajectory'
  }

  // set up initial parameters for a sound object cone
  addCone(cone) {
    var elem = this.addElem('', document.getElementById('add-cone'));
    elem.id = 'cone-'+cone.id;
    elem.className = 'cone';

    // set bg color
    let color = cone.hoverColor().getHSL();
    color.h *= 360;
    color.s *= 100;
    color.l = Math.max(color.l*100, 70);
    elem.style.backgroundColor = 'hsl('+color.h+','+color.s+'%,'+color.l+'%)';

    var object = this.obj;

    function changeVolume(dx) {
      if (cone.sound && cone.sound.volume) {

        // clamp value to (0.05, 2)
        const volume = Math.max(Math.min(cone.sound.volume.gain.value + dx/50, 2), 0.05);

        if (volume !== cone.sound.volume.gain.value) {
          // modify cone length
          cone.sound.volume.gain.value = volume;
          object.changeLength(cone);
        }
      }
    }

    function changeSpread(dx) {
      if (cone.sound && cone.sound.spread) {
        // clamp value to (0.05,1)
        const spread = Math.max(Math.min(cone.sound.spread + dx/100, 1), 0.05);

        if (spread !== cone.sound.spread) {
          // modify cone width
          cone.sound.spread = spread;
          object.changeWidth(cone);
        }

      }
    }

    function setConeRotation(component, dx) {
      // clamp lat/long values
      var lat = cone.lat || 0.0001;
      var long = cone.long || 0.0001;

      if (component === "lat") {
        if (long > 0) {
          lat -= dx * Math.PI / 180;
        }
        else {
          lat += dx * Math.PI / 180;
        }
        if (lat > Math.PI) {
          lat = Math.PI - lat;
          long = -long;
        }
        else if (lat < -Math.PI) {
          lat = Math.PI - lat;
          long = -long;
        }
      }
      else {
        long += dx * Math.PI / 180;
        if (long > Math.PI *2) {
          long -= Math.PI * 2;
        }
        else if (long < -Math.PI * 2) {
          long += Math.PI * 2;
        }
      }

      // adapted from https://gist.github.com/nicoptere/2f2571db4b454bb18cd9
      const v = (function lonLatToVector3( lng, lat, out )
      {
          //flips the Y axis
          lat = Math.PI / 2 - lat;

          //distribute to sphere
          out.set(
                      Math.sin( lat ) * Math.sin( lng ),
                      Math.cos( lat ),
                      Math.sin( lat ) * Math.cos( lng )
          );

          return out;

      })( long, lat, object.containerObject.position.clone() );
      if (v.x === 0) { v.x = 0.0001; }
      const point = object.containerObject.position.clone().add(v);
      object.pointCone(cone, point);
    }

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
      type: 'number',
      cls: 'volume',
      suffix: ' dB',
      bind: changeVolume
    }, elem);
    this.addParameter({
      property: 'Spread',
      value: Number((cone.sound.spread).toFixed(3)),
      type: 'number',
      cls: 'spread',
      bind: changeSpread
    }, elem);
    this.addParameter({
      property: 'Longitude',
      value: Number((cone.long * 180/Math.PI).toFixed(2)),
      type: 'number',
      cls: 'long',
      suffix: '˚',
      bind: setConeRotation.bind(this, "long")
    }, elem);
    this.addParameter({
      property: 'Latitude',
      value: Number((cone.lat * 180/Math.PI).toFixed(2)),
      type: 'number',
      cls: 'lat',
      suffix: '˚',
      bind: setConeRotation.bind(this, "lat")
    }, elem);
    this.addParameter({
      value: 'Delete',
      events:[{
        type:'click',
        callback: function() {
          this.app.removeCone(this.obj, cone)
        }.bind(this)
      }]
    }, elem);

    /* Cone navigation */
    this.addNav({type: "cone", direction: "left"}, elem);
    this.addNav({type: "cone", direction: "right"}, elem);

    return elem;
  }

  // remove cone parameter window
  removeCone(cone) {
    const cones = this.container.getElementsByClassName('cone');
    for (let i = 0; i < cones.length; ++i) {
      if (cones[i].id.split('-').pop() == cone.id) {
        cones[i].parentNode.removeChild(cones[i]);
        return;
      }
    }
  }

  // set up initial parameters for a sound object trajectory path
  addTrajectory(object) {
    var elem = this.addElem('Trajectory');
    elem.id = 'trajectory';

    this.addParameter({
      property: 'Speed',
      value:object.movementSpeed,
      suffix:' m/s',
      type:'number',
      cls:'speed',
      bind: function(dx) {
        const speed = object.movementSpeed + dx/10;
        object.movementSpeed = Math.min(Math.max(-20, speed), 20);
        object.calculateMovementSpeed();
      }
    }, elem);

    this.addParameter({
      value: 'Delete',
      events:[{
        type:'click',
        callback: function() {
          this.app.removeSoundTrajectory(object.trajectory);
          object.trajectory = null;
          elem.parentNode.removeChild(elem);
          this.addTrajectoryDialog();
        }.bind(this)
      }]
    }, elem);

    return elem;
  }

  disableGlobalParameters() {
    const global = document.getElementById('object-globals');
    if (global) {
      global.style.display = 'none';
    }
  }
  enableGlobalParameters() {
    const global = document.getElementById('object-globals');
    if (global) {
      global.style.display = 'block';
    }
  }

  // set up initial parameters for a soundzone
  initSoundzoneGUI(zone) {
      var elem = this.addElem('Zone ' + (this.app.soundZones.indexOf(zone)+1));

      function setZonePosition(component, dx) {
        zone.containerObject.position[component] += dx;
      }

      function setZoneRotation(dx) {
        let rotation = zone.containerObject.rotation.y + dx * Math.PI / 180;

        if (rotation < Math.PI) { rotation += Math.PI*2 }
        if (rotation > Math.PI) { rotation -= Math.PI*2 }
        zone.containerObject.rotation.y = rotation;
      }

      function changeVolume(dx) {
        if (zone.sound && zone.sound.volume) {
          zone.sound.volume.gain.value += dx;
        }
      }

      var pos = zone.containerObject.position;
      this.addParameter({
          property: 'File',
          value: zone.sound ? zone.sound.name.split('/').pop() : 'None',
          type: 'file-input',
          events: [{ type: 'click', callback: this.addSound.bind(this) }]
      },elem);

      this.addParameter({
          property: 'Volume',
          value: zone.sound && zone.sound.volume ? zone.sound.volume.gain.value : 'N/A',
          type: 'number',
          cls: 'volume',
          bind: changeVolume
      },elem);

      this.addParameter({
          property: 'x',
          value: Number(pos.x.toFixed(2)),
          type: 'number',
          cls: 'x',
          bind: setZonePosition.bind(this, "x")
      },elem);

      this.addParameter({
          property: 'z',
          value: Number(pos.z.toFixed(2)),
          type: 'number',
          cls: 'z',
          bind: setZonePosition.bind(this, "z")
      },elem);

    this.addParameter({
      property: 'Rotation',
      value: Number((zone.containerObject.rotation.y * 180/Math.PI).toFixed(2)),
      type: 'number',
      cls: 'rotation',
      suffix: '˚',
      bind: setZoneRotation.bind(this)
    }, elem);
  }


  //----- updating objects -------//

  // update parameters of sound object
  updateObjectGUI(object) {

      // update sound volume
      var volume = this.container.querySelector('.volume .value');
      this.replaceTextContent(volume, object.omniSphere.sound && object.omniSphere.sound.volume ? object.omniSphere.sound.volume.gain.value : 'N/A');

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
          let speed = this.container.querySelector('.speed .value');
          if (speed) {
            this.replaceTextContent(speed, object.movementSpeed);
          }
        }
      }

      // update number of cones
      this.replaceTextContent(document.getElementById('cone-count').querySelector('.value'), object.cones.length);

      // get cone information
      if (object.cones && object.cones.length > 0) {

        const cones = this.container.getElementsByClassName('cone');

        this.app.interactiveCone == this.app.interactiveCone || object.cones[0];

        object.cones.forEach((cone, i) => {
          if (cone === this.app.interactiveCone) {
            cones[i].style.display = 'block';
            this.replaceTextContent(cones[i].getElementsByTagName('h4')[0], 'Cone ' + (i+1) + ' of ' + object.cones.length);
            this.replaceTextContent(cones[i].querySelector('.lat .value'), cone.lat * 180 / Math.PI);
            this.replaceTextContent(cones[i].querySelector('.long .value'), cone.long * 180 / Math.PI);
            this.replaceTextContent(cones[i].querySelector('.volume .value'), cone.sound.volume.gain.value, 2, true);
            this.replaceTextContent(cones[i].querySelector('.spread .value'), cone.sound.spread, 2, true);
          }
          else {
            cones[i].style.display = 'none';
          }
        });
      }
  }

  // update parameters of sound zone
  updateSoundzoneGUI(zone) {
      var pos = zone.containerObject.position;
      var x = this.container.querySelector('.x .value');
      var z = this.container.querySelector('.z .value');
      var rotation = this.container.querySelector('.rotation .value');
      var volume = this.container.querySelector('.volume .value');
      this.replaceTextContent(x, pos.x);
      this.replaceTextContent(z, pos.z);
      this.replaceTextContent(rotation, zone.containerObject.rotation.y * 180 / Math.PI);
      this.replaceTextContent(volume, zone.sound && zone.sound.volume ? zone.sound.volume.gain.value : 'N/A');
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
              // check if sound is attaching to omnisphere or cone
              if (span.parentNode.id === "omnisphere-sound-loader") {
                obj.loadSound(path, self.app.audio, obj)
                  .then((sound) => {
                    /* TODO: PROPERLY ATTACH SOUND HERE */
                    obj.omniSphere.sound = sound;
                    obj.omniSphere.sound.name = file.name;
                    self.replaceTextContent(span, file.name);
                    obj.setAudioPosition(obj.omniSphere)
                    console.log("TODO: DO THIS PROPERLY",sound);
                    console.log("Attaching omnisphere sound",sound);
                  })
                  .catch((err) => {
                    console.log('error');
                  });
              }
              else {
                // replace sound attached to existing cone
                var text = span.innerText || span.textContent;
                let cone = null;
                if (obj.cones && obj.cones.length > 0 && text) {
                  cone = obj.cones.find(c => c.filename == text);
                }

                // create new cone
                obj.loadSound(path, self.app.audio, cone)
                  .then((sound) => {
                    if (cone) {
                      // copy properties of previous cone
                      sound.spread = cone.sound.spread;
                      sound.panner.refDistance = cone.sound.panner.refDistance;
                      sound.panner.distanceModel = cone.sound.panner.distanceModel;
                      sound.panner.coneInnerAngle = cone.sound.panner.coneInnerAngle;
                      sound.panner.coneOuterAngle = cone.sound.panner.coneOuterAngle;
                      sound.panner.coneOuterGain = cone.sound.panner.coneOuterGain;
                      sound.volume.gain.value = cone.sound.volume.gain.value;
                      cone.sound = sound;
                      obj.setAudioPosition(cone);

                      // replace text with file name
                      cone.filename = file.name;
                      self.interactiveCone = cone;
                      self.replaceTextContent(span, file.name);
                    }
                    else {
                      cone = obj.createCone(sound);
                      cone.filename = file.name;
                      self.addCone(cone);

                      // this is clumsy but point cone @ direction of head
                      obj.pointCone(cone, self.app.head.position);
                      // let v = self.app.head.position.clone();
                      // cone.lookAt(v.sub(obj.containerObject.position));
                      obj.setAudioPosition(cone);

                      // automatically enter edit mode after brief delay
                      window.setTimeout(function() {
                        self.app.isEditingObject = false;
                        self.app.interactiveCone = cone;
                        self.toggleEditObject();
                      }, 500);
                    }
                  })
                  .catch((err) => {
                    // no file was loaded: do nothing
                    console.log(err);
                  });
              }
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
    if (!this.app.isEditingObject) {
      var span = this.container.querySelector('.edit-toggle .value');
      this.editor = span;
      this.container.classList.add('editor');
      this.replaceTextContent(span, 'Exit editor');
      this.app.enterEditObjectView();
    }
    else {
      this.app.exitEditObjectView();
    }
  }

  exitEditObject() {
    var span = this.container.querySelector('.edit-toggle .value');
    this.editor = null;
    this.container.classList.remove('editor');
    this.replaceTextContent(span, 'Edit object')
  }

  // switch between different cones and objects
  nav(e) {
    if (e.type === 'cone') {
      let i = this.obj.cones.indexOf(this.app.interactiveCone);
      if (i > -1) {
        i = e.direction === 'left' ? i - 1 + this.obj.cones.length : i + 1;
        this.app.interactiveCone = this.obj.cones[i%this.obj.cones.length];
      }
    }
    else {
      const everyObject = [].concat(this.app.soundObjects/*, this.app.soundZones*/);
      let i = everyObject.indexOf(this.obj);
      if (i > -1) {
        i = e.direction === 'left' ? i - 1 + everyObject.length : i + 1;
        this.app.setActiveObject(everyObject[i%everyObject.length]);
        this.app.tweenToObjectView();
      }
    }
  }

  startDragging(e) {

    const l = this.listeners.find(l => l.elem === e.target || l.elem === e.target.parentNode);

    if (l && l.callback) {
      this.dragEvent.call = l.callback;
      this.dragEvent.editing = e.target;
      this.dragEvent.x = e.x;
    }
  }
  drag(e) {
    if (!this.dragEvent.editing) {
      return;
    }
    const dx = e.x - this.dragEvent.x;
    this.dragEvent.x = e.x;
    this.dragEvent.call(dx);
  }
  stopDragging(e) {
    if (!this.dragEvent.editing) {
      return;
    }

    this.dragEvent = {};
  }


  //---------- dom building blocks -----------//
  // add a new div
  addElem(name, siblingAfter) {
      var div = document.createElement('div');
      var title = document.createElement('h4');
      title.appendChild(document.createTextNode(name));

      div.appendChild(title);
      this.container.insertBefore(div, siblingAfter || null);

      if (this.obj.type == "SoundObject") {
        // "edit object" dialog
        this.addParameter({
          value: this.app.isEditingObject ? 'Exit editor' : 'Edit object',
          cls: 'edit-toggle',
          events: [{
            type: 'click',
            callback: this.toggleEditObject.bind(this)
          }]
        }, title);        
      }
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
              evt.target.addEventListener(evt.type, evt.callback)
            }
          })
      }

      // shortcut to apply "startDragging" mousedown event
      if (p.bind) {
        val.onmousedown = this.startDragging.bind(this);
        this.listeners.push({
          elem: val,
          callback: p.bind
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
  replaceTextContent(parent, text, sigfigs, float) {
    // while(parent.firstChild) { parent.removeChild(parent.firstChild); }
    if (!isNaN(text)) {
      text = (+text).toFixed(sigfigs || 2);
      if (!float) text = +text;
    }
    parent.innerHTML = text;
    // parent.appendChild(document.createTextNode(text));
  }

}

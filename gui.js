gui = {
    init: function() {
        this.container = document.getElementById('guis');
        this.container.style.width = '250px';
        this.display();
    },

    id: null,   // uuid of either "shape" or "raycastSphere" being displayed
    obj: null,  // the object whose information is being displayed
    parameters: {}, // list of parameter key-DOM element pairs

    display: function(obj) {
        if (obj) {
            this.show(obj);
        }
        else {
            this.hide();
            this.id = this.obj = null;
        }
    },

    // show gui
    show: function(obj) {
      if (!obj) { return; }
      var clearGUI = (function(container) {
          return function() {
              while (container.firstChild) {
                  container.removeChild(container.firstChild);
              }
          };
      })(this.container);

      // get details of object
      switch (obj.type) {
          case 'SoundTrajectory':
              obj = obj.parentSoundObject; // do not break
          case 'SoundObject':
              if (this.id !== obj.raycastSphere.uuid) {
                  // init a new gui
                  clearGUI();
                  this.id = obj.raycastSphere.uuid;
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
                  clearGUI();
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
    },

    // hide gui
    hide: function() {
        this.container.style.opacity = 0;
        this.container.style.pointerEvents = 'none';
    },

    // set up initial parameters for a sound object
    initObjectGUI: function(object) {
        var mesh = object.raycastSphere;
        var elem = this.addElem('Object ' + (soundObjects.indexOf(object)+1));

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

        // insert cone window
        function initConeGUI(cone) {

        }
        object.cones.forEach(initConeGUI);

        // "add cone" dialog
        var addConeElem = this.addParameter({
          value: 'Add cone'
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
              callback: toggleAddTrajectory
                  // global function toggleAddTrajectory()
            }]
          });
          addTrajectoryElem.id = 'add-trajectory'
        }
    },

    // update parameters of sound object
    updateObjectGUI: function(object) {
        // update position parameters
        var pos = object.raycastSphere.position;
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
    },

    // set up initial parameters for a soundzone
    initSoundzoneGUI: function(zone) {
        var elem = this.addElem('Zone ' + (soundZones.indexOf(zone)+1));
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
    },

    // update parameters of sound object
    updateSoundzoneGUI: function(zone) {
        // update position parameters
        var pos = this.getSoundzonePosition(zone.splinePoints);
        var x = this.container.querySelector('.x .value');
        var z = this.container.querySelector('.z .value');
        while (x.firstChild) { x.removeChild(x.firstChild); }
        while (z.firstChild) { z.removeChild(z.firstChild); }
        x.appendChild(document.createTextNode(Number(pos.x.toFixed(2))));
        z.appendChild(document.createTextNode(Number(pos.z.toFixed(2))));

    },

    // average positions of all the spline points
    getSoundzonePosition: function(points) {
        var reduce = function(a,b) { return a + b; };
        var meanX = points.map(function(v) { return v.x; })
                        .reduce(reduce) / points.length;
        var meanZ = points.map(function(v) { return v.z; })
                        .reduce(reduce) / points.length;
        return {x: meanX, z: meanZ};
    },

    // add a new div
    addElem: function(name, siblingAfter) {
        var div = document.createElement('div');
        var title = document.createElement('h4');
        title.appendChild(document.createTextNode(name));

        div.appendChild(title);
        this.container.insertBefore(div, siblingAfter || null);
        return div;
    },

    // add a line for the parameter in the UI
    // parameter p can contain properties: 
    //      property
    //      value
    //      cls:     class name for quicker dom access
    //      type:    number, file, etc?
    //      suffix:  a string to be appended to the value
    //      events:  array of event names & callback functions
    addParameter:function(p, container) {
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
    },

    // event handler additions
    addSound:function(e) {
        var obj = this.obj;
        var span = e.target;
        var input = document.getElementById('myInput');
        // listen to click
        input.onchange = function(e) {
            var file = e.target.files[0];

            if (file) {
                // replace text with file name
                while(span.firstChild) { span.removeChild(span.firstChild); }
                span.appendChild(document.createTextNode(file.name));
                var path = 'assets/'+file.name;

                // add sound to object
                if (obj.type === 'SoundObject') { obj.createCone(path); }
                else if (obj.type === 'SoundZone') { obj.loadSound(path); }
                else if (obj.type === 'SoundTrajectory') { obj.parentSoundObject.createCone(path); }
            }
        }
        input.click();

        // for an object, go into edit mode
          // if(!isEditingObject){
          //   isEditingObject = true;
          //   cameraPosition.lerpVectors(activeObject.containerObject.position, headModel.position,
          //   500 / headModel.position.distanceTo(activeObject.containerObject.position));

          //   var tween = new TWEEN.Tween(camera.position)
          //   .to(cameraPosition, 800)
          //   .onComplete(function() {
          //     headModel.position.copy(cameraPosition);
          //     headModel.lookAt(activeObject.containerObject.position);
          //     axisHelper.position.copy(cameraPosition);
          //     axisHelper.lookAt(activeObject.containerObject.position);})
          //   .start();

          //   var tween2 = new TWEEN.Tween(controls.center)
          //   .to(activeObject.containerObject.position, 800)
          //   .start();
          // }

    },
    addTrajectory: function(object) {
      var elem = this.addElem('Trajectory', document.getElementById('add-cone'));
      elem.id = 'trajectory';

      this.addParameter({
        property: 'Speed',
        value:object.movementSpeed,
        suffix:' m/s',
        type:'number'
      }, elem)
    }
};


      // objectGui.add(obj, 'attachSound').name('Attach Sound');
      // objectGui.add(obj, 'editObject').name('Edit Object');


      // var obj = {
      //   attachSound : function() {

      //     attachSound();

      //     if(!isEditingObject){
      //       isEditingObject = true;
      //       cameraPosition.lerpVectors(activeObject.containerObject.position, headModel.position,
      //       500 / headModel.position.distanceTo(activeObject.containerObject.position));

      //       var tween = new TWEEN.Tween(camera.position)
      //       .to(cameraPosition, 800)
      //       .onComplete(function() {
      //         headModel.position.copy(cameraPosition);
      //         headModel.lookAt(activeObject.containerObject.position);
      //         axisHelper.position.copy(cameraPosition);
      //         axisHelper.lookAt(activeObject.containerObject.position);})
      //       .start();

      //       var tween2 = new TWEEN.Tween(controls.center)
      //       .to(activeObject.containerObject.position, 800)
      //       .start();
      //     }
      //   },
      //   editObject : function() {

      //     if(!isEditingObject){
      //       cameraPosition.lerpVectors(activeObject.containerObject.position, headModel.position,
      //       500 / headModel.position.distanceTo(activeObject.containerObject.position));

      //       var tween = new TWEEN.Tween(camera.position)
      //       .to(cameraPosition, 800)
      //       .onComplete(function() {
      //         headModel.position.copy(cameraPosition);
      //         headModel.lookAt(activeObject.containerObject.position);
      //         axisHelper.position.copy(cameraPosition);
      //         axisHelper.lookAt(activeObject.containerObject.position);})
      //       .start();

      //       var tween2 = new TWEEN.Tween(controls.center)
      //       .to(activeObject.containerObject.position, 800)
      //       .start();
      //     }
      //     isEditingObject = !isEditingObject;
      //   }
      // };


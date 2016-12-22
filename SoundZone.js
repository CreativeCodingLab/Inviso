var SoundZone = function(points) {

	this.type = 'SoundZone';
	this.isActive = true;

	this.splinePoints = points;
	this.pointObjects;
	this.spline;
	this.shape;
	this.sound;
	this.isPlaying = false;
	this.buffer;

	this.underUser = function(){
		if( this.sound && !this.isPlaying){
			this.sound.source = audio.context.createBufferSource();
			this.sound.source.loop = true;
			this.sound.source.connect(this.sound.volume);
			this.sound.source.buffer = this.buffer;
			this.sound.source.start(audio.context.currentTime);
			this.sound.volume.gain.setTargetAtTime(0.3, audio.context.currentTime + 0.1, 0.1);
			this.isPlaying = true;
		}
	};

	this.notUnderUser = function(){
		if( this.sound && this.isPlaying){
			this.sound.volume.gain.setTargetAtTime(0.0, audio.context.currentTime, 0.05);

			if (this.sound.source) {
				this.sound.source.stop(audio.context.currentTime + 0.2);
			}
			this.isPlaying = false;
		}
	};

	this.loadSound = function(soundFileName){

		var context = audio.context;
		var sound = {};
		var _this = this;

		sound.name = soundFileName;
		sound.volume = context.createGain();
		sound.volume.connect(audio.destination);

		var request = new XMLHttpRequest();
		request.open("GET", soundFileName, true);
		request.responseType = "arraybuffer";
		var context = audio.context;
		request.onload = function() {
			context.decodeAudioData(request.response, function(buffer){
				_this.buffer = buffer;

			}, function() {
				alert("Decoding the audio buffer failed");
			});
		};

		request.send();
		sound.volume.gain.value = 0.0;

		if (this.sound && this.sound.source) {
			this.sound.source.stop(audio.context.currentTime + 0.2);
		}

		this.sound = sound;
	},

	this.selectedPoint;
	this.mouseOffsetX = 0, this.mouseOffsetY = 0;

	var geometry, material;

	// cursor indicates which location/obj the mouse is pointed at
	this.cursor = new THREE.Mesh(
		new THREE.SphereGeometry(10),
		new THREE.MeshBasicMaterial({ color:0x00ccff })
	);
	this.cursor.visible = false;


	this.renderPath = function() {
		// splinePoints control the curve of the path
		var points = this.splinePoints;
		this.pointObjects = (function() {
			// setup
			var sphere = new THREE.SphereGeometry(10);
			var sphereMat = new THREE.MeshBasicMaterial( { color:0xff1169 } );

			var collider = new THREE.SphereGeometry(15);
			var colliderMat = new THREE.MeshBasicMaterial( {color:0xff1169, transparent:true, opacity:0, depthWrite: false});
			var colliderMesh = new THREE.Mesh( collider, colliderMat );

			// place a meshgroup at each point in array
			var pointObjects = [];
			points.forEach(function(point) {
				var sphereMesh = new THREE.Mesh( sphere, sphereMat.clone() );
				var group = new THREE.Object3D();

				group.add(sphereMesh, colliderMesh.clone());
				group.position.copy(point);
				// group.position.z = -300;

				pointObjects.push(group);
			});
			return pointObjects;
		})();

		this.spline = new THREE.CatmullRomCurve3(this.splinePoints);
		this.spline.type = 'centripetal';
		this.spline.closed = true;
		geometry = new THREE.Geometry();
		geometry.vertices = this.spline.getPoints(200);
		material = new THREE.LineBasicMaterial({
			color: 0xff1169,
			linewidth:1,
			transparent:true,
			opacity:0.4
		});
		this.spline.mesh = new THREE.Line( geometry, material );

		// fill the path
		var rotatedPoints = this.spline.getPoints(200);
		rotatedPoints.forEach(function (vertex){
			vertex.y = vertex.z;
			vertex.z = 0.0;
		});
		var shapeFill = new THREE.Shape();
		shapeFill.fromPoints(rotatedPoints);
		var shapeGeometry = new THREE.ShapeGeometry(shapeFill);
		shapeGeometry.rotateX(Math.PI/2);
		material = new THREE.MeshBasicMaterial({
			color: 0xff1169,
			transparent: true,
			opacity: 0.2,
			side: THREE.DoubleSide,
		});
		this.shape = new THREE.Mesh(shapeGeometry, material);
	};
	this.renderPath();
};


SoundZone.prototype = {

	constructor: SoundZone,

	get objects() {
		return [].concat(this.pointObjects, this.spline.mesh, this.shape);
	},

	addToScene: function(scene) {
		this.objects.forEach(function(obj) {
			scene.add(obj);
		});
	    scene.add(this.cursor);
	},
	removeFromScene: function(scene) {
		this.objects.forEach(function(obj) {
			scene.remove(obj, true);
		});
		scene.remove(this.cursor);
	},

	// raycast to this soundzone
	isUnderMouse: function(raycaster) {
		if (this.isActive) {
			return raycaster.intersectObjects( this.objects ).length > 0;
		}
		else {
			return raycaster.intersectObject( this.shape ).length > 0;
		}
	},
	objectUnderMouse: function(raycaster) {
		var intersects = raycaster.intersectObjects( this.objects, true );

		if (intersects.length > 0) {
			if (intersects[0].object.type === 'Line') {
				return intersects[Math.floor(intersects.length/2)];
			}
			else
				return intersects[0];
		}
		return null;
	},

	setMouseOffset: function(point) {
		this.mouseOffsetX = point.x,
		this.mouseOffsetY = point.z;
	},

	move: function() {

		if( !perspectiveView ){
			if (this.selectedPoint) {
				// move selected point
				var i = this.pointObjects.indexOf(this.selectedPoint);
				if (i > -1) {
					this.showCursor(false);
					this.splinePoints[i].copy(mouse);
					this.updateZone();
					this.selectPoint(this.pointObjects[i]);
				}
			}
			else {
				// move entire shape
				var dx = mouse.x - this.mouseOffsetX;
				var dy = mouse.z - this.mouseOffsetY;
				this.mouseOffsetX = mouse.x, this.mouseOffsetY = mouse.z;

				this.objects.forEach(function(obj) {
					obj.position.x += dx;
					obj.position.z += dy;
				});
				this.splinePoints.forEach(function(pt) {
					pt.x += dx;
					pt.z += dy;
				});
			}
		}
	},

	setCursor: function(point) {
		this.cursor.position.copy(point);
	},

	showCursor: function(bool) {
		if (bool === undefined) this.cursor.visible = true;
		this.cursor.visible = bool;
	},

	setActive: function() {
		this.setMouseOffset(mouse);
		this.isActive = true;
		this.pointObjects.forEach(function(obj) {
			obj.visible = true;
		});
		this.spline.mesh.visible = true;
	},

	setInactive: function() {
		this.deselectPoint();
		this.showCursor(false);
		this.isActive = false;
		this.pointObjects.forEach(function(obj) {
			obj.visible = false;
		});
		this.spline.mesh.visible = false;
	},

	select: function(intersect) {
		if (!intersect) return;

		// obj can be the curve, a spline point, or the shape mesh
		var obj = intersect.object;

		if (obj.type === 'Line') {
			//add a point to the line
			this.addPoint(intersect.point);
		}
		else if (obj.parent.type === 'Object3D') {
			// select an existing point on line
			this.selectPoint(obj.parent);
		}
		else {
			this.deselectPoint();
			this.setMouseOffset(intersect.point);
		}
	},

	selectPoint: function(obj) {
		this.deselectPoint();
		this.selectedPoint = obj;
		obj.children[0].material.color.set('blue');
	},

	deselectPoint: function() {
		if (this.selectedPoint) {
			this.selectedPoint.children[0].material.color.set('red');
			this.selectedPoint = null;
		}
	},

	addPoint: function(position) {
		var closestSplinePoint = 0;
		var prevDistToSplinePoint = -1;
		var minDistance = Number.MAX_VALUE;
		var minPoint = 1;

		// search for point on spline
		for (var t=0; t < 1; t+=1/200.0) {
			var pt = this.spline.getPoint(t);

			var distToSplinePoint = this.splinePoints[closestSplinePoint].distanceToSquared(pt);
			if (distToSplinePoint > prevDistToSplinePoint) {
				++closestSplinePoint;
				if (closestSplinePoint >= this.splinePoints.length)
					closestSplinePoint = 0;
			}
			prevDistToSplinePoint = this.splinePoints[closestSplinePoint].distanceToSquared(pt);
			var distToPoint = pt.distanceToSquared(position);
			if (distToPoint < minDistance) {
				minDistance = distToPoint;
				minPoint = closestSplinePoint;
			}
		}

		this.splinePoints.splice(minPoint, 0, position);
		this.updateZone();
		this.selectPoint(this.pointObjects[minPoint]);

	},

	removePoint: function() {
		// find point in array
		var i = this.pointObjects.indexOf(this.selectedPoint);
		this.splinePoints.splice(i,1);
		this.deselectPoint();
		this.updateZone();
	},

	updateZone: function() {
		var scene = this.spline.mesh.parent;
		this.removeFromScene(scene);
		this.renderPath();
		this.addToScene(scene);
	}
};


zone = {                    //    live drawing by mouse
	scene: null,              //    the scene
	points: [],               //    points on path
	lines: [],                //    lines on the scene
	lastPoint: new THREE.Vector3(),

	setScene: function(scene) {
		this.scene = scene;
	},

	beginAt: function(point, scene) {
		this.lastPoint = point;
		this.points = [point];
	},

	addPoint: function(point) {
		if (this.scene === null) {
			console.log('scene not set');
			return;
		}
		var material = new THREE.LineBasicMaterial({
			color: 0xff1169
		});
		var geometry = new THREE.Geometry();
		geometry.vertices.push(this.lastPoint, point);
		var line = new THREE.Line(geometry,material);

		this.lastPoint = point;
		this.points.push(point);
		this.lines.push(line);
		this.scene.add(line);
	},
	createObject: function() {
		// simplify points using algorithm from simplify.js
		// tolerance = 10 is a somewhat arbitrary number :-\
		var points = simplify(this.points, 10, true);
		var object;
		if (points.length >= 3) {
			object = new SoundZone(points);
		}
		else {
			object = new SoundObject(audio);
		}

		this.clear();

		if (this.scene && object)
			object.addToScene(this.scene);
		return object;
	},

	clear: function() {
		var scene = this.scene;
		this.lines.forEach(function(line) {
			scene.remove(line);
		});
		this.lines = [];
		this.points = [];
	}
};

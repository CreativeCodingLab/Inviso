var SoundTrajectory = function(points) {

	this.type = 'SoundTrajectory';
	this.isActive = true;

	this.splinePoints = points;
	this.pointObjects;
	this.spline;

	this.parentSoundObject;

	this.selectedPoint;
	this.mouseOffsetX = 0, this.mouseOffsetY = 0; this.nonScaledMouseOffsetY = 0;

	var geometry, material;

	this.cursor = new THREE.Mesh(
		new THREE.SphereGeometry(10),
		new THREE.MeshBasicMaterial({ color:0x00ccff })
	);
	this.cursor.visible = false;

	this.renderPath = function() {

		var points = this.splinePoints;
		this.pointObjects = (function() {

			var sphere = new THREE.SphereGeometry(10);
			var sphereMat = new THREE.MeshBasicMaterial( { color:0x999999 } );

			var collider = new THREE.SphereGeometry(20);
			var colliderMat = new THREE.MeshBasicMaterial( {color:0x999999, transparent:true, opacity:0, depthWrite: false});
			var colliderMesh = new THREE.Mesh( collider, colliderMat );

			var pointObjects = [];
			points.forEach(function(point) {
				var sphereMesh = new THREE.Mesh( sphere, sphereMat.clone() );
				var group = new THREE.Object3D();

				group.add(sphereMesh, colliderMesh.clone());
				group.position.x = point.x,
				group.position.y = point.y;
				group.position.z = point.z;

				pointObjects.push(group);
			})

			return pointObjects;
		})();

		this.spline = new THREE.CatmullRomCurve3(this.splinePoints);
		this.spline.type = 'centripetal';

		var begEndDistance = this.splinePoints[0].distanceTo(this.splinePoints[this.splinePoints.length - 1]);

		if(begEndDistance < 40) this.spline.closed = true;
		else this.spline.closed = false;

		geometry = new THREE.Geometry();
		geometry.vertices = this.spline.getPoints(200);
		material = new THREE.LineBasicMaterial({
			color: 0x999999,
			linewidth:2,
			opacity:0.4
		});
		this.spline.mesh = new THREE.Line( geometry, material );
	}
	this.renderPath();
}


SoundTrajectory.prototype = {

	constructor: SoundTrajectory,

	get objects() {
		return [].concat(this.pointObjects, this.spline.mesh);
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

	isUnderMouse: function(raycaster) {
		if (this.isActive) {
			return raycaster.intersectObjects( this.objects ).length > 0;
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

		this.nonScaledMouseOffsetY = nonScaledMouse.y;
	},

	move: function() {

		if (this.selectedPoint) {
			var i = this.pointObjects.indexOf(this.selectedPoint);
			if (i > -1) {

				if( perspectiveView ) {
					var pointer = this.splinePoints[i];
					var posY = mapRange(nonScaledMouse.y, -0.5, 0.5, -200, 200);
					pointer.y = posY;
				}
				else var pointer = mouse;
				pointer.y = this.splinePoints[i].y;

				this.showCursor(false);
				this.splinePoints[i].copy(pointer);
				this.updateTrajectory();
				this.selectPoint(this.pointObjects[i]);
			}
		}
		else {
			// move entire shape
			if ( perspectiveView ){
				var posY = mapRange(nonScaledMouse.y - this.nonScaledMouseOffsetY, -0.5, 0.5, -200, 200);

				this.objects.forEach(function(obj) {
					obj.position.y += posY;
				});
				this.splinePoints.forEach(function(pt) {
					pt.y += posY;
				});

				this.nonScaledMouseOffsetY = nonScaledMouse.y;
			}else{
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

			this.updateTrajectory();
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
		this.isActive = true;
		this.pointObjects.forEach(function(obj) {
			obj.children[0].material.color.setHex( 0x999999 );
		});
		this.spline.mesh.material.color.setHex( 0x999999 );
	},

	setInactive: function() {
		this.deselectPoint();
		this.showCursor(false);
		this.isActive = false;
		this.pointObjects.forEach(function(obj) {
			obj.children[0].material.color.setHex( 0xcccccc );
		});
		this.spline.mesh.material.color.setHex( 0xcccccc );
	},

	select: function(intersect) {
		if (!intersect) return;

		var obj = intersect.object;

		if (obj.type === 'Line') {
			this.addPoint(intersect.point);
		}
		else if (obj.parent.type === 'Object3D') {
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
		obj.children[0].material.color.set(0xff0077);
	},

	deselectPoint: function() {
		if (this.selectedPoint) {
			this.selectedPoint.children[0].material.color.set(0xff0055);
			this.selectedPoint = null;
		}
	},

	addPoint: function(position) {

		var closestSplinePoint = 0;
		var prevDistToSplinePoint = -1;
		var minDistance = Number.MAX_VALUE;
		var minPoint = 1;

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
		this.updateTrajectory();
		this.selectPoint(this.pointObjects[minPoint]);

	},

	removePoint: function() {
		var i = this.pointObjects.indexOf(this.selectedPoint);
		this.splinePoints.splice(i,1);
		this.deselectPoint();
		this.updateTrajectory();
	},

	updateTrajectory: function() {
		var scene = this.spline.mesh.parent;
		this.removeFromScene(scene);
		this.renderPath();
		this.addToScene(scene);
	}
}

trajectory = {
	scene: null,
	points: [],
	lines: [],
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
			linewidth: 2,
			color: 0x999999
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

		var points = simplify(this.points, 10, true);
		var object;
		if (points.length >= 3) {
			object = new SoundTrajectory(points);
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
}

function mapRange(value, low1, high1, low2, high2) {

		return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

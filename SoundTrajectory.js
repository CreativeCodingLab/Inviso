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

	/*
	A recursive function that draws all the THREE geometries, including

	visual and collider spheres as control points on the trajectory spline
	(grouped as points in the pointsObjects array),

	the CatmullRom spline that is created from splinePoints, which is populated
	under addPoint function below, and repopulated whenever a trajectory is
	moved or a control point is removed from the spline,

	and the line geometry which is assigned as a mesh for the said spline for it
	to be drawn on screen.
	*/
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

		/*
		This measures the distance between the start and end points of a trajectory
		and if the distance is small enough it turnes the spline into a closed curve.
		This is checked in each frame so that the user can interactively determine
		if a trajectory is closed (looping) or open (back-and-forth).
		*/
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

	/*
	First call to renderPath happens in update trajectory function. From there
	on the function recursively calls itself at the end of each draw.
	*/
	this.renderPath();
}

SoundTrajectory.prototype = {

	constructor: SoundTrajectory,
	/*
	Creates a global object array that includes both the pointObjects (i.e. vectors
	for both visible and collider spheres) and the spline mesh which is used to
	draw the line that makes up the spline.
	*/
	get objects() {
		return [].concat(this.pointObjects, this.spline.mesh);
	},

	/*
	Adds each object in the object array (that pertain to a single
	trajectory) to the scene.
	*/
	addToScene: function(scene) {
		this.objects.forEach(function(obj) {
			scene.add(obj);
		});
	    scene.add(this.cursor);
	},

	/*
	Removes each object in the object array (that pertain to a single
	trajectory) from the scene.
	*/
	removeFromScene: function(scene) {
		this.objects.forEach(function(obj) {
			scene.remove(obj, true);
		});
		scene.remove(this.cursor);
	},

	/*
	Returns true if a particular object is under the mouse (called from
	index.html)
	*/
	isUnderMouse: function(raycaster) {
		if (this.isActive) {
			return raycaster.intersectObjects( this.objects ).length > 0;
		}
	},

	/*
	Determines if it is a control point or the curve itself that's under the
	mouse. Returns the collided object.
	*/
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

	/* Keeps record of the mouse offset after the initial click. */
	setMouseOffset: function(point) {
		this.mouseOffsetX = point.x,
		this.mouseOffsetY = point.z;
		this.nonScaledMouseOffsetY = nonScaledMouse.y;
	},

	/* Moves a single control point on the spline or the entire trajectory. */
	move: function() {

		if (this.selectedPoint) {
			var i = this.pointObjects.indexOf(this.selectedPoint);
			if (i > -1) {

				/*
				If the camera is in perspective view, the control points can only be
				moved in the Y-axis (height).
				*/
				if( perspectiveView ) {
					var pointer = this.splinePoints[i];
					var posY = mapRange(nonScaledMouse.y, -0.5, 0.5, -200, 200);
					pointer.y = posY;
				}
				else var pointer = mouse;
				pointer.y = this.splinePoints[i].y;

				/* Otherwise the mouse position vector is copied to the control point. */
				this.showCursor(false);
				this.splinePoints[i].copy(pointer);
				this.updateTrajectory();
				this.selectPoint(this.pointObjects[i]);
			}
		}
		else {
			/*
			This moves the entire shape when the parent sound object is moved around.
			The same XZ versus Y dimension principles apply depending which view mode
			the camera is in.
			*/
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

				/*
				Mouse movement differentials based on initial click position stored
				in setMouseOffset() is calculated here.
				*/
				var dx = mouse.x - this.mouseOffsetX;
				var dy = mouse.z - this.mouseOffsetY;
				this.mouseOffsetX = mouse.x, this.mouseOffsetY = mouse.z;

				/* REDUNDANT */
				// this.objects.forEach(function(obj) {
				// 	obj.position.x += dx;
				// 	obj.position.z += dy;
				// });

				/* Maps mouse position differentials to the splinePoints, which are in
				return used in the render path function to update the trajectories in
				each frame.
				*/
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
			this.addNewPoint(intersect.point);
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

	/*
	Adds new points to an existing trajectory. Updates the splinePoints array
	and calls the updateTrajectory function as a result.
	*/
	addNewPoint: function(position) {

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

	/* Removes points from the splinePoints array. */
	removePoint: function() {
		var i = this.pointObjects.indexOf(this.selectedPoint);
		this.splinePoints.splice(i,1);
		this.deselectPoint();
		this.updateTrajectory();
	},

	/*
	Updates trajectory by calling renderPath. First called inside addPoint()
	and this initates the renderPath() recursion.
	*/
	updateTrajectory: function() {
		var scene = this.spline.mesh.parent;
		this.removeFromScene(scene);
		this.renderPath();
		this.addToScene(scene);
	}
}

/*
Global trajectory interface object. Initializes a new trajectory.
*/
trajectory = {
	scene: null,
	points: [],
	lines: [],
	lastPoint: new THREE.Vector3(),

	setScene: function(scene) {
		this.scene = scene;
	},

	/*
	Inititaes the trajectory at the first mouse click location. Called
	inside index.html mouse down function.
	*/
	beginAt: function(point, scene) {
		this.lastPoint = point;
		this.points = [point];
	},

	/*
	Adds new points to the trajectory as the user moves the mouse after the
	initial click. Called inside index.html mouse move function.
	*/
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

		/*
		This is a "guide" line object for when the user is drawing the trajectory
		for the first time. Once the initial drawin is completed this drawing gets
		cleared and renderPath() takes over the redrawing of the trajectory with its
		own line geometry.
		*/
		this.lines.push(line);
		this.scene.add(line);
	},

	/* Called inside the index.html mouseUp function after the user completes
	the mouse drag motion when first drawing a trajectory. "Simplify 3D"
	(3D version is necessary for XZ-plane drawings) is used to interpolate
	the mouse coordinates reported in each animation frame. SoundTrajectory
	constructer is called with the simplified points array and a new trajectory
	is initialized. The returned objet (collection of geometries) is added to
	the scene. Clear is called to remove the drawing guide geometries from
	the scene.
	*/
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

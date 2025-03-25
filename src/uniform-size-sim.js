import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/*
    - majority code here is from non-uniform-size-sim.js
    - made modifications w.r.t assumption of constant size 
*/
export function initUniformSizeSim() {

    /*
        for analysis experiments, random seed for fair comparisons between algorithms
    */
    // Math.seedrandom('42', { global: true }); // uncomment if you want standardization!
    console.warn = () => {}; // rgba warnings fix - they were getting overwhelming

    /* (Constants)
        Notes:
        - any constants i define go here for neatness :)
    */
    const WHITE = 0xffffff;
    let R = null;

    /* (Setup)
        Notes:
        - basic three.js setup
        - camera, renderer, scene, orbital controls
        - this is basic setup code i had from HW1
    */
    const container = document.querySelector('.scene');
    const width = container.clientWidth;
    const height = container.clientHeight;

    /* scene */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(WHITE);

    /* camera */
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, -20, 200);
    camera.lookAt(0, 0, 0);

    /* renderer */
    const renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize( width, height );
    renderer.setPixelRatio(window.devicePixelRatio);
    document.querySelector('.scene').appendChild(renderer.domElement);

    /* oribtal controls */
    const controls = new OrbitControls(camera, renderer.domElement);

    const panOffset = new THREE.Vector3(0, 0, 0); // might change later for framing purposes
    camera.position.add(panOffset);
    controls.target.add(panOffset);
    controls.update();

    /* (Environment) 
        Notes:
        - all the code in this section sets up my environment for the simulation
        - im going with a simple setup as stated in the assignment description
            o bounding cube (im thinking of transparent edges, almost glass like maybe? 
                to see the polyhedra bounce of each other AND the "walls")
    */
   const boundingCubeGeom = new THREE.BoxGeometry(120, 120, 120);
   const boundingCubeMat = new THREE.MeshBasicMaterial({color: 0x000000, transparent: true, opacity: 0.01});
   const boundingCube = new THREE.Mesh(boundingCubeGeom, boundingCubeMat);
   
   // the wireframe prop by default has these diagonals that make it difficult to see what is going on
   // this is my manual way to remove them
   const edges = new THREE.EdgesGeometry(boundingCubeGeom);
   const wireframeMat = new THREE.LineBasicMaterial({color: 0x000000});
   const wireFrameWoDiagonals = new THREE.LineSegments(edges, wireframeMat);

   scene.add(boundingCube);
   scene.add(wireFrameWoDiagonals);
    
   /*   (Fat Polyhedra)
        Notes:
        - here i will be coding the functions for creating the fat polyhedra of different shapes and sizes
        - since im using three.js as my renderer, here are the docs ill be referencing:
            o docs: https://threejs.org/docs/#api/en/geometries/PolyhedronGeometry
        - for my polyhedra, im going to use the following shapes (these geometry objects are provided by three.js!)
            o TetrahedronGeometry (object provided by three.js)
            o OctahedronGeometry (object provided by three.js)
            o DodecahedronGeometry (object provided by three.js)
            o IcosahedronGeometry (object provided by three.js)
            o PolyhedronGeometry (the vertices and indices are provided in the doc page)
   */
    // this is an INCLUSIVE rand generator
    function generateRandomNumber(max) { return Math.floor(Math.random() * max); }
    function createRandPolyhedraGeom(size, complexity) {
        // size in three.js is equvalent to radius
        // complexity in three.js is equivalent to detail
        const polyhedraType = generateRandomNumber(5);
        
        // this is a geometry specfication provided by three.js docs! 
        // o reference: https://threejs.org/docs/#api/en/geometries/PolyhedronGeometry
        const verticesOfCube = [
            -1,-1,-1,    1,-1,-1,    1, 1,-1,    -1, 1,-1,
            -1,-1, 1,    1,-1, 1,    1, 1, 1,    -1, 1, 1,
        ];

        const indicesOfFaces = [
            2,1,0,    0,3,2,
            0,4,7,    7,3,0,
            0,1,5,    5,4,0,
            1,2,6,    6,5,1,
            2,3,7,    7,6,2,
            4,5,6,    6,7,4
        ];

        switch (polyhedraType) {
            case 0:
                return new THREE.TetrahedronGeometry(size, complexity);
            case 1:
                return new THREE.OctahedronGeometry(size, complexity);
            case 2:
                return new THREE.DodecahedronGeometry(size, complexity);
            case 3:
                return new THREE.IcosahedronGeometry(size, complexity);
            case 4: // not needed honestly but i included it for more variation
                return new THREE.PolyhedronGeometry(verticesOfCube, indicesOfFaces, size, complexity);
        }

    }

    // light colors for easy to look at polyhedra
    function createRandPolyhedraMat() {
        let r = Math.floor(Math.random() * 256);
        let g = Math.floor(Math.random() * 256);
        let b = Math.floor(Math.random() * 256);
        const randColor = `rgba(${r},${g},${b},0.5)`;
        return new THREE.MeshBasicMaterial({color: randColor});
    }

    // same as before, a custom wireframe since the diagonals are annoying
    function createMyCustomWireframe(polyGeom) {
        const polyEdges = new THREE.EdgesGeometry(polyGeom);
        const polyWireframeMat = new THREE.LineBasicMaterial({color: 'white'});
        return new THREE.LineSegments(polyEdges, polyWireframeMat);
    }

    // creates the main polyhedra Object3D object and the wireframe to add to the scene
    function createRandPolyhedra(size, complexity) {
        const polyGeom = createRandPolyhedraGeom(size, complexity);
        const poly = new THREE.Mesh(polyGeom, createRandPolyhedraMat());
        const polyWireFrameWoDiagonals = createMyCustomWireframe(polyGeom);
        return { polyhedron:poly, wireframe:polyWireFrameWoDiagonals };
    }

    // helper / wrapper function to make it easier for later when animating or rendering everything
    function addPolyhedraToScene(polyObj) {
        let { polyhedron, wireframe } = polyObj;
        scene.add(polyhedron);
        scene.add(wireframe);
    }

    // test 
    // addPolyhedraToScene(createRandPolyhedra(10, 2));

    /* (Spawning)
        Notes:
        - now that i have fat polyhedra objects and the confining bounding cube, i need to actually implement the
          collision detection between rigid bodies algorithm
        - but first i need to spawn the objects in the bounding cube
        - here are the docs im referencing for bounding box and detecting overlap for unique spawn positions:
            - docs: https://threejs.org/docs/#api/en/math/Box3 
    */

    // my helper functions for readability
    function getRandomNumberMinMax(min, max) { return Math.random() * (max - min) + min;}
    function getBoundingBox(obj) { return new THREE.Box3().setFromObject(obj); }
    function intersects(bbox1, bbox2) { return bbox1.intersectsBox(bbox2); }

    function getRandomPositionInBoundingCube(polySize) {
        let cubeBBox = getBoundingBox(boundingCube);
        // need to add polySize o/w spawns can occur with overlap
        let x = getRandomNumberMinMax(cubeBBox.min.x + polySize, cubeBBox.max.x);
        let y = getRandomNumberMinMax(cubeBBox.min.y + polySize, cubeBBox.max.y);
        let z = getRandomNumberMinMax(cubeBBox.min.z + polySize, cubeBBox.max.z);
        return new THREE.Vector3(x, y, z);
    }

    /*
        Notes: (my working idea for random generation of polyhedra)
            - my idea here is to keep spawning the polyhedron till it doesnt intersect with any other polyhedron objects
            - null will be returned if no matter how many times the polyhedron is spawned it still intersects something
            - null case can happen when the polyhedron is too big 
            - in that case, we must generate a polyhedron with a different size and complexity
            - repeat until we get numObjs in the scene!
    */
    function spawnPolyhedron(currObjsInScene, size, complexity) { // spawn since we only create once! just need to update position after
        let bboxInteresects = true;

        let currPolyObj;
        let boundingCubeBBox = getBoundingBox(boundingCube);
        let currPolyBBox;
        let attempts = 20;

        while (bboxInteresects && attempts > 0) {
            let position = getRandomPositionInBoundingCube(size);
            currPolyObj = createRandPolyhedra(size, complexity);

            currPolyObj.polyhedron.position.copy(position);
            currPolyObj.wireframe.position.copy(position);

            currPolyBBox = getBoundingBox(currPolyObj.polyhedron);;
            bboxInteresects = currObjsInScene.some(obj => intersects(currPolyBBox, getBoundingBox(obj.polyhedron)));

            let polyhedraFullyInCube = boundingCubeBBox.containsBox(currPolyBBox);
            bboxInteresects = bboxInteresects || !polyhedraFullyInCube;

            attempts--;
        }

        return !bboxInteresects ? currPolyObj : null;
    }   

    let currObjsInScene = [];

    // my custom polyhedron object to manage state for motion updates!
    class Polyhedron {
        constructor (polyObj, initVel, initAngVel) {
            this.polyhedron = polyObj.polyhedron;
            this.wireframe = polyObj.wireframe;
            this.bbox = getBoundingBox(this.polyhedron);

            this.polyhedron.geometry.computeBoundingSphere();
            this.refBoundingSphere = this.polyhedron.geometry.boundingSphere.clone();
            this.boundingSphere = this.refBoundingSphere.clone();
            
            this.position = this.polyhedron.position.clone();
            this.orientation = this.polyhedron.rotation.clone();

            let maxVel = initVel;
            let maxAngVel = initAngVel;
            let startingVel = getRandomNumberMinMax(10, maxVel);
            let startingAngVel = getRandomNumberMinMax(1, maxAngVel);

            let randDir = new THREE.Vector3().randomDirection();
            this.velocity = new THREE.Vector3(startingVel * randDir.x,startingVel * randDir.y,startingVel * randDir.z);
            this.angularVelocity = new THREE.Vector3(startingAngVel,startingAngVel,startingAngVel);
        }

        updateBoundingSphere() {
            this.boundingSphere.center.copy(this.position).add(this.refBoundingSphere.center);
        }

        calculateBBox() {
            this.bbox = getBoundingBox(this.polyhedron);
        }

        setVelocity(velocity) {
            this.velocity.copy(velocity);
        }

        setAngularVelocity(angularVelocity) {
            this.angularVelocity.copy(angularVelocity);
        }

        setPosition(position) {
            this.position.copy(position);
            this.polyhedron.position.copy(position);
            this.wireframe.position.copy(position);
            this.updateBoundingSphere();
        }

        updatePosition(dt) {
            this.position.add(this.velocity.clone().multiplyScalar(dt)); // x + x_dot * dt
            this.polyhedron.position.copy(this.position); // x = x + x_dot * dt
            this.wireframe.position.copy(this.position);
            this.updateBoundingSphere();
        }

        updateOrientation(dt) {
            let step = this.angularVelocity.clone().multiplyScalar(dt);
            this.orientation.x += step.x;
            this.orientation.y += step.y;
            this.orientation.z += step.z;
            this.polyhedron.rotation.copy(this.orientation); // orientation = orientation + angVel * dt
            this.wireframe.rotation.copy(this.orientation);
        }

        update(dt) {
            this.updatePosition(dt);
            this.updateOrientation(dt);
        }
    }

    // these are max numbers, but too lazy to change variable names everywhere since i realized wayyy to late that 
    // EACH object needs to get a random velocity :|
    let {initVelocity, initAngularVelocity} = window.getUIState()['uniform-size-settings'];
    function spawnPolyhedraInBoundingCube(numObjs, size, complexity) {
        let attempts = 10; // note to self: i think this enough, revisit during analysis
        for (let i = 0; i < numObjs; i++) {
            let valid = false;
            while (!valid && attempts > 0) {
                let polyObj = spawnPolyhedron(
                    currObjsInScene, 
                    size,
                    complexity,
                );

                if (polyObj) {
                    addPolyhedraToScene(polyObj);
                    currObjsInScene.push(new Polyhedron(polyObj, initVelocity, initAngularVelocity));
                    valid = true;
                    continue
                }

                attempts--;
            }
            attempts = 10;
        }
    }

    /* (Motion of Polyhedra)
        Notes:
        - now that i have spawned in the fat polyhedra inside the confining cube, i need to simulate their motion
        - since assignment descirption says to keep the velocity the same UNLESS the object hits the obstacle,
          I assume that we won't be accounting for gravity
        - state vector is probably -> (x, x_dot, theta, theta_dot) ~ (position, velocity, orientation, angular velocity)
        - ill use euler method with dt=0.02 
    */
    function updatePolyhedraPosition(dt) {
        currObjsInScene.forEach(obj => { obj.update(dt); });
    }

    /* (Collision Response)
        Notes:
        - the code in this section is resp for handling the flipping of velocity behavior
        - iow => collision response ~ flipping velocity
    */

    // very basic flip all components approach ~ only used for AABB
    // more sophisticated approaches later
    function respondToCollision(obj) {
        let currVelocity = obj.velocity.clone();
        let flippedVelocity = currVelocity.multiplyScalar(-1);
        obj.setVelocity(flippedVelocity);
        obj.calculateBBox();
    }

    let boundingCubeBBox = getBoundingBox(boundingCube);
    function getBoundingCubeBounds() {
        let minx = boundingCubeBBox.min.x;
        let maxx = boundingCubeBBox.max.x;
        let miny = boundingCubeBBox.min.y;
        let maxy = boundingCubeBBox.max.y;
        let minz = boundingCubeBBox.min.z;
        let maxz = boundingCubeBBox.max.z;
        return {minx, maxx, miny, maxy, minz, maxz};
    }

    // idea: bounding spheres will stick outside the walls during a collision
    // simply just push em back by the amount they stick out
    function respondToWallCollision(obj) {
        let bs = obj.boundingSphere;
        let c = bs.center.clone();
        let r = R;
        let {minx, maxx, miny, maxy, minz, maxz} = getBoundingCubeBounds();
        
        let bs_dist_x_min = c.x - r;
        let bs_dist_x_max = c.x + r;
        let bs_dist_y_min = c.y - r;
        let bs_dist_y_max = c.y + r;
        let bs_dist_z_min = c.z - r;
        let bs_dist_z_max = c.z + r;

        let newPos = obj.position.clone();
        let newVel = obj.velocity.clone();

        // note to self: use geogebra to help viz this!!
        if (bs_dist_x_min < minx) { // this means along x axis, the polyhedra is sticking out the front wall
            let depth = minx - bs_dist_x_min;
            newPos.x += depth; // we need to push the object to the inside so forward into the cube
            newVel.x *= -1; // flip x comp of velocity
        } else if (bs_dist_x_max > maxx) { // the polyhedra is sticking out the back wall i think
            let depth = bs_dist_x_max - maxx; 
            newPos.x -= depth;
            newVel.x *= -1;
        }

        if (bs_dist_y_min < miny) { // the polyhedra is sticking out the left wall 
            let depth = miny - bs_dist_y_min;
            newPos.y += depth;
            newVel.y *= -1;
        } else if (bs_dist_y_max > maxy) { // the polyhedra is sticking out the right wall 
            let depth = bs_dist_y_max - maxy;
            newPos.y -= depth;
            newVel.y *= -1;
        }

        if (bs_dist_z_min < minz) { // the polyhedra is sticking out the top wall 
            let depth = minz - bs_dist_z_min;
            newPos.z += depth;
            newVel.z *= -1;
        } else if (bs_dist_z_max > maxz) { // the polyhedra is sticking out the bottom wall
            let depth = bs_dist_z_max - maxz;
            newPos.z -= depth;
            newVel.z *= -1;
        }

        obj.setPosition(newPos);
        obj.setVelocity(newVel);
    }

    function respondToCollisionObj2Obj(obj1, obj2) {
        let bs1 = obj1.boundingSphere;
        let bs2 = obj2.boundingSphere;
        let c1 = bs1.center.clone();
        let c2 = bs2.center.clone();

        let centerDiff = new THREE.Vector3().subVectors(c2, c1);
        let dist = centerDiff.clone().length();
        let normal = centerDiff.clone().normalize();

        let depth = 2*R - dist; // essentially how much one object penetrates the other, using sphere so its pretty simple!
        if (depth > 0) { // before this i noticed overlap cases occuring, but we push back ONLY when there is penetration
            let pushBackBy = normal.clone().multiplyScalar(depth / 2);
            obj2.setPosition(obj2.position.clone().add(pushBackBy));
            obj1.setPosition(obj1.position.clone().sub(pushBackBy));
        }

        // derivation for this is in my report!
        let v_21 = new THREE.Vector3().subVectors(obj2.velocity.clone(), obj1.velocity.clone());
        let v_21_dot_normal = v_21.dot(normal);
        let update = normal.clone().multiplyScalar(-v_21_dot_normal);
        obj2.setVelocity( obj2.velocity.clone().add(update) );
        obj1.setVelocity( obj1.velocity.clone().sub(update) );
    }

    /* (Collision Detection)
        Notes:
        - here is where i implement a collision detection algorithm to detect polyhedra collision with an obstacle
        - obstacle types i need to account for:
          o confining cube
          o other polyhedra
        - ill be using the collision detection with BVH with bounding volume, im also doing brute force in case i
          have a hard time debugging my BVH implementation
    */
    function intersectsSphere(bs1, bs2) {
        const dist = bs1.center.distanceTo(bs2.center);
        return dist < (bs1.radius + bs2.radius); // ||c2-c1|| < r1 + r2
    }

    function isSphereInCube(bs) {
        let {minx, maxx, miny, maxy, minz, maxz} = getBoundingCubeBounds();
        return bs.center.x - R > minx && bs.center.y - R > miny && bs.center.z - R > minz &&
               bs.center.x + R < maxx && bs.center.y + R < maxy && bs.center.z + R < maxz;
    }

    function bfDetectCollisionsSphere() {
        for (let obj1 of currObjsInScene) {
            let collision = false;
            let bs1 = obj1.boundingSphere;
            let collidedObj = null;

            for (let obj2 of currObjsInScene) {
                if (obj1 === obj2) continue;
                let bs2 = obj2.boundingSphere;
                if (intersectsSphere(bs1, bs2)) {
                    collision = true;
                    collidedObj = obj2;
                    break;
                }
            }

            if (!isSphereInCube(bs1)) respondToWallCollision(obj1);
            if (collidedObj) respondToCollisionObj2Obj(obj1, collidedObj);
        }
    }

    function bfDetectCollisionsAABB() {
        currObjsInScene.forEach(obj => { obj.calculateBBox(); });
        for (let obj1 of currObjsInScene) {
            let collision = false;
            obj1.calculateBBox();
            for (let obj2 of currObjsInScene) {
                if (obj1 === obj2) continue;
                obj2.calculateBBox();
                if (intersects(obj1.bbox, obj2.bbox)) {
                    collision = true;
                    break;
                }
            }
            if (collision) respondToCollision(obj1);
            if (!boundingCubeBBox.containsBox(obj1.bbox)) respondToWallCollision(obj1);
        }
    }


    /* (Collision Detection)
        Notes:
        - this is all the BVH stuff
    */

    // all i need is midpoint, but i used this when i was testing out > 2 objects
    // so im just keeping it here in case i want to do some analysis for the report
    function centroid(pts) {
        let centroid_of_pts = new THREE.Vector3(0,0,0);
        pts.forEach(pt => centroid_of_pts.add(pt));
        return centroid_of_pts.divideScalar(pts.length);
    }

    class BVHNode {
        constructor(objs) {
            this.left = null;
            this.right = null;
            this.objs = objs;
            this.bs = new THREE.Sphere();
            this.isLeaf = this.objs && this.objs.length <= 2; // leaf has at most 2 objects
            if (this.isLeaf) this.unionBoundingSpheres();
        }

        unionBoundingSpheres() { // merge the bounding spheres of the objects in the node
            if (this.objs.length == 1) {
                let refBs = this.objs[0].boundingSphere;
                this.bs.center.copy(refBs.center);
                this.bs.radius = R;
            } else {
                let bs1 = this.objs[0].boundingSphere;
                let bs2 = this.objs[1].boundingSphere;
                let c = centroid([bs1.center, bs2.center]);
                this.bs.center = c;
                this.bs.radius = Math.max(c.distanceTo(bs1.center) + R,  c.distanceTo(bs2.center) + R);
            }
        }
    }

    function buildBVH(currObjs) {
        // base case - at most two leaves
        if (currObjs.length <= 2) return new BVHNode(currObjs);

        // i need to divide the objects in a smart way, sort by z axis and then split in the middle
        // in report mention how i could have split mong most spread out axis 
        // ^ i ran out of time to debug this thoroughly so not including it in final revision
        // note to self: after deadline, try and see if we can split in a way to optimize this further
        currObjs.sort((a,b) => {
            let bsA = a.boundingSphere;
            let bsB = b.boundingSphere;
            return bsA.center.z-bsB.center.z
        });

        let mid = Math.floor(currObjs.length / 2);
        let leftObjs = currObjs.slice(0,mid);
        let rightObjs = currObjs.slice(mid);

        const node = new BVHNode();
        node.isLeaf = false;
        node.left = buildBVH(leftObjs);
        node.right = buildBVH(rightObjs);

        // each node needs to compute its bounding sphere which consists of combining the 
        // bounding spheres of the left and right nodes
        if (node.left && node.right) {
            let {c, r} = getCenterAndRadius(node);
            node.bs = new THREE.Sphere(c, r);
        } else if (node.left) {
            node.bs = node.left.bs; // idt i need to clone here, ref should be fine??
        } else if (node.right) {
            node.bs = node.right.bs; 
        }

        return node;
    }

    function getCenterAndRadius(node) {
        let leftBs = node.left.bs;
        let rightBs = node.right.bs;
        
        let c_left = leftBs.center;
        let c_right = rightBs.center;

        let c = centroid([c_left, c_right]);
        // r = max( ||c-c_left|| + R, ||c-c_right|| + R )
        let r = Math.max(c.distanceTo(c_left) + R,  c.distanceTo(c_right) + R); 
        return {c, r};
    }   

    // this function uses the BVH to detect any potential collisions
    function BVHDetectCollisionsHelper(node) {
        if (node.isLeaf) { // leaf case
            for (let a of node.objs) {
                for (let b of node.objs) {
                    if (intersectsSphere(a.boundingSphere, b.boundingSphere)) respondToCollisionObj2Obj(a, b);
                }
                if (!isSphereInCube(a.boundingSphere)) respondToWallCollision(a);
            }
        } 
        else { // general case
            BVHDetectCollisionsHelper(node.left);
            BVHDetectCollisionsHelper(node.right);
            BVHDetectCollisionsHelperAcrossLeftRight(node.left, node.right);
        }
    }

    // collisions within children of a node can occur, or ACCROSS the children
    // think of closest pair of points algo!
    function BVHDetectCollisionsHelperAcrossLeftRight(node_a, node_b) {
        // proceed only if collision occurs between the bounding spheres of the subsets of objects
        if ((!node_a || !node_b) || !intersectsSphere(node_a.bs, node_b.bs)) return; // no collision
        if (node_a.isLeaf && node_b.isLeaf) {
            for (let a of node_a.objs) {
                for (let b of node_b.objs) {
                    if (intersectsSphere(a.boundingSphere, b.boundingSphere)) respondToCollisionObj2Obj(a, b);
                }
            }      
        } else if (node_a.isLeaf) {
            BVHDetectCollisionsHelperAcrossLeftRight(node_a, node_b.left);
            BVHDetectCollisionsHelperAcrossLeftRight(node_a, node_b.right);
        } else if (node_b.isLeaf) {
            BVHDetectCollisionsHelperAcrossLeftRight(node_b, node_a.left);
            BVHDetectCollisionsHelperAcrossLeftRight(node_b, node_a.right);
        } else {
            BVHDetectCollisionsHelperAcrossLeftRight(node_a.left, node_b.left);
            BVHDetectCollisionsHelperAcrossLeftRight(node_a.left, node_b.right);
            BVHDetectCollisionsHelperAcrossLeftRight(node_a.right, node_b.left);
            BVHDetectCollisionsHelperAcrossLeftRight(node_a.right, node_b.right);
        }
    }

    // helper wrapper in case i need to add mor info later
    function BVHDetectCollisions(root) {
        BVHDetectCollisionsHelper(root);
    }

    /* (Button Events)
        Notes:
        - any button actions go here
        - buttons i have in mind are:
          o play button
          o add polyhedron objects button
          o randomize velocities button
        - maye randomize params as well? 
        - note to self: think about this later, perhaps for the three datasets in analysis?
    */
    let isPlaying = false;
    let playBtn = document.getElementById('uniform-size-play-btn'); 
    let uniformSizeSizeInput = document.getElementById('uniform-size-size');
    let root;

    playBtn.addEventListener('click', () => {
        isPlaying = !isPlaying;
        // my QOL improvement to the play button!!
        if (isPlaying) {

            // playing, but icon is the pause icon???
            playBtn.querySelector('svg').innerHTML = `<path fill="white" d="M16 19q-.825 0-1.412-.587T14 17V7q0-.825.588-1.412T16 5t1.413.588T18 7v10q0 .825-.587 1.413T16 19m-8 0q-.825 0-1.412-.587T6 17V7q0-.825.588-1.412T8 5t1.413.588T10 7v10q0 .825-.587 1.413T8 19"/>`
            let {numObjects, size, complexity} = window.getUIState()['uniform-size-settings'];
            if (currObjsInScene.length === 0) {
                R = size;
                spawnPolyhedraInBoundingCube(numObjects, R, complexity);
                root = buildBVH(currObjsInScene);
            } else if (currObjsInScene.length != numObjects) {
                uniformSizeSizeInput.value = R;
                spawnPolyhedraInBoundingCube(numObjects - currObjsInScene.length, R, complexity);
                root = buildBVH(currObjsInScene);
            }
        } else {
            // not playing, but icon is the play icon?
            playBtn.querySelector('svg').innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />`
        }
    });
    

    // randomizes the velocities and angular velocities of the polyhedra objects
    // not really needed for the assignment, but included it for debugging and it looks 
    // super cool!!
    let randomizeVelBtn = document.getElementById('uniform-size-randomize-vel-btn');
    randomizeVelBtn.addEventListener('click', () => {
        let {initVelocity, initAngularVelocity} = window.getUIState()['uniform-size-settings'];
        currObjsInScene.forEach(obj => {
            let maxVel = initVelocity;
            let maxAngVel = initAngularVelocity;
            let startingVel = getRandomNumberMinMax(10, maxVel);
            let startingAngVel = getRandomNumberMinMax(1, maxAngVel);
            let randDir = new THREE.Vector3().randomDirection();
            obj.setVelocity(new THREE.Vector3(startingVel * randDir.x,startingVel * randDir.y,startingVel * randDir.z));
            obj.setAngularVelocity(new THREE.Vector3(startingAngVel,startingAngVel,startingAngVel));
        });
    });

    const bvhBtn = document.querySelector('#uniform-size-bvh-btn');
    const bfBtn = document.querySelector('#uniform-size-brute-force-btn');
    const bvSphereBtn = document.querySelector('#uniform-size-sphere-btn');
    const bvAABBBtn = document.querySelector('#uniform-size-aabb-btn');
    
    bvhBtn.addEventListener('click', () => {
        bvhBtn.classList.add('uniform-active-algo-type');
        bfBtn.classList.remove('uniform-active-algo-type');
        bvAABBBtn.classList.remove('uniform-active-bv-type');
        bvSphereBtn.classList.add('uniform-active-bv-type');
    });

    bfBtn.addEventListener('click', () => {
        bfBtn.classList.add('uniform-active-algo-type');
        bvhBtn.classList.remove('uniform-active-algo-type');
    });

    bvSphereBtn.addEventListener('click', () => {
        bvSphereBtn.classList.add('uniform-active-bv-type');
        bvAABBBtn.classList.remove('uniform-active-bv-type');
    });

    bvAABBBtn.addEventListener('click', () => {
        bvAABBBtn.classList.add('uniform-active-bv-type');
        bvSphereBtn.classList.remove('uniform-active-bv-type');
        bfBtn.classList.add('uniform-active-algo-type');
        bvhBtn.classList.remove('uniform-active-algo-type');
    });

    bvSphereBtn.addEventListener('click', () => {
        bvSphereBtn.classList.add('uniform-active-bv-type');
        bvAABBBtn.classList.remove('uniform-active-bv-type');
    });

    bvAABBBtn.addEventListener('click', () => {
        bvAABBBtn.classList.add('uniform-active-bv-type');
        bvSphereBtn.classList.remove('uniform-active-bv-type');
        bfBtn.classList.add('uniform-active-algo-type');
        bvhBtn.classList.remove('uniform-active-algo-type');
    });

    /* (Animation Loop)
        Notes:
        - should just be a position update for motion since externeal forces arent required i think
        - also collision detection and response
        - router logic for the algorithm and bounding volume
    */
    let dt = 0.02;
    function animate() {
        requestAnimationFrame(animate);
        if (isPlaying) {
            let {algoType, bvType} = window.getUIState()['uniform-size-settings'];
            if (algoType === 'bvh') {
                root = buildBVH(currObjsInScene);
                BVHDetectCollisions(root);
            } else {
                if (bvType === 'sphere') bfDetectCollisionsSphere();
                else bfDetectCollisionsAABB();
            }
            updatePolyhedraPosition(dt);
            
        };
        renderer.render(scene, camera);
    }
    animate();
}
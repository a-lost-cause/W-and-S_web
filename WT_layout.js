 

// --- 1. SCENE, CAMERA, RENDERER SETUP ---
        const container = document.getElementById('canvas-container');
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog = new THREE.FogExp2(0x87CEEB, 0.0001);

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 3000);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // --- 2. LIGHTING (DAYTIME) ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xfffaf0, 1.2);
        sunLight.position.set(300, 400, 200);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048*2;
        sunLight.shadow.mapSize.height = 2048*2;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 1200;
        const d = 150;
        sunLight.shadow.camera.left = -d;
        sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d;
        sunLight.shadow.camera.bottom = -d;
        sunLight.shadow.bias = -0.0005;
        scene.add(sunLight);

        // --- Background Hills using Gaussian Peaks ---
        const hillsGeo = new THREE.PlaneGeometry(6000, 1500, 64, 64);
        hillsGeo.rotateX(-Math.PI / 2);
        const hillsPosAttr = hillsGeo.attributes.position;
        
        function makeHill(nx, nz, xCenter, zCenter, height, radius) { return height * Math.exp(- (Math.pow(nx - xCenter, 2) + Math.pow(nz - zCenter, 2)) / radius); }

        for (let i = 0; i < hillsPosAttr.count; i++) {
            let x = hillsPosAttr.getX(i);
            let z = hillsPosAttr.getZ(i);
            
            let nx = x / 400;
            let nz = z / 400;

            let hillHeight = (
                makeHill(nx, nz, 0, 0, 500, 1)
                + makeHill(nx, nz, -2, -2, 500, 1)
                + makeHill(nx, nz, -3, 0, 200, 1)
                + makeHill(nx, nz, 2.5, 0, 300, 1)
            );
            hillsPosAttr.setY(i, Math.max(0, hillHeight)); 
        }
        hillsGeo.computeVertexNormals();
        
        const hillsMat = new THREE.MeshStandardMaterial({ color: 0x5b7c45, roughness: 0.9, flatShading: true, side: THREE.DoubleSide });
        const hills = new THREE.Mesh(hillsGeo, hillsMat);
        hills.position.set(-500, -10, -1500);
        hills.rotation.y = Math.PI / 4;
        scene.add(hills);

        // --- Multiple Trees Cluster ---
        function createTree(x, z) {
            const treeGroup = new THREE.Group();
            
            const trunkGeo = new THREE.CylinderGeometry(0.8, 1.2, 7, 6);
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 3.5;
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            treeGroup.add(trunk);

            const foliageMat = new THREE.MeshStandardMaterial({ color: 0x3b5e2b, roughness: 0.8, flatShading: true });
            
            const foliage1 = new THREE.Mesh(new THREE.ConeGeometry(5, 8, 5), foliageMat);
            foliage1.position.y = 8;
            foliage1.castShadow = true;
            treeGroup.add(foliage1);

            const foliage2 = new THREE.Mesh(new THREE.ConeGeometry(4, 7, 5), foliageMat);
            foliage2.position.y = 12;
            foliage2.castShadow = true;
            treeGroup.add(foliage2);

            treeGroup.position.set(x, 0, z);
            scene.add(treeGroup);
        }

        const treePositions = [
            [50, 160],
            [-60, 140],
            [75, 210],
            [-55, 230],
            [35, 90],
            [-45, 100]
        ];

        treePositions.forEach(pos => createTree(pos[0], pos[1]));

        // Access Road
        const roadGeo = new THREE.PlaneGeometry(20, 1000);
        roadGeo.rotateX(-Math.PI / 2);
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x9C8470, roughness: 0.85 });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.position.set(15, 1.5, 250);
        road.receiveShadow = true;
        scene.add(road);

        // --- 3. ENVIRONMENT (GROUND & HORIZON) ---
        const groundGeo = new THREE.PlaneGeometry(3000*2, 3000*2, 64*2, 64*2);
        groundGeo.rotateX(-Math.PI / 2);
        const posAttr = groundGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const z = posAttr.getZ(i);
            if (Math.abs(x) > 50 || Math.abs(z) > 50) {
                posAttr.setY(i, Math.sin(x * 0.5) * Math.cos(z * 0.05) * 4);
            }
        }
        groundGeo.computeVertexNormals();

        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x4a7c36,
            roughness: 0.9,
            metalness: 0.15,
            flatShading: true
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.receiveShadow = true;
        scene.add(ground);

        // Concrete foundation pad
        const padGeo = new THREE.CylinderGeometry(8, 9, 2, 32);
        const padMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.6 });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.y = 1;
        pad.receiveShadow = true;
        scene.add(pad);

        // --- 4. PROCEDURAL 45M BLADE GENERATOR ---
        function createWindBlade45m(material) {
            const bladeLength = 45;
            const segments = 45;
            
            const baseAirfoilPoints = [
                new THREE.Vector2(0.0, 0.0),
                new THREE.Vector2(0.1, 0.15),
                new THREE.Vector2(0.3, 0.25),
                new THREE.Vector2(0.7, 0.1),
                new THREE.Vector2(1.0, 0.0),
                new THREE.Vector2(0.7, -0.1),
                new THREE.Vector2(0.3, -0.25),
                new THREE.Vector2(0.1, -0.15)
            ];

            const stripGeometries = [];

            for (let i = 0; i < segments; i++) {
                const t1 = i / segments;
                const t2 = (i + 1) / segments;

                const y1 = t1 * bladeLength;
                const y2 = t2 * bladeLength;

                const chord1 = THREE.MathUtils.lerp(3.2, 0.45, t1);
                const chord2 = THREE.MathUtils.lerp(3.2, 0.45, t2);

                const twist1 = THREE.MathUtils.lerp(22, 0, t1) * (Math.PI / 180);
                const twist2 = THREE.MathUtils.lerp(22, 0, t2) * (Math.PI / 180);

                const ring1 = createAirfoilSlice(baseAirfoilPoints, chord1, twist1, y1);
                const ring2 = createAirfoilSlice(baseAirfoilPoints, chord2, twist2, y2);

                const stripGeom = createLoftSegment(ring1, ring2);
                stripGeometries.push(stripGeom);
            }

            const combinedGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(stripGeometries);
            const bladeMesh = new THREE.Mesh(combinedGeometry, material);
            bladeMesh.castShadow = true;
            bladeMesh.receiveShadow = true;
            return bladeMesh;
        }

        function createAirfoilSlice(profilePoints, chord, twistAngle, yPos) {
            const points = [];
            const cos = Math.cos(twistAngle);
            const sin = Math.sin(twistAngle);

            for (let pt of profilePoints) {
                const scaledX = (pt.x - 0.3) * chord;
                const scaledZ = pt.y * chord;

                const rotX = scaledX * cos - scaledZ * sin;
                const rotZ = scaledX * sin + scaledZ * cos;

                points.push(new THREE.Vector3(rotX, yPos, rotZ));
            }
            return points;
        }

        function createLoftSegment(ringA, ringB) {
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const indices = [];
            const numPoints = ringA.length;

            for (let i = 0; i < numPoints; i++) {
                vertices.push(ringA[i].x, ringA[i].y, ringA[i].z);
                vertices.push(ringB[i].x, ringB[i].y, ringB[i].z);
            }

            for (let i = 0; i < numPoints; i++) {
                const next = (i + 1) % numPoints;
                const a = i * 2;
                const b = next * 2;
                const c = i * 2 + 1;
                const d = next * 2 + 1;

                indices.push(a, c, b);
                indices.push(b, c, d);
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();
            return geometry;
        }

        // --- 5. BUILD WIND TURBINE ASSEMBLY ---
        const turbineGroup = new THREE.Group();
        turbineGroup.position.set(0, 0, 0);

        const towerGeo = new THREE.CylinderGeometry(2.0, 3.5, 75, 32);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0xefefef, roughness: 0.4 });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.y = 37.5;
        tower.castShadow = true;
        tower.receiveShadow = true;
        turbineGroup.add(tower);

        const nacelleGroup = new THREE.Group();
        nacelleGroup.position.y = 75;
        
        const mainBodyGeo = new THREE.BoxGeometry(4.6, 3.8, 8);
        const nacelleMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.3 });
        const mainBody = new THREE.Mesh(mainBodyGeo, nacelleMat);
        mainBody.position.z = -1.5;
        mainBody.castShadow = true;
        mainBody.receiveShadow = true;
        nacelleGroup.add(mainBody);

        const noseConeGeo = new THREE.ConeGeometry(1.8, 4, 32);
        noseConeGeo.rotateX(Math.PI / 2);
        const noseCone = new THREE.Mesh(noseConeGeo, nacelleMat);
        noseCone.position.z = 3.2;
        noseCone.castShadow = true; 
        nacelleGroup.add(noseCone);

        const rotorGroup = new THREE.Group();
        rotorGroup.position.set(0, 0, 3.5);

        const hubGeo = new THREE.SphereGeometry(2.2, 32, 32);
        const hub = new THREE.Mesh(hubGeo, nacelleMat);
        hub.castShadow = true;
        rotorGroup.add(hub);

        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: 0xfcfcfc,
            roughness: 0.2,
            metalness: 0.1,
            side: THREE.DoubleSide });

        for (let i = 0; i < 3; i++) {
            const bladeHolder = new THREE.Group();
            bladeHolder.rotation.z = (i * Math.PI * 2) / 3;

            const blade = createWindBlade45m(bladeMaterial);
            blade.position.y = 2.0;
            bladeHolder.add(blade);
            rotorGroup.add(bladeHolder);
        }

        nacelleGroup.add(rotorGroup);
        turbineGroup.add(nacelleGroup);
        scene.add(turbineGroup);

        // --- 6. CAMERA VIEWS SETUP ---
        const hubTarget = new THREE.Vector3(0, 75, 3.5);
        
        const cameraViews = {
            A: { pos: new THREE.Vector3(0, 2, -500), lookAt: hubTarget }, // A-Crosswind
            B: { pos: new THREE.Vector3(500, 2, 0), lookAt: hubTarget }, // B-Downwind
            C: { pos: new THREE.Vector3(0, 2, 500), lookAt: hubTarget }  // C-Upwind
        };

        let currentCamView = 'A';        
        const camTargetPos = cameraViews.A.pos.clone();
        const camCurrentLookAt = cameraViews.A.lookAt.clone();
        const camTargetLookAt = cameraViews.A.lookAt.clone();

        camera.position.copy(cameraViews.A.pos);
        camera.lookAt(cameraViews.A.lookAt);

 
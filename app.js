// Voxel Ecosystem - Three.js Isometric Simulator
// ===============================================

// Entity Types
const EntityType = {
    EMPTY: 0,
    PLANT: 1,
    HERBIVORE: 2,
    CARNIVORE: 3,
    DECOMPOSER: 4,
    DEAD_MATTER: 5
};

// Entity class
class Entity {
    constructor(type, x, y, z) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.z = z;
        this.energy = this.getInitialEnergy();
        this.age = 0;
        this.maxAge = this.getMaxAge();
        this.mesh = null;
    }
    
    getInitialEnergy() {
        switch (this.type) {
            case EntityType.PLANT: return 50 + Math.random() * 30;
            case EntityType.HERBIVORE: return 70 + Math.random() * 40;
            case EntityType.CARNIVORE: return 100 + Math.random() * 50;
            case EntityType.DECOMPOSER: return 40 + Math.random() * 20;
            case EntityType.DEAD_MATTER: return 30 + Math.random() * 20;
            default: return 0;
        }
    }
    
    getMaxAge() {
        switch (this.type) {
            case EntityType.PLANT: return 80 + Math.random() * 40;
            case EntityType.HERBIVORE: return 60 + Math.random() * 30;
            case EntityType.CARNIVORE: return 50 + Math.random() * 25;
            case EntityType.DECOMPOSER: return 100 + Math.random() * 50;
            case EntityType.DEAD_MATTER: return 20 + Math.random() * 10;
            default: return 0;
        }
    }
}

// Main Three.js Ecosystem World
class EcosystemWorld {
    constructor(container) {
        this.container = container;
        
        // World settings
        this.gridSize = 8;
        this.heightLayers = 4;
        this.cellSize = 1;
        
        // Simulation
        this.grid = [];
        this.generation = 0;
        this.isRunning = false;
        this.lastUpdate = 0;
        this.updateInterval = 150;
        
        // Atmosphere
        this.atmosphere = {
            o2: 50,
            co2: 50,
            sunlight: 5
        };
        
        // Population counts
        this.populations = {
            plants: 0,
            herbivores: 0,
            carnivores: 0,
            decomposers: 0,
            deadMatter: 0
        };
        
        // Densities
        this.densities = {
            plants: 0.15,
            herbivores: 0.05,
            carnivores: 0.02,
            decomposers: 0.03
        };
        
        // Three.js
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.entityMeshes = new Map();
        this.gridMesh = null;
        this.platformMesh = null;
        
        // Colors - Into the Breach style
        this.colors = {
            background: 0xe8e4dc,
            platform: 0xd8d4cc,
            platformSide: 0xb8b4ac,
            gridLine: 0x2a2a2a,
            accent: 0xe87f38,
            
            [EntityType.PLANT]: {
                top: 0x6b8e6b,
                side: 0x4a7c4e,
                dark: 0x3a5c3e
            },
            [EntityType.HERBIVORE]: {
                top: 0x6a8aaa,
                side: 0x4a6b8a,
                dark: 0x3a5b7a
            },
            [EntityType.CARNIVORE]: {
                top: 0xaa6a6a,
                side: 0x8a4a4a,
                dark: 0x7a3a3a
            },
            [EntityType.DECOMPOSER]: {
                top: 0xaa9a6a,
                side: 0x8a7a4a,
                dark: 0x7a6a3a
            },
            [EntityType.DEAD_MATTER]: {
                top: 0x8a8a8a,
                side: 0x6a6a6a,
                dark: 0x5a5a5a
            }
        };
        
        this.init();
    }
    
    init() {
        this.setupThreeJS();
        this.createPlatform();
        this.createGridLines();
        this.initGrid();
        this.animate();
        
        window.addEventListener('resize', () => this.onResize());
    }
    
    setupThreeJS() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.colors.background);
        
        // Isometric camera (orthographic)
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const viewSize = 12;
        this.camera = new THREE.OrthographicCamera(
            -viewSize * aspect / 2,
            viewSize * aspect / 2,
            viewSize / 2,
            -viewSize / 2,
            0.1,
            1000
        );
        
        // Isometric angle
        const distance = 20;
        this.camera.position.set(distance, distance * 0.8, distance);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 10, 5);
        this.scene.add(directionalLight);
    }
    
    createPlatform() {
        const size = this.gridSize * this.cellSize;
        const height = 0.5;
        
        // Platform group
        this.platformGroup = new THREE.Group();
        
        // Top face
        const topGeometry = new THREE.PlaneGeometry(size, size);
        const topMaterial = new THREE.MeshBasicMaterial({ 
            color: this.colors.platform,
            side: THREE.DoubleSide
        });
        const topMesh = new THREE.Mesh(topGeometry, topMaterial);
        topMesh.rotation.x = -Math.PI / 2;
        topMesh.position.y = 0;
        this.platformGroup.add(topMesh);
        
        // Side faces (box for depth)
        const sideGeometry = new THREE.BoxGeometry(size, height * 3, size);
        const sideMaterials = [
            new THREE.MeshBasicMaterial({ color: this.colors.platformSide }), // right
            new THREE.MeshBasicMaterial({ color: this.colors.platformSide }), // left
            new THREE.MeshBasicMaterial({ color: this.colors.platform }), // top
            new THREE.MeshBasicMaterial({ color: 0x888888 }), // bottom
            new THREE.MeshBasicMaterial({ color: this.colors.platformSide }), // front
            new THREE.MeshBasicMaterial({ color: this.colors.platformSide })  // back
        ];
        const sideMesh = new THREE.Mesh(sideGeometry, sideMaterials);
        sideMesh.position.y = -height * 1.5;
        this.platformGroup.add(sideMesh);
        
        // Edge lines for the platform
        const edgeGeometry = new THREE.EdgesGeometry(sideGeometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: this.colors.gridLine, linewidth: 1 });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        edges.position.y = -height * 1.5;
        this.platformGroup.add(edges);
        
        this.scene.add(this.platformGroup);
    }
    
    createGridLines() {
        const size = this.gridSize * this.cellSize;
        const halfSize = size / 2;
        
        const material = new THREE.LineBasicMaterial({ 
            color: this.colors.gridLine,
            transparent: true,
            opacity: 0.3
        });
        
        const points = [];
        
        // Vertical lines (along Z)
        for (let i = 0; i <= this.gridSize; i++) {
            const x = -halfSize + i * this.cellSize;
            points.push(new THREE.Vector3(x, 0.01, -halfSize));
            points.push(new THREE.Vector3(x, 0.01, halfSize));
        }
        
        // Horizontal lines (along X)
        for (let i = 0; i <= this.gridSize; i++) {
            const z = -halfSize + i * this.cellSize;
            points.push(new THREE.Vector3(-halfSize, 0.01, z));
            points.push(new THREE.Vector3(halfSize, 0.01, z));
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.gridMesh = new THREE.LineSegments(geometry, material);
        this.scene.add(this.gridMesh);
    }
    
    initGrid() {
        this.grid = [];
        
        for (let z = 0; z < this.heightLayers; z++) {
            this.grid[z] = [];
            for (let y = 0; y < this.gridSize; y++) {
                this.grid[z][y] = [];
                for (let x = 0; x < this.gridSize; x++) {
                    this.grid[z][y][x] = null;
                }
            }
        }
        
        this.generation = 0;
        this.updateStats();
    }
    
    // Create a stylized cube mesh for an entity
    createEntityMesh(entity) {
        const colors = this.colors[entity.type];
        if (!colors) return null;
        
        const size = this.cellSize * 0.85;
        const group = new THREE.Group();
        
        // Main cube with custom face colors
        const geometry = new THREE.BoxGeometry(size, size, size);
        
        // Create materials for each face
        const materials = [
            new THREE.MeshBasicMaterial({ color: colors.side }), // right
            new THREE.MeshBasicMaterial({ color: colors.dark }), // left
            new THREE.MeshBasicMaterial({ color: colors.top }), // top
            new THREE.MeshBasicMaterial({ color: colors.dark }), // bottom
            new THREE.MeshBasicMaterial({ color: colors.side }), // front
            new THREE.MeshBasicMaterial({ color: colors.dark })  // back
        ];
        
        const cube = new THREE.Mesh(geometry, materials);
        group.add(cube);
        
        // Add black edges
        const edgeGeometry = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ 
            color: this.colors.gridLine,
            linewidth: 2
        });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        group.add(edges);
        
        // Add hatching pattern to top face for certain entities
        if (entity.type === EntityType.PLANT || entity.type === EntityType.DECOMPOSER) {
            const hatchGroup = this.createHatching(size, entity.type);
            hatchGroup.position.y = size / 2 + 0.01;
            hatchGroup.rotation.x = -Math.PI / 2;
            group.add(hatchGroup);
        }
        
        // Add cross pattern to side for herbivores/carnivores
        if (entity.type === EntityType.HERBIVORE || entity.type === EntityType.CARNIVORE) {
            const crossGroup = this.createSidePattern(size, entity.type);
            group.add(crossGroup);
        }
        
        // Position the mesh
        const halfGrid = this.gridSize / 2;
        group.position.set(
            (entity.x - halfGrid + 0.5) * this.cellSize,
            entity.z * this.cellSize + size / 2,
            (entity.y - halfGrid + 0.5) * this.cellSize
        );
        
        return group;
    }
    
    createHatching(size, type) {
        const group = new THREE.Group();
        const lineCount = 5;
        const spacing = size / (lineCount + 1);
        
        const material = new THREE.LineBasicMaterial({ 
            color: type === EntityType.PLANT ? 0x2a4a2a : 0x4a3a1a,
            transparent: true,
            opacity: 0.5
        });
        
        for (let i = 1; i <= lineCount; i++) {
            const points = [
                new THREE.Vector3(-size/2, -size/2 + i * spacing, 0),
                new THREE.Vector3(size/2, -size/2 + i * spacing, 0)
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            group.add(line);
        }
        
        return group;
    }
    
    createSidePattern(size, type) {
        const group = new THREE.Group();
        
        const material = new THREE.LineBasicMaterial({ 
            color: type === EntityType.HERBIVORE ? 0x2a4a6a : 0x5a2a2a,
            transparent: true,
            opacity: 0.4
        });
        
        // Front face diagonal lines
        const halfSize = size / 2;
        const points = [
            new THREE.Vector3(-halfSize * 0.5, -halfSize * 0.3, halfSize + 0.01),
            new THREE.Vector3(halfSize * 0.5, halfSize * 0.3, halfSize + 0.01),
            new THREE.Vector3(-halfSize * 0.5, halfSize * 0.3, halfSize + 0.01),
            new THREE.Vector3(halfSize * 0.5, -halfSize * 0.3, halfSize + 0.01)
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const lines = new THREE.LineSegments(geometry, material);
        group.add(lines);
        
        return group;
    }
    
    // Create accent highlight cube (orange cross pattern like in the image)
    createAccentCube(x, y, z) {
        const size = this.cellSize;
        const halfGrid = this.gridSize / 2;
        
        const group = new THREE.Group();
        
        // Orange face material
        const material = new THREE.MeshBasicMaterial({ 
            color: this.colors.accent,
            transparent: true,
            opacity: 0.9
        });
        
        // Top accent
        const topGeometry = new THREE.PlaneGeometry(size, size);
        const topMesh = new THREE.Mesh(topGeometry, material);
        topMesh.rotation.x = -Math.PI / 2;
        topMesh.position.y = z * this.cellSize + 0.02;
        topMesh.position.x = (x - halfGrid + 0.5) * this.cellSize;
        topMesh.position.z = (y - halfGrid + 0.5) * this.cellSize;
        
        group.add(topMesh);
        
        return group;
    }
    
    populate() {
        // Clear existing meshes
        this.clearEntityMeshes();
        this.initGrid();
        
        const totalCells = this.gridSize * this.gridSize * this.heightLayers;
        
        // Plants on lower layers
        for (let z = 0; z < Math.min(2, this.heightLayers); z++) {
            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 0; x < this.gridSize; x++) {
                    if (Math.random() < this.densities.plants * 1.5) {
                        const entity = new Entity(EntityType.PLANT, x, y, z);
                        this.grid[z][y][x] = entity;
                        this.addEntityMesh(entity);
                    }
                }
            }
        }
        
        // Herbivores
        let herbivoreCount = Math.floor(totalCells * this.densities.herbivores);
        while (herbivoreCount > 0) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const z = Math.floor(Math.random() * this.heightLayers);
            
            if (!this.grid[z][y][x]) {
                const entity = new Entity(EntityType.HERBIVORE, x, y, z);
                this.grid[z][y][x] = entity;
                this.addEntityMesh(entity);
                herbivoreCount--;
            }
        }
        
        // Carnivores
        let carnivoreCount = Math.floor(totalCells * this.densities.carnivores);
        while (carnivoreCount > 0) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const z = Math.floor(Math.random() * this.heightLayers);
            
            if (!this.grid[z][y][x]) {
                const entity = new Entity(EntityType.CARNIVORE, x, y, z);
                this.grid[z][y][x] = entity;
                this.addEntityMesh(entity);
                carnivoreCount--;
            }
        }
        
        // Decomposers
        let decomposerCount = Math.floor(totalCells * this.densities.decomposers);
        while (decomposerCount > 0) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const z = Math.floor(Math.random() * this.heightLayers);
            
            if (!this.grid[z][y][x]) {
                const entity = new Entity(EntityType.DECOMPOSER, x, y, z);
                this.grid[z][y][x] = entity;
                this.addEntityMesh(entity);
                decomposerCount--;
            }
        }
        
        this.updateStats();
    }
    
    addEntityMesh(entity) {
        const mesh = this.createEntityMesh(entity);
        if (mesh) {
            entity.mesh = mesh;
            this.scene.add(mesh);
            this.entityMeshes.set(entity, mesh);
        }
    }
    
    removeEntityMesh(entity) {
        if (entity.mesh) {
            this.scene.remove(entity.mesh);
            this.entityMeshes.delete(entity);
            entity.mesh = null;
        }
    }
    
    clearEntityMeshes() {
        for (const [entity, mesh] of this.entityMeshes) {
            this.scene.remove(mesh);
        }
        this.entityMeshes.clear();
    }
    
    updateEntityPosition(entity) {
        if (entity.mesh) {
            const halfGrid = this.gridSize / 2;
            const size = this.cellSize * 0.85;
            entity.mesh.position.set(
                (entity.x - halfGrid + 0.5) * this.cellSize,
                entity.z * this.cellSize + size / 2,
                (entity.y - halfGrid + 0.5) * this.cellSize
            );
        }
    }
    
    // Neighbor utilities
    getNeighbors(x, y, z, radius = 1) {
        const neighbors = [];
        
        for (let dz = -radius; dz <= radius; dz++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (dx === 0 && dy === 0 && dz === 0) continue;
                    
                    const nx = x + dx;
                    const ny = y + dy;
                    const nz = z + dz;
                    
                    if (nx >= 0 && nx < this.gridSize &&
                        ny >= 0 && ny < this.gridSize &&
                        nz >= 0 && nz < this.heightLayers) {
                        neighbors.push({ x: nx, y: ny, z: nz, entity: this.grid[nz][ny][nx] });
                    }
                }
            }
        }
        
        return neighbors;
    }
    
    findEmptyNeighbor(x, y, z) {
        const neighbors = this.getNeighbors(x, y, z).filter(n => !n.entity);
        if (neighbors.length === 0) return null;
        return neighbors[Math.floor(Math.random() * neighbors.length)];
    }
    
    findNeighborOfType(x, y, z, type) {
        const neighbors = this.getNeighbors(x, y, z).filter(n => n.entity && n.entity.type === type);
        if (neighbors.length === 0) return null;
        return neighbors[Math.floor(Math.random() * neighbors.length)];
    }
    
    // Simulation processing
    processPlant(entity, x, y, z) {
        if (this.atmosphere.co2 > 5) {
            const photosynthesisRate = this.atmosphere.sunlight * 0.3;
            const lightBonus = z < 2 ? 1 : (1 - (z / this.heightLayers) * 0.3);
            entity.energy += photosynthesisRate * lightBonus;
            this.atmosphere.co2 = Math.max(0, this.atmosphere.co2 - 0.05);
            this.atmosphere.o2 = Math.min(100, this.atmosphere.o2 + 0.08);
        } else {
            entity.energy -= 1;
        }
        
        entity.energy -= 0.3;
        entity.age++;
        
        if (entity.energy > 80 && Math.random() < 0.08) {
            const empty = this.findEmptyNeighbor(x, y, z);
            if (empty && empty.z <= 1) {
                const newEntity = new Entity(EntityType.PLANT, empty.x, empty.y, empty.z);
                this.grid[empty.z][empty.y][empty.x] = newEntity;
                this.addEntityMesh(newEntity);
                entity.energy -= 30;
            }
        }
        
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            this.removeEntityMesh(entity);
            const deadEntity = new Entity(EntityType.DEAD_MATTER, x, y, z);
            deadEntity.energy = 20;
            this.grid[z][y][x] = deadEntity;
            this.addEntityMesh(deadEntity);
            return false;
        }
        
        return true;
    }
    
    processHerbivore(entity, x, y, z) {
        if (this.atmosphere.o2 > 10) {
            this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.03);
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.02);
        } else {
            entity.energy -= 5;
        }
        
        const plant = this.findNeighborOfType(x, y, z, EntityType.PLANT);
        if (plant && entity.energy < 100) {
            const plantEntity = this.grid[plant.z][plant.y][plant.x];
            entity.energy += Math.min(plantEntity.energy, 25);
            this.removeEntityMesh(plantEntity);
            this.grid[plant.z][plant.y][plant.x] = null;
        }
        
        if (Math.random() < 0.4) {
            const empty = this.findEmptyNeighbor(x, y, z);
            if (empty) {
                this.grid[z][y][x] = null;
                this.grid[empty.z][empty.y][empty.x] = entity;
                entity.x = empty.x;
                entity.y = empty.y;
                entity.z = empty.z;
                this.updateEntityPosition(entity);
            }
        }
        
        entity.energy -= 0.8;
        entity.age++;
        
        if (entity.energy > 90 && Math.random() < 0.05) {
            const empty = this.findEmptyNeighbor(entity.x, entity.y, entity.z);
            if (empty) {
                const newEntity = new Entity(EntityType.HERBIVORE, empty.x, empty.y, empty.z);
                this.grid[empty.z][empty.y][empty.x] = newEntity;
                this.addEntityMesh(newEntity);
                entity.energy -= 40;
            }
        }
        
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            this.removeEntityMesh(entity);
            const pos = { x: entity.x, y: entity.y, z: entity.z };
            const deadEntity = new Entity(EntityType.DEAD_MATTER, pos.x, pos.y, pos.z);
            deadEntity.energy = 35;
            this.grid[pos.z][pos.y][pos.x] = deadEntity;
            this.addEntityMesh(deadEntity);
            return false;
        }
        
        return true;
    }
    
    processCarnivore(entity, x, y, z) {
        if (this.atmosphere.o2 > 10) {
            this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.04);
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.03);
        } else {
            entity.energy -= 6;
        }
        
        const prey = this.findNeighborOfType(x, y, z, EntityType.HERBIVORE);
        if (prey && entity.energy < 120) {
            const preyEntity = this.grid[prey.z][prey.y][prey.x];
            entity.energy += Math.min(preyEntity.energy * 0.8, 50);
            this.removeEntityMesh(preyEntity);
            const deadEntity = new Entity(EntityType.DEAD_MATTER, prey.x, prey.y, prey.z);
            deadEntity.energy = 15;
            this.grid[prey.z][prey.y][prey.x] = deadEntity;
            this.addEntityMesh(deadEntity);
        }
        
        if (Math.random() < 0.6) {
            const empty = this.findEmptyNeighbor(x, y, z);
            if (empty) {
                this.grid[z][y][x] = null;
                this.grid[empty.z][empty.y][empty.x] = entity;
                entity.x = empty.x;
                entity.y = empty.y;
                entity.z = empty.z;
                this.updateEntityPosition(entity);
            }
        }
        
        entity.energy -= 1.2;
        entity.age++;
        
        if (entity.energy > 110 && Math.random() < 0.03) {
            const empty = this.findEmptyNeighbor(entity.x, entity.y, entity.z);
            if (empty) {
                const newEntity = new Entity(EntityType.CARNIVORE, empty.x, empty.y, empty.z);
                this.grid[empty.z][empty.y][empty.x] = newEntity;
                this.addEntityMesh(newEntity);
                entity.energy -= 50;
            }
        }
        
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            this.removeEntityMesh(entity);
            const pos = { x: entity.x, y: entity.y, z: entity.z };
            const deadEntity = new Entity(EntityType.DEAD_MATTER, pos.x, pos.y, pos.z);
            deadEntity.energy = 40;
            this.grid[pos.z][pos.y][pos.x] = deadEntity;
            this.addEntityMesh(deadEntity);
            return false;
        }
        
        return true;
    }
    
    processDecomposer(entity, x, y, z) {
        this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.01);
        this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.02);
        
        const deadMatter = this.findNeighborOfType(x, y, z, EntityType.DEAD_MATTER);
        if (deadMatter) {
            const deadEntity = this.grid[deadMatter.z][deadMatter.y][deadMatter.x];
            entity.energy += deadEntity.energy * 0.6;
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.5);
            this.removeEntityMesh(deadEntity);
            this.grid[deadMatter.z][deadMatter.y][deadMatter.x] = null;
        }
        
        if (Math.random() < 0.2) {
            const empty = this.findEmptyNeighbor(x, y, z);
            if (empty) {
                this.grid[z][y][x] = null;
                this.grid[empty.z][empty.y][empty.x] = entity;
                entity.x = empty.x;
                entity.y = empty.y;
                entity.z = empty.z;
                this.updateEntityPosition(entity);
            }
        }
        
        entity.energy -= 0.4;
        entity.age++;
        
        if (entity.energy > 60 && Math.random() < 0.04) {
            const empty = this.findEmptyNeighbor(entity.x, entity.y, entity.z);
            if (empty) {
                const newEntity = new Entity(EntityType.DECOMPOSER, empty.x, empty.y, empty.z);
                this.grid[empty.z][empty.y][empty.x] = newEntity;
                this.addEntityMesh(newEntity);
                entity.energy -= 25;
            }
        }
        
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            this.removeEntityMesh(entity);
            this.grid[entity.z][entity.y][entity.x] = null;
            return false;
        }
        
        return true;
    }
    
    processDeadMatter(entity, x, y, z) {
        entity.energy -= 0.5;
        entity.age++;
        
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            this.removeEntityMesh(entity);
            this.grid[z][y][x] = null;
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.2);
            return false;
        }
        
        return true;
    }
    
    step() {
        const entitiesToProcess = [];
        
        for (let z = 0; z < this.heightLayers; z++) {
            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 0; x < this.gridSize; x++) {
                    const entity = this.grid[z][y][x];
                    if (entity) {
                        entitiesToProcess.push({ entity, x, y, z });
                    }
                }
            }
        }
        
        // Shuffle
        for (let i = entitiesToProcess.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [entitiesToProcess[i], entitiesToProcess[j]] = [entitiesToProcess[j], entitiesToProcess[i]];
        }
        
        for (const { entity, x, y, z } of entitiesToProcess) {
            if (this.grid[z][y][x] !== entity) continue;
            
            switch (entity.type) {
                case EntityType.PLANT:
                    this.processPlant(entity, x, y, z);
                    break;
                case EntityType.HERBIVORE:
                    this.processHerbivore(entity, x, y, z);
                    break;
                case EntityType.CARNIVORE:
                    this.processCarnivore(entity, x, y, z);
                    break;
                case EntityType.DECOMPOSER:
                    this.processDecomposer(entity, x, y, z);
                    break;
                case EntityType.DEAD_MATTER:
                    this.processDeadMatter(entity, x, y, z);
                    break;
            }
        }
        
        // Balance atmosphere
        const totalGas = this.atmosphere.o2 + this.atmosphere.co2;
        if (totalGas > 100) {
            const excess = totalGas - 100;
            this.atmosphere.o2 -= excess * 0.5;
            this.atmosphere.co2 -= excess * 0.5;
        }
        
        this.generation++;
        this.updateStats();
    }
    
    updateStats() {
        this.populations = {
            plants: 0,
            herbivores: 0,
            carnivores: 0,
            decomposers: 0,
            deadMatter: 0
        };
        
        for (let z = 0; z < this.heightLayers; z++) {
            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 0; x < this.gridSize; x++) {
                    const entity = this.grid[z][y][x];
                    if (entity) {
                        switch (entity.type) {
                            case EntityType.PLANT: this.populations.plants++; break;
                            case EntityType.HERBIVORE: this.populations.herbivores++; break;
                            case EntityType.CARNIVORE: this.populations.carnivores++; break;
                            case EntityType.DECOMPOSER: this.populations.decomposers++; break;
                            case EntityType.DEAD_MATTER: this.populations.deadMatter++; break;
                        }
                    }
                }
            }
        }
        
        // Update DOM
        document.getElementById('generation').textContent = this.generation;
        document.getElementById('population').textContent = 
            this.populations.plants + this.populations.herbivores + 
            this.populations.carnivores + this.populations.decomposers;
        
        document.getElementById('plantCount').textContent = this.populations.plants;
        document.getElementById('herbivoreCount').textContent = this.populations.herbivores;
        document.getElementById('carnivoreCount').textContent = this.populations.carnivores;
        document.getElementById('decomposerCount').textContent = this.populations.decomposers;
        
        document.getElementById('o2Bar').style.width = this.atmosphere.o2 + '%';
        document.getElementById('co2Bar').style.width = this.atmosphere.co2 + '%';
        document.getElementById('o2Value').textContent = Math.round(this.atmosphere.o2) + '%';
        document.getElementById('co2Value').textContent = Math.round(this.atmosphere.co2) + '%';
    }
    
    rebuildWorld() {
        // Remove old platform and grid
        if (this.platformGroup) {
            this.scene.remove(this.platformGroup);
        }
        if (this.gridMesh) {
            this.scene.remove(this.gridMesh);
        }
        
        // Rebuild
        this.createPlatform();
        this.createGridLines();
    }
    
    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const aspect = width / height;
        const viewSize = 12;
        
        this.camera.left = -viewSize * aspect / 2;
        this.camera.right = viewSize * aspect / 2;
        this.camera.top = viewSize / 2;
        this.camera.bottom = -viewSize / 2;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    animate(timestamp = 0) {
        if (this.isRunning && timestamp - this.lastUpdate > this.updateInterval) {
            this.step();
            this.lastUpdate = timestamp;
        }
        
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame((t) => this.animate(t));
    }
    
    // Controls
    start() { this.isRunning = true; }
    stop() { this.isRunning = false; }
    toggle() {
        this.isRunning = !this.isRunning;
        return this.isRunning;
    }
    
    reset() {
        this.stop();
        this.populate();
    }
    
    setSpeed(speed) {
        this.updateInterval = Math.max(30, 400 - speed * 20);
    }
    
    setGridSize(size) {
        this.gridSize = size;
        this.rebuildWorld();
    }
    
    setHeightLayers(layers) {
        this.heightLayers = layers;
    }
    
    setSunlight(intensity) {
        this.atmosphere.sunlight = intensity;
    }
    
    applyPreset(preset) {
        const presets = {
            balanced: {
                plants: 0.15, herbivores: 0.05, carnivores: 0.02, decomposers: 0.03,
                o2: 50, sunlight: 5
            },
            jungle: {
                plants: 0.25, herbivores: 0.08, carnivores: 0.01, decomposers: 0.04,
                o2: 60, sunlight: 8
            },
            predator: {
                plants: 0.10, herbivores: 0.06, carnivores: 0.05, decomposers: 0.02,
                o2: 45, sunlight: 4
            },
            barren: {
                plants: 0.05, herbivores: 0.02, carnivores: 0.01, decomposers: 0.01,
                o2: 30, sunlight: 3
            }
        };
        
        if (presets[preset]) {
            const p = presets[preset];
            this.densities = {
                plants: p.plants,
                herbivores: p.herbivores,
                carnivores: p.carnivores,
                decomposers: p.decomposers
            };
            this.atmosphere.o2 = p.o2;
            this.atmosphere.co2 = 100 - p.o2;
            this.atmosphere.sunlight = p.sunlight;
            return p;
        }
        return null;
    }
}

// UI Controller
class UIController {
    constructor(world) {
        this.world = world;
        this.setupControls();
    }
    
    setupControls() {
        const playPauseBtn = document.getElementById('playPause');
        const playPauseText = document.getElementById('playPauseText');
        
        playPauseBtn.addEventListener('click', () => {
            const running = this.world.toggle();
            playPauseText.textContent = running ? 'PAUSE' : 'START';
            playPauseBtn.classList.toggle('active', running);
        });
        
        document.getElementById('step').addEventListener('click', () => {
            this.world.step();
        });
        
        document.getElementById('reset').addEventListener('click', () => {
            this.world.reset();
            playPauseText.textContent = 'START';
            playPauseBtn.classList.remove('active');
        });
        
        // Speed
        const speedSlider = document.getElementById('speed');
        const speedValue = document.getElementById('speedValue');
        speedSlider.addEventListener('input', () => {
            speedValue.textContent = speedSlider.value;
            this.world.setSpeed(parseInt(speedSlider.value));
        });
        
        // Grid size
        const gridSizeSlider = document.getElementById('gridSize');
        const gridSizeValue = document.getElementById('gridSizeValue');
        gridSizeSlider.addEventListener('input', () => {
            gridSizeValue.textContent = gridSizeSlider.value;
        });
        gridSizeSlider.addEventListener('change', () => {
            this.world.setGridSize(parseInt(gridSizeSlider.value));
            this.world.reset();
        });
        
        // Height layers
        const heightSlider = document.getElementById('heightLayers');
        const heightValue = document.getElementById('heightLayersValue');
        heightSlider.addEventListener('input', () => {
            heightValue.textContent = heightSlider.value;
        });
        heightSlider.addEventListener('change', () => {
            this.world.setHeightLayers(parseInt(heightSlider.value));
            this.world.reset();
        });
        
        // Sunlight
        const sunSlider = document.getElementById('sunlight');
        const sunValue = document.getElementById('sunlightValue');
        sunSlider.addEventListener('input', () => {
            sunValue.textContent = sunSlider.value;
            this.world.setSunlight(parseInt(sunSlider.value));
        });
        
        // Presets
        document.querySelectorAll('.btn-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const preset = btn.dataset.preset;
                const settings = this.world.applyPreset(preset);
                
                if (settings) {
                    document.getElementById('sunlight').value = settings.sunlight;
                    document.getElementById('sunlightValue').textContent = settings.sunlight;
                    this.world.reset();
                }
            });
        });
        
        // Initialize
        this.world.populate();
    }
}

// Start
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvasContainer');
    const world = new EcosystemWorld(container);
    const ui = new UIController(world);
    
    world.setSpeed(8);
    window.ecosystem = world;
});

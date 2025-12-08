// Voxel Ecosystem - 3D Life Simulator
// ====================================

// Entity Types
const EntityType = {
    EMPTY: 0,
    PLANT: 1,
    HERBIVORE: 2,
    CARNIVORE: 3,
    DECOMPOSER: 4,
    DEAD_MATTER: 5
};

// Entity class representing each living thing
class Entity {
    constructor(type, x, y, z) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.z = z;
        this.energy = this.getInitialEnergy();
        this.age = 0;
        this.maxAge = this.getMaxAge();
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

// Main Ecosystem World
class EcosystemWorld {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // World dimensions
        this.gridSize = 14;
        this.heightLayers = 5;
        this.cellSize = 22;
        
        // Grid storage
        this.grid = [];
        
        // Atmosphere
        this.atmosphere = {
            o2: 50,     // Percentage (0-100)
            co2: 50,    // Percentage (0-100)
            sunlight: 5 // Intensity (1-10)
        };
        
        // Simulation state
        this.generation = 0;
        this.isRunning = false;
        this.lastUpdate = 0;
        this.updateInterval = 150;
        
        // Population counts
        this.populations = {
            plants: 0,
            herbivores: 0,
            carnivores: 0,
            decomposers: 0,
            deadMatter: 0
        };
        
        // Initial densities
        this.densities = {
            plants: 0.15,
            herbivores: 0.05,
            carnivores: 0.02,
            decomposers: 0.03
        };
        
        // Camera state
        this.rotation = { x: 0.6, y: 0.785 };
        this.zoom = 1;
        this.targetRotation = { ...this.rotation };
        this.targetZoom = 1;
        
        // Interaction
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        
        // Particles for visual effects
        this.particles = [];
        
        // Event log
        this.eventLog = [];
        this.maxLogEntries = 15;
        
        // Species colors
        this.colors = {
            [EntityType.PLANT]: {
                top: '#34d399', left: '#22c55e', right: '#16a34a',
                glow: 'rgba(34, 197, 94, 0.6)'
            },
            [EntityType.HERBIVORE]: {
                top: '#60a5fa', left: '#3b82f6', right: '#2563eb',
                glow: 'rgba(59, 130, 246, 0.6)'
            },
            [EntityType.CARNIVORE]: {
                top: '#f87171', left: '#ef4444', right: '#dc2626',
                glow: 'rgba(239, 68, 68, 0.6)'
            },
            [EntityType.DECOMPOSER]: {
                top: '#fbbf24', left: '#f59e0b', right: '#d97706',
                glow: 'rgba(245, 158, 11, 0.6)'
            },
            [EntityType.DEAD_MATTER]: {
                top: '#6b7280', left: '#4b5563', right: '#374151',
                glow: 'rgba(107, 114, 128, 0.3)'
            }
        };
        
        this.init();
    }
    
    init() {
        this.resize();
        this.initGrid();
        this.setupEventListeners();
        this.animate();
    }
    
    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
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
        this.eventLog = [];
        this.updateStats();
    }
    
    // Populate the world with initial entities
    populate() {
        this.initGrid();
        
        const totalCells = this.gridSize * this.gridSize * this.heightLayers;
        
        // Plants mostly on lower layers (ground level)
        for (let z = 0; z < Math.min(2, this.heightLayers); z++) {
            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 0; x < this.gridSize; x++) {
                    if (Math.random() < this.densities.plants * 1.5) {
                        this.grid[z][y][x] = new Entity(EntityType.PLANT, x, y, z);
                        this.spawnParticle(x, y, z, 'birth', EntityType.PLANT);
                    }
                }
            }
        }
        
        // Herbivores scattered
        let herbivoreCount = Math.floor(totalCells * this.densities.herbivores);
        while (herbivoreCount > 0) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const z = Math.floor(Math.random() * this.heightLayers);
            
            if (!this.grid[z][y][x]) {
                this.grid[z][y][x] = new Entity(EntityType.HERBIVORE, x, y, z);
                this.spawnParticle(x, y, z, 'birth', EntityType.HERBIVORE);
                herbivoreCount--;
            }
        }
        
        // Carnivores sparse
        let carnivoreCount = Math.floor(totalCells * this.densities.carnivores);
        while (carnivoreCount > 0) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const z = Math.floor(Math.random() * this.heightLayers);
            
            if (!this.grid[z][y][x]) {
                this.grid[z][y][x] = new Entity(EntityType.CARNIVORE, x, y, z);
                this.spawnParticle(x, y, z, 'birth', EntityType.CARNIVORE);
                carnivoreCount--;
            }
        }
        
        // Decomposers scattered
        let decomposerCount = Math.floor(totalCells * this.densities.decomposers);
        while (decomposerCount > 0) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const z = Math.floor(Math.random() * this.heightLayers);
            
            if (!this.grid[z][y][x]) {
                this.grid[z][y][x] = new Entity(EntityType.DECOMPOSER, x, y, z);
                decomposerCount--;
            }
        }
        
        this.logEvent('Ecosystem initialized', 'birth');
        this.updateStats();
    }
    
    setupEventListeners() {
        // Mouse rotation
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
        });
        
        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;
            
            this.targetRotation.y += dx * 0.005;
            this.targetRotation.x = Math.max(0.3, Math.min(1.2, this.targetRotation.x + dy * 0.005));
            
            this.lastMouse = { x: e.clientX, y: e.clientY };
        });
        
        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
        
        // Zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.targetZoom = Math.max(0.5, Math.min(2.5, this.targetZoom - e.deltaY * 0.001));
        });
        
        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.isDragging || e.touches.length !== 1) return;
            e.preventDefault();
            
            const dx = e.touches[0].clientX - this.lastMouse.x;
            const dy = e.touches[0].clientY - this.lastMouse.y;
            
            this.targetRotation.y += dx * 0.005;
            this.targetRotation.x = Math.max(0.3, Math.min(1.2, this.targetRotation.x + dy * 0.005));
            
            this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        });
        
        this.canvas.addEventListener('touchend', () => {
            this.isDragging = false;
        });
        
        window.addEventListener('resize', () => this.resize());
    }
    
    // Convert 3D to isometric 2D
    toIsometric(x, y, z) {
        const cos = Math.cos(this.rotation.y);
        const sin = Math.sin(this.rotation.y);
        const pitch = this.rotation.x;
        
        const cx = x - this.gridSize / 2;
        const cy = y - this.gridSize / 2;
        const cz = z - this.heightLayers / 2;
        
        const rx = cx * cos - cy * sin;
        const ry = cx * sin + cy * cos;
        
        const scale = this.cellSize * this.zoom;
        const screenX = rx * scale;
        const screenY = (ry * Math.cos(pitch) + cz * Math.sin(pitch)) * scale * 0.8;
        const screenZ = ry * Math.sin(pitch) - cz * Math.cos(pitch);
        
        return {
            x: this.width / 2 + screenX,
            y: this.height / 2 + screenY,
            z: screenZ
        };
    }
    
    // Draw a voxel cube
    drawVoxel(x, y, z, colors, alpha = 1, scale = 1) {
        const size = this.cellSize * this.zoom * 0.85 * scale;
        const center = this.toIsometric(x + 0.5, y + 0.5, z + 0.5);
        
        const cos = Math.cos(this.rotation.y);
        const pitch = this.rotation.x;
        
        const halfSize = size / 2;
        const topOffset = size * 0.4 * Math.cos(pitch);
        const sideOffset = size * 0.5;
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        // Top face
        this.ctx.beginPath();
        this.ctx.moveTo(center.x, center.y - topOffset);
        this.ctx.lineTo(center.x + sideOffset * cos, center.y - topOffset / 2 + sideOffset * Math.sin(this.rotation.y) * 0.5);
        this.ctx.lineTo(center.x, center.y + topOffset * 0.3);
        this.ctx.lineTo(center.x - sideOffset * cos, center.y - topOffset / 2 + sideOffset * Math.sin(this.rotation.y) * 0.5);
        this.ctx.closePath();
        this.ctx.fillStyle = colors.top;
        this.ctx.fill();
        
        // Left face
        this.ctx.beginPath();
        this.ctx.moveTo(center.x, center.y + topOffset * 0.3);
        this.ctx.lineTo(center.x - sideOffset * cos, center.y - topOffset / 2 + sideOffset * Math.sin(this.rotation.y) * 0.5);
        this.ctx.lineTo(center.x - sideOffset * cos, center.y + topOffset);
        this.ctx.lineTo(center.x, center.y + topOffset * 1.5);
        this.ctx.closePath();
        this.ctx.fillStyle = colors.left;
        this.ctx.fill();
        
        // Right face
        this.ctx.beginPath();
        this.ctx.moveTo(center.x, center.y + topOffset * 0.3);
        this.ctx.lineTo(center.x + sideOffset * cos, center.y - topOffset / 2 + sideOffset * Math.sin(this.rotation.y) * 0.5);
        this.ctx.lineTo(center.x + sideOffset * cos, center.y + topOffset);
        this.ctx.lineTo(center.x, center.y + topOffset * 1.5);
        this.ctx.closePath();
        this.ctx.fillStyle = colors.right;
        this.ctx.fill();
        
        // Glow effect
        if (colors.glow) {
            this.ctx.shadowColor = colors.glow;
            this.ctx.shadowBlur = 8 * this.zoom;
        }
        
        this.ctx.restore();
    }
    
    // Draw floor grid
    drawFloor() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i <= this.gridSize; i++) {
            const startX = this.toIsometric(i, 0, 0);
            const endX = this.toIsometric(i, this.gridSize, 0);
            this.ctx.beginPath();
            this.ctx.moveTo(startX.x, startX.y);
            this.ctx.lineTo(endX.x, endX.y);
            this.ctx.stroke();
            
            const startY = this.toIsometric(0, i, 0);
            const endY = this.toIsometric(this.gridSize, i, 0);
            this.ctx.beginPath();
            this.ctx.moveTo(startY.x, startY.y);
            this.ctx.lineTo(endY.x, endY.y);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    // Get neighboring cells
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
    
    // Find empty neighbor cell
    findEmptyNeighbor(x, y, z) {
        const neighbors = this.getNeighbors(x, y, z).filter(n => !n.entity);
        if (neighbors.length === 0) return null;
        return neighbors[Math.floor(Math.random() * neighbors.length)];
    }
    
    // Find neighbor of specific type
    findNeighborOfType(x, y, z, type) {
        const neighbors = this.getNeighbors(x, y, z).filter(n => n.entity && n.entity.type === type);
        if (neighbors.length === 0) return null;
        return neighbors[Math.floor(Math.random() * neighbors.length)];
    }
    
    // Process plant behavior
    processPlant(entity, x, y, z) {
        // Photosynthesis: consume CO2, produce O2
        if (this.atmosphere.co2 > 5) {
            const photosynthesisRate = this.atmosphere.sunlight * 0.3;
            const lightBonus = z < 2 ? 1 : (1 - (z / this.heightLayers) * 0.3); // Lower = more light
            
            const energyGain = photosynthesisRate * lightBonus;
            entity.energy += energyGain;
            
            // Gas exchange
            this.atmosphere.co2 = Math.max(0, this.atmosphere.co2 - 0.05);
            this.atmosphere.o2 = Math.min(100, this.atmosphere.o2 + 0.08);
        } else {
            // No CO2 = plant suffers
            entity.energy -= 1;
        }
        
        // Natural energy cost
        entity.energy -= 0.3;
        entity.age++;
        
        // Reproduction (spreading)
        if (entity.energy > 80 && Math.random() < 0.08) {
            const empty = this.findEmptyNeighbor(x, y, z);
            if (empty && empty.z <= 1) { // Plants prefer ground level
                this.grid[empty.z][empty.y][empty.x] = new Entity(EntityType.PLANT, empty.x, empty.y, empty.z);
                entity.energy -= 30;
                this.spawnParticle(empty.x, empty.y, empty.z, 'birth', EntityType.PLANT);
            }
        }
        
        // Death check
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            this.grid[z][y][x] = new Entity(EntityType.DEAD_MATTER, x, y, z);
            this.grid[z][y][x].energy = 20;
            this.spawnParticle(x, y, z, 'death', EntityType.PLANT);
            return false;
        }
        
        return true;
    }
    
    // Process herbivore behavior
    processHerbivore(entity, x, y, z) {
        // Breathing: consume O2, produce CO2
        if (this.atmosphere.o2 > 10) {
            this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.03);
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.02);
        } else {
            // Suffocating
            entity.energy -= 5;
            if (Math.random() < 0.1) {
                this.logEvent('Herbivore suffocating - low O₂!', 'warning');
            }
        }
        
        // Try to eat plants
        const plant = this.findNeighborOfType(x, y, z, EntityType.PLANT);
        if (plant && entity.energy < 100) {
            const plantEntity = this.grid[plant.z][plant.y][plant.x];
            const energyGain = Math.min(plantEntity.energy, 25);
            entity.energy += energyGain;
            
            // Kill the plant
            this.grid[plant.z][plant.y][plant.x] = null;
            this.spawnParticle(plant.x, plant.y, plant.z, 'eat', EntityType.PLANT);
        }
        
        // Movement
        if (Math.random() < 0.4) {
            const empty = this.findEmptyNeighbor(x, y, z);
            if (empty) {
                this.grid[z][y][x] = null;
                this.grid[empty.z][empty.y][empty.x] = entity;
                entity.x = empty.x;
                entity.y = empty.y;
                entity.z = empty.z;
            }
        }
        
        // Natural energy cost
        entity.energy -= 0.8;
        entity.age++;
        
        // Reproduction
        if (entity.energy > 90 && Math.random() < 0.05) {
            const empty = this.findEmptyNeighbor(entity.x, entity.y, entity.z);
            if (empty) {
                this.grid[empty.z][empty.y][empty.x] = new Entity(EntityType.HERBIVORE, empty.x, empty.y, empty.z);
                entity.energy -= 40;
                this.spawnParticle(empty.x, empty.y, empty.z, 'birth', EntityType.HERBIVORE);
                this.logEvent('New herbivore born!', 'birth');
            }
        }
        
        // Death check
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            const pos = { x: entity.x, y: entity.y, z: entity.z };
            this.grid[pos.z][pos.y][pos.x] = new Entity(EntityType.DEAD_MATTER, pos.x, pos.y, pos.z);
            this.grid[pos.z][pos.y][pos.x].energy = 35;
            this.spawnParticle(pos.x, pos.y, pos.z, 'death', EntityType.HERBIVORE);
            return false;
        }
        
        return true;
    }
    
    // Process carnivore behavior
    processCarnivore(entity, x, y, z) {
        // Breathing
        if (this.atmosphere.o2 > 10) {
            this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.04);
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.03);
        } else {
            entity.energy -= 6;
            if (Math.random() < 0.1) {
                this.logEvent('Carnivore suffocating - low O₂!', 'warning');
            }
        }
        
        // Hunt herbivores
        const prey = this.findNeighborOfType(x, y, z, EntityType.HERBIVORE);
        if (prey && entity.energy < 120) {
            const preyEntity = this.grid[prey.z][prey.y][prey.x];
            const energyGain = Math.min(preyEntity.energy * 0.8, 50);
            entity.energy += energyGain;
            
            // Kill prey, leave dead matter
            this.grid[prey.z][prey.y][prey.x] = new Entity(EntityType.DEAD_MATTER, prey.x, prey.y, prey.z);
            this.grid[prey.z][prey.y][prey.x].energy = 15;
            this.spawnParticle(prey.x, prey.y, prey.z, 'hunt', EntityType.CARNIVORE);
            this.logEvent('Carnivore hunted prey!', 'hunt');
        }
        
        // Movement (more active)
        if (Math.random() < 0.6) {
            const empty = this.findEmptyNeighbor(x, y, z);
            if (empty) {
                this.grid[z][y][x] = null;
                this.grid[empty.z][empty.y][empty.x] = entity;
                entity.x = empty.x;
                entity.y = empty.y;
                entity.z = empty.z;
            }
        }
        
        // Higher energy cost
        entity.energy -= 1.2;
        entity.age++;
        
        // Reproduction (slower)
        if (entity.energy > 110 && Math.random() < 0.03) {
            const empty = this.findEmptyNeighbor(entity.x, entity.y, entity.z);
            if (empty) {
                this.grid[empty.z][empty.y][empty.x] = new Entity(EntityType.CARNIVORE, empty.x, empty.y, empty.z);
                entity.energy -= 50;
                this.spawnParticle(empty.x, empty.y, empty.z, 'birth', EntityType.CARNIVORE);
                this.logEvent('New carnivore born!', 'birth');
            }
        }
        
        // Death check
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            const pos = { x: entity.x, y: entity.y, z: entity.z };
            this.grid[pos.z][pos.y][pos.x] = new Entity(EntityType.DEAD_MATTER, pos.x, pos.y, pos.z);
            this.grid[pos.z][pos.y][pos.x].energy = 40;
            this.spawnParticle(pos.x, pos.y, pos.z, 'death', EntityType.CARNIVORE);
            return false;
        }
        
        return true;
    }
    
    // Process decomposer behavior
    processDecomposer(entity, x, y, z) {
        // Decomposers don't need much O2
        this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.01);
        this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.02);
        
        // Consume dead matter
        const deadMatter = this.findNeighborOfType(x, y, z, EntityType.DEAD_MATTER);
        if (deadMatter) {
            const deadEntity = this.grid[deadMatter.z][deadMatter.y][deadMatter.x];
            const energyGain = deadEntity.energy * 0.6;
            entity.energy += energyGain;
            
            // Release nutrients (boost CO2 which plants need)
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.5);
            
            // Remove dead matter
            this.grid[deadMatter.z][deadMatter.y][deadMatter.x] = null;
            this.spawnParticle(deadMatter.x, deadMatter.y, deadMatter.z, 'decompose', EntityType.DECOMPOSER);
        }
        
        // Slow movement
        if (Math.random() < 0.2) {
            const empty = this.findEmptyNeighbor(x, y, z);
            if (empty) {
                this.grid[z][y][x] = null;
                this.grid[empty.z][empty.y][empty.x] = entity;
                entity.x = empty.x;
                entity.y = empty.y;
                entity.z = empty.z;
            }
        }
        
        // Low energy cost
        entity.energy -= 0.4;
        entity.age++;
        
        // Reproduction
        if (entity.energy > 60 && Math.random() < 0.04) {
            const empty = this.findEmptyNeighbor(entity.x, entity.y, entity.z);
            if (empty) {
                this.grid[empty.z][empty.y][empty.x] = new Entity(EntityType.DECOMPOSER, empty.x, empty.y, empty.z);
                entity.energy -= 25;
            }
        }
        
        // Death check
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            this.grid[entity.z][entity.y][entity.x] = null;
            return false;
        }
        
        return true;
    }
    
    // Process dead matter decay
    processDeadMatter(entity, x, y, z) {
        entity.energy -= 0.5;
        entity.age++;
        
        // Natural decay
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            this.grid[z][y][x] = null;
            // Release some CO2
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.2);
            return false;
        }
        
        return true;
    }
    
    // Main simulation step
    step() {
        const entitiesToProcess = [];
        
        // Collect all entities
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
        
        // Shuffle to avoid bias
        for (let i = entitiesToProcess.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [entitiesToProcess[i], entitiesToProcess[j]] = [entitiesToProcess[j], entitiesToProcess[i]];
        }
        
        // Process each entity
        for (const { entity, x, y, z } of entitiesToProcess) {
            // Skip if entity was already processed/removed
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
        
        // Natural atmosphere balancing
        const totalGas = this.atmosphere.o2 + this.atmosphere.co2;
        if (totalGas > 100) {
            const excess = totalGas - 100;
            this.atmosphere.o2 -= excess * 0.5;
            this.atmosphere.co2 -= excess * 0.5;
        }
        
        this.generation++;
        this.updateStats();
        
        // Check for extinction events
        if (this.populations.plants === 0 && this.generation > 10) {
            this.logEvent('⚠️ Plants extinct! O₂ dropping!', 'warning');
        }
        if (this.populations.herbivores === 0 && this.populations.carnivores > 0) {
            this.logEvent('⚠️ Herbivores extinct!', 'warning');
        }
    }
    
    // Spawn visual particle
    spawnParticle(x, y, z, type, entityType) {
        const pos = this.toIsometric(x + 0.5, y + 0.5, z + 0.5);
        const colors = {
            birth: '#34d399',
            death: '#ef4444',
            eat: '#34d399',
            hunt: '#ef4444',
            decompose: '#f59e0b'
        };
        
        const color = colors[type] || '#ffffff';
        
        for (let i = 0; i < 4; i++) {
            this.particles.push({
                x: pos.x,
                y: pos.y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3 - 1.5,
                life: 1,
                decay: 0.025 + Math.random() * 0.015,
                size: 2 + Math.random() * 2,
                color
            });
        }
    }
    
    // Update particle positions
    updateParticles() {
        this.ctx.save();
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.life -= p.decay;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 6;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    // Update statistics
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
        
        // Atmosphere bars
        document.getElementById('o2Bar').style.width = this.atmosphere.o2 + '%';
        document.getElementById('co2Bar').style.width = this.atmosphere.co2 + '%';
        document.getElementById('o2Value').textContent = Math.round(this.atmosphere.o2) + '%';
        document.getElementById('co2Value').textContent = Math.round(this.atmosphere.co2) + '%';
    }
    
    // Log event to UI
    logEvent(message, type = 'info') {
        this.eventLog.unshift({ message, type, time: this.generation });
        
        if (this.eventLog.length > this.maxLogEntries) {
            this.eventLog.pop();
        }
        
        const logContent = document.getElementById('logContent');
        logContent.innerHTML = this.eventLog.map(e => 
            `<div class="log-entry ${e.type}">[${e.time}] ${e.message}</div>`
        ).join('');
    }
    
    // Camera smoothing
    updateCamera() {
        const lerp = 0.1;
        this.rotation.x += (this.targetRotation.x - this.rotation.x) * lerp;
        this.rotation.y += (this.targetRotation.y - this.rotation.y) * lerp;
        this.zoom += (this.targetZoom - this.zoom) * lerp;
    }
    
    // Get sorted voxels for depth rendering
    getSortedVoxels() {
        const voxels = [];
        
        for (let z = 0; z < this.heightLayers; z++) {
            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 0; x < this.gridSize; x++) {
                    const entity = this.grid[z][y][x];
                    if (entity) {
                        const pos = this.toIsometric(x + 0.5, y + 0.5, z + 0.5);
                        voxels.push({ x, y, z, entity, depth: pos.z });
                    }
                }
            }
        }
        
        voxels.sort((a, b) => b.depth - a.depth);
        return voxels;
    }
    
    // Main render
    render() {
        // Clear
        this.ctx.fillStyle = '#080a0e';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.updateCamera();
        this.drawFloor();
        
        // Draw level indicators
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(34, 197, 94, 0.03)';
        this.ctx.lineWidth = 1;
        
        for (let z = 1; z < this.heightLayers; z++) {
            const corners = [
                this.toIsometric(0, 0, z),
                this.toIsometric(this.gridSize, 0, z),
                this.toIsometric(this.gridSize, this.gridSize, z),
                this.toIsometric(0, this.gridSize, z)
            ];
            
            this.ctx.beginPath();
            this.ctx.moveTo(corners[0].x, corners[0].y);
            for (let i = 1; i < corners.length; i++) {
                this.ctx.lineTo(corners[i].x, corners[i].y);
            }
            this.ctx.closePath();
            this.ctx.stroke();
        }
        this.ctx.restore();
        
        // Draw entities
        const voxels = this.getSortedVoxels();
        for (const voxel of voxels) {
            const colors = this.colors[voxel.entity.type];
            if (colors) {
                // Scale based on energy for living things
                let scale = 1;
                if (voxel.entity.type !== EntityType.DEAD_MATTER) {
                    scale = 0.7 + (Math.min(voxel.entity.energy, 100) / 100) * 0.3;
                } else {
                    scale = 0.5 + (voxel.entity.energy / 50) * 0.3;
                }
                this.drawVoxel(voxel.x, voxel.y, voxel.z, colors, 1, scale);
            }
        }
        
        this.updateParticles();
    }
    
    // Animation loop
    animate(timestamp = 0) {
        if (this.isRunning && timestamp - this.lastUpdate > this.updateInterval) {
            this.step();
            this.lastUpdate = timestamp;
        }
        
        this.render();
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
    }
    
    setHeightLayers(layers) {
        this.heightLayers = layers;
    }
    
    setAtmosphere(o2) {
        this.atmosphere.o2 = o2;
        this.atmosphere.co2 = 100 - o2;
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
            playPauseText.textContent = running ? 'Pause' : 'Start';
            playPauseBtn.classList.toggle('active', running);
        });
        
        document.getElementById('step').addEventListener('click', () => {
            this.world.step();
        });
        
        document.getElementById('reset').addEventListener('click', () => {
            this.world.reset();
            playPauseText.textContent = 'Start';
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
        
        // Population densities
        const setupDensitySlider = (id, key) => {
            const slider = document.getElementById(id);
            const value = document.getElementById(id + 'Value');
            slider.addEventListener('input', () => {
                value.textContent = slider.value + '%';
                this.world.densities[key] = parseInt(slider.value) / 100;
            });
        };
        
        setupDensitySlider('plantDensity', 'plants');
        setupDensitySlider('herbivoreDensity', 'herbivores');
        setupDensitySlider('carnivoreDensity', 'carnivores');
        setupDensitySlider('decomposerDensity', 'decomposers');
        
        // Environment
        const o2Slider = document.getElementById('initialO2');
        const o2Value = document.getElementById('initialO2Value');
        o2Slider.addEventListener('input', () => {
            o2Value.textContent = o2Slider.value + '%';
            this.world.setAtmosphere(parseInt(o2Slider.value));
        });
        
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
                    // Update sliders
                    document.getElementById('plantDensity').value = settings.plants * 100;
                    document.getElementById('plantDensityValue').textContent = Math.round(settings.plants * 100) + '%';
                    document.getElementById('herbivoreDensity').value = settings.herbivores * 100;
                    document.getElementById('herbivoreDensityValue').textContent = Math.round(settings.herbivores * 100) + '%';
                    document.getElementById('carnivoreDensity').value = settings.carnivores * 100;
                    document.getElementById('carnivoreDensityValue').textContent = Math.round(settings.carnivores * 100) + '%';
                    document.getElementById('decomposerDensity').value = settings.decomposers * 100;
                    document.getElementById('decomposerDensityValue').textContent = Math.round(settings.decomposers * 100) + '%';
                    document.getElementById('initialO2').value = settings.o2;
                    document.getElementById('initialO2Value').textContent = settings.o2 + '%';
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

// Start application
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('world');
    const world = new EcosystemWorld(canvas);
    const ui = new UIController(world);
    
    world.setSpeed(8);
    window.ecosystem = world;
});

// Voxel Ecosystem - 2D Grid Simulator
// =====================================

const EntityType = {
    EMPTY: 0,
    PLANT: 1,
    HERBIVORE: 2,
    CARNIVORE: 3,
    DECOMPOSER: 4,
    DEAD_MATTER: 5
};

class Entity {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
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

class EcosystemWorld {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // World settings
        this.gridSize = 40;
        this.cellSize = 16;
        
        // Simulation
        this.grid = [];
        this.generation = 0;
        this.isRunning = false;
        this.lastUpdate = 0;
        this.updateInterval = 100;
        
        // Atmosphere
        this.atmosphere = {
            o2: 50,
            co2: 50,
            sunlight: 5
        };
        
        // Population
        this.populations = {
            plants: 0,
            herbivores: 0,
            carnivores: 0,
            decomposers: 0,
            deadMatter: 0
        };
        
        // Densities
        this.densities = {
            plants: 0.12,
            herbivores: 0.04,
            carnivores: 0.02,
            decomposers: 0.02
        };
        
        // Colors - vibrant like the reference image
        this.colors = {
            [EntityType.PLANT]: '#f5a623',      // Yellow/Orange
            [EntityType.HERBIVORE]: '#1a4b8c',  // Dark Blue
            [EntityType.CARNIVORE]: '#c41e3a',  // Red
            [EntityType.DECOMPOSER]: '#f5a623', // Yellow (lighter)
            [EntityType.DEAD_MATTER]: '#888888' // Gray
        };
        
        this.init();
    }
    
    init() {
        this.resize();
        this.initGrid();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }
    
    resize() {
        const container = this.canvas.parentElement;
        const size = Math.min(container.clientWidth, container.clientHeight) - 40;
        
        this.canvas.width = size;
        this.canvas.height = size;
        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';
        
        this.cellSize = size / this.gridSize;
    }
    
    initGrid() {
        this.grid = [];
        for (let y = 0; y < this.gridSize; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                this.grid[y][x] = null;
            }
        }
        this.generation = 0;
        this.updateStats();
    }
    
    populate() {
        this.initGrid();
        
        const totalCells = this.gridSize * this.gridSize;
        
        // Plants - clustered in center with spread
        const centerX = this.gridSize / 2;
        const centerY = this.gridSize / 2;
        const maxRadius = this.gridSize * 0.45;
        
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Higher density in center
                const densityMod = Math.max(0, 1 - (dist / maxRadius) * 0.7);
                
                if (Math.random() < this.densities.plants * densityMod * 2) {
                    this.grid[y][x] = new Entity(EntityType.PLANT, x, y);
                }
            }
        }
        
        // Herbivores - scattered
        let herbivoreCount = Math.floor(totalCells * this.densities.herbivores);
        while (herbivoreCount > 0) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            
            if (!this.grid[y][x]) {
                this.grid[y][x] = new Entity(EntityType.HERBIVORE, x, y);
                herbivoreCount--;
            }
        }
        
        // Carnivores
        let carnivoreCount = Math.floor(totalCells * this.densities.carnivores);
        while (carnivoreCount > 0) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            
            if (!this.grid[y][x]) {
                this.grid[y][x] = new Entity(EntityType.CARNIVORE, x, y);
                carnivoreCount--;
            }
        }
        
        // Decomposers
        let decomposerCount = Math.floor(totalCells * this.densities.decomposers);
        while (decomposerCount > 0) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            
            if (!this.grid[y][x]) {
                this.grid[y][x] = new Entity(EntityType.DECOMPOSER, x, y);
                decomposerCount--;
            }
        }
        
        this.updateStats();
    }
    
    getNeighbors(x, y) {
        const neighbors = [];
        
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                    neighbors.push({ x: nx, y: ny, entity: this.grid[ny][nx] });
                }
            }
        }
        
        return neighbors;
    }
    
    findEmptyNeighbor(x, y) {
        const neighbors = this.getNeighbors(x, y).filter(n => !n.entity);
        if (neighbors.length === 0) return null;
        return neighbors[Math.floor(Math.random() * neighbors.length)];
    }
    
    findNeighborOfType(x, y, type) {
        const neighbors = this.getNeighbors(x, y).filter(n => n.entity && n.entity.type === type);
        if (neighbors.length === 0) return null;
        return neighbors[Math.floor(Math.random() * neighbors.length)];
    }
    
    processPlant(entity, x, y) {
        if (this.atmosphere.co2 > 5) {
            const rate = this.atmosphere.sunlight * 0.3;
            entity.energy += rate;
            this.atmosphere.co2 = Math.max(0, this.atmosphere.co2 - 0.03);
            this.atmosphere.o2 = Math.min(100, this.atmosphere.o2 + 0.05);
        } else {
            entity.energy -= 1;
        }
        
        entity.energy -= 0.3;
        entity.age++;
        
        if (entity.energy > 80 && Math.random() < 0.06) {
            const empty = this.findEmptyNeighbor(x, y);
            if (empty) {
                this.grid[empty.y][empty.x] = new Entity(EntityType.PLANT, empty.x, empty.y);
                entity.energy -= 30;
            }
        }
        
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            this.grid[y][x] = new Entity(EntityType.DEAD_MATTER, x, y);
            this.grid[y][x].energy = 20;
            return false;
        }
        
        return true;
    }
    
    processHerbivore(entity, x, y) {
        if (this.atmosphere.o2 > 10) {
            this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.02);
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.015);
        } else {
            entity.energy -= 5;
        }
        
        const plant = this.findNeighborOfType(x, y, EntityType.PLANT);
        if (plant && entity.energy < 100) {
            entity.energy += Math.min(this.grid[plant.y][plant.x].energy, 25);
            this.grid[plant.y][plant.x] = null;
        }
        
        if (Math.random() < 0.35) {
            const empty = this.findEmptyNeighbor(x, y);
            if (empty) {
                this.grid[y][x] = null;
                this.grid[empty.y][empty.x] = entity;
                entity.x = empty.x;
                entity.y = empty.y;
            }
        }
        
        entity.energy -= 0.7;
        entity.age++;
        
        if (entity.energy > 90 && Math.random() < 0.04) {
            const empty = this.findEmptyNeighbor(entity.x, entity.y);
            if (empty) {
                this.grid[empty.y][empty.x] = new Entity(EntityType.HERBIVORE, empty.x, empty.y);
                entity.energy -= 40;
            }
        }
        
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            this.grid[entity.y][entity.x] = new Entity(EntityType.DEAD_MATTER, entity.x, entity.y);
            this.grid[entity.y][entity.x].energy = 35;
            return false;
        }
        
        return true;
    }
    
    processCarnivore(entity, x, y) {
        if (this.atmosphere.o2 > 10) {
            this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.03);
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.02);
        } else {
            entity.energy -= 6;
        }
        
        const prey = this.findNeighborOfType(x, y, EntityType.HERBIVORE);
        if (prey && entity.energy < 120) {
            const preyEntity = this.grid[prey.y][prey.x];
            entity.energy += Math.min(preyEntity.energy * 0.8, 50);
            this.grid[prey.y][prey.x] = new Entity(EntityType.DEAD_MATTER, prey.x, prey.y);
            this.grid[prey.y][prey.x].energy = 15;
        }
        
        if (Math.random() < 0.5) {
            const empty = this.findEmptyNeighbor(x, y);
            if (empty) {
                this.grid[y][x] = null;
                this.grid[empty.y][empty.x] = entity;
                entity.x = empty.x;
                entity.y = empty.y;
            }
        }
        
        entity.energy -= 1.0;
        entity.age++;
        
        if (entity.energy > 110 && Math.random() < 0.025) {
            const empty = this.findEmptyNeighbor(entity.x, entity.y);
            if (empty) {
                this.grid[empty.y][empty.x] = new Entity(EntityType.CARNIVORE, empty.x, empty.y);
                entity.energy -= 50;
            }
        }
        
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            this.grid[entity.y][entity.x] = new Entity(EntityType.DEAD_MATTER, entity.x, entity.y);
            this.grid[entity.y][entity.x].energy = 40;
            return false;
        }
        
        return true;
    }
    
    processDecomposer(entity, x, y) {
        this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.01);
        this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.015);
        
        const dead = this.findNeighborOfType(x, y, EntityType.DEAD_MATTER);
        if (dead) {
            const deadEntity = this.grid[dead.y][dead.x];
            entity.energy += deadEntity.energy * 0.6;
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.3);
            this.grid[dead.y][dead.x] = null;
        }
        
        if (Math.random() < 0.15) {
            const empty = this.findEmptyNeighbor(x, y);
            if (empty) {
                this.grid[y][x] = null;
                this.grid[empty.y][empty.x] = entity;
                entity.x = empty.x;
                entity.y = empty.y;
            }
        }
        
        entity.energy -= 0.35;
        entity.age++;
        
        if (entity.energy > 60 && Math.random() < 0.03) {
            const empty = this.findEmptyNeighbor(entity.x, entity.y);
            if (empty) {
                this.grid[empty.y][empty.x] = new Entity(EntityType.DECOMPOSER, empty.x, empty.y);
                entity.energy -= 25;
            }
        }
        
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            this.grid[entity.y][entity.x] = null;
            return false;
        }
        
        return true;
    }
    
    processDeadMatter(entity, x, y) {
        entity.energy -= 0.4;
        entity.age++;
        
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            this.grid[y][x] = null;
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.15);
            return false;
        }
        
        return true;
    }
    
    step() {
        const entities = [];
        
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x]) {
                    entities.push({ entity: this.grid[y][x], x, y });
                }
            }
        }
        
        // Shuffle
        for (let i = entities.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [entities[i], entities[j]] = [entities[j], entities[i]];
        }
        
        for (const { entity, x, y } of entities) {
            if (this.grid[y][x] !== entity) continue;
            
            switch (entity.type) {
                case EntityType.PLANT:
                    this.processPlant(entity, x, y);
                    break;
                case EntityType.HERBIVORE:
                    this.processHerbivore(entity, x, y);
                    break;
                case EntityType.CARNIVORE:
                    this.processCarnivore(entity, x, y);
                    break;
                case EntityType.DECOMPOSER:
                    this.processDecomposer(entity, x, y);
                    break;
                case EntityType.DEAD_MATTER:
                    this.processDeadMatter(entity, x, y);
                    break;
            }
        }
        
        // Balance atmosphere
        const total = this.atmosphere.o2 + this.atmosphere.co2;
        if (total > 100) {
            const excess = total - 100;
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
        
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const entity = this.grid[y][x];
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
    
    render() {
        const ctx = this.ctx;
        const size = this.canvas.width;
        
        // Clear - white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        
        // Draw entities
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const entity = this.grid[y][x];
                if (!entity) continue;
                
                const color = this.colors[entity.type];
                const px = x * this.cellSize + this.cellSize / 2;
                const py = y * this.cellSize + this.cellSize / 2;
                
                // Size based on energy (smaller = outline, larger = filled)
                const energyRatio = Math.min(entity.energy / 100, 1);
                const baseSize = this.cellSize * 0.35;
                const maxSize = this.cellSize * 0.85;
                const entitySize = baseSize + (maxSize - baseSize) * energyRatio;
                
                // Determine if filled or outline based on energy
                const isFilled = entity.energy > 40 || entity.type === EntityType.DEAD_MATTER;
                
                ctx.save();
                
                if (isFilled) {
                    // Filled square
                    ctx.fillStyle = color;
                    ctx.fillRect(
                        px - entitySize / 2,
                        py - entitySize / 2,
                        entitySize,
                        entitySize
                    );
                    
                    // Add inner highlight for some entities
                    if (entity.energy > 70 && entity.type !== EntityType.DEAD_MATTER) {
                        const innerSize = entitySize * 0.5;
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(
                            px - innerSize / 2,
                            py - innerSize / 2,
                            innerSize,
                            innerSize
                        );
                    }
                } else {
                    // Outline only
                    ctx.strokeStyle = color;
                    ctx.lineWidth = Math.max(1, this.cellSize * 0.08);
                    ctx.strokeRect(
                        px - entitySize / 2,
                        py - entitySize / 2,
                        entitySize,
                        entitySize
                    );
                }
                
                ctx.restore();
            }
        }
    }
    
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
        this.updateInterval = Math.max(20, 300 - speed * 14);
    }
    
    setGridSize(size) {
        this.gridSize = size;
        this.resize();
    }
    
    setSunlight(intensity) {
        this.atmosphere.sunlight = intensity;
    }
    
    applyPreset(preset) {
        const presets = {
            balanced: {
                plants: 0.12, herbivores: 0.04, carnivores: 0.02, decomposers: 0.02,
                o2: 50, sunlight: 5
            },
            jungle: {
                plants: 0.20, herbivores: 0.06, carnivores: 0.01, decomposers: 0.03,
                o2: 60, sunlight: 8
            },
            predator: {
                plants: 0.08, herbivores: 0.05, carnivores: 0.04, decomposers: 0.02,
                o2: 45, sunlight: 4
            },
            barren: {
                plants: 0.04, herbivores: 0.02, carnivores: 0.01, decomposers: 0.01,
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
    const canvas = document.getElementById('world');
    const world = new EcosystemWorld(canvas);
    const ui = new UIController(world);
    
    world.setSpeed(10);
    window.ecosystem = world;
});

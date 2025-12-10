// Voxel Ecosystem - 2D Grid Simulator with Organic Tendrils
// ==========================================================

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
        // Trail history for drawing tendrils
        this.trail = [];
        this.maxTrail = 15 + Math.floor(Math.random() * 10);
        // Reproduction tracking
        this.cyclesSinceReproduction = 0;
    }
    
    getInitialEnergy() {
        switch (this.type) {
            case EntityType.PLANT: return 60 + Math.random() * 30;
            case EntityType.HERBIVORE: return 80 + Math.random() * 40;
            case EntityType.CARNIVORE: return 110 + Math.random() * 50;
            case EntityType.DECOMPOSER: return 50 + Math.random() * 25;
            case EntityType.DEAD_MATTER: return 35 + Math.random() * 25;
            default: return 0;
        }
    }
    
    getMaxAge() {
        switch (this.type) {
            case EntityType.PLANT: return 120 + Math.random() * 60;      // Longer lived
            case EntityType.HERBIVORE: return 100 + Math.random() * 50;  // Longer lived
            case EntityType.CARNIVORE: return 80 + Math.random() * 40;   // Longer lived
            case EntityType.DECOMPOSER: return 150 + Math.random() * 75; // Much longer lived
            case EntityType.DEAD_MATTER: return 30 + Math.random() * 20; // Decays slower
            default: return 0;
        }
    }
    
    addToTrail(x, y) {
        this.trail.push({ x, y });
        if (this.trail.length > this.maxTrail) {
            this.trail.shift();
        }
    }
}

class EcosystemWorld {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // World settings
        this.gridSize = 50;
        this.cellSize = 12;
        
        // Simulation
        this.grid = [];
        this.generation = 0;
        this.isRunning = false;
        this.lastUpdate = 0;
        this.updateInterval = 80;
        
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
            plants: 0.10,
            herbivores: 0.03,
            carnivores: 0.02,
            decomposers: 0.02
        };
        
        // Configurable species settings
        this.settings = {
            plant: {
                energyCost: 0.2,
                reproEnergy: 70,
                reproCooldown: 2,
                spreadRadius: 4
            },
            herbivore: {
                energyCost: 0.5,
                foodEnergy: 35,
                reproEnergy: 75,
                moveChance: 0.35
            },
            carnivore: {
                energyCost: 0.7,
                huntEnergy: 70,
                reproEnergy: 90,
                moveChance: 0.45
            },
            colony: {
                radius: 2,
                maxBonus: 0.5,
                moveBias: 0.7,
                mateRadius: 2
            }
        };
        
        // Vibrant colors like the reference
        this.colors = {
            [EntityType.PLANT]: {
                fill: '#2d8f4e',      // Green
                light: '#4ade80',
                line: '#65a30d'
            },
            [EntityType.HERBIVORE]: {
                fill: '#1e5aab',      // Blue
                light: '#3b82f6',
                line: '#60a5fa'
            },
            [EntityType.CARNIVORE]: {
                fill: '#c91c1c',      // Red
                light: '#ef4444',
                line: '#f87171'
            },
            [EntityType.DECOMPOSER]: {
                fill: '#d4a012',      // Gold/Yellow
                light: '#fbbf24',
                line: '#fcd34d'
            },
            [EntityType.DEAD_MATTER]: {
                fill: '#4a4a4a',
                light: '#737373',
                line: '#525252'
            }
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
        
        // Create multiple seed points for colonies
        const numSeeds = 5 + Math.floor(Math.random() * 5);
        const seeds = [];
        for (let i = 0; i < numSeeds; i++) {
            seeds.push({
                x: Math.floor(Math.random() * this.gridSize),
                y: Math.floor(Math.random() * this.gridSize),
                type: [EntityType.PLANT, EntityType.PLANT, EntityType.HERBIVORE, EntityType.CARNIVORE][Math.floor(Math.random() * 4)]
            });
        }
        
        // Grow colonies from seeds
        for (const seed of seeds) {
            const radius = 5 + Math.floor(Math.random() * 8);
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const x = seed.x + dx;
                    const y = seed.y + dy;
                    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) continue;
                    
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const prob = Math.max(0, 1 - dist / radius) * 0.6;
                    
                    if (Math.random() < prob && !this.grid[y][x]) {
                        this.grid[y][x] = new Entity(seed.type, x, y);
                    }
                }
            }
        }
        
        // Add scattered entities
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x]) continue;
                
                if (Math.random() < this.densities.plants * 0.5) {
                    this.grid[y][x] = new Entity(EntityType.PLANT, x, y);
                } else if (Math.random() < this.densities.herbivores * 0.3) {
                    this.grid[y][x] = new Entity(EntityType.HERBIVORE, x, y);
                } else if (Math.random() < this.densities.carnivores * 0.3) {
                    this.grid[y][x] = new Entity(EntityType.CARNIVORE, x, y);
                } else if (Math.random() < this.densities.decomposers * 0.3) {
                    this.grid[y][x] = new Entity(EntityType.DECOMPOSER, x, y);
                }
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
    
    // Count same-type entities nearby (for colony bonus)
    countNearbyOfType(x, y, type, radius = 2) {
        let count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                    const entity = this.grid[ny][nx];
                    if (entity && entity.type === type) {
                        count++;
                    }
                }
            }
        }
        return count;
    }
    
    // Calculate colony bonus based on nearby same-type entities
    getColonyBonus(x, y, type) {
        const radius = this.settings.colony.radius;
        const maxBonus = this.settings.colony.maxBonus;
        const nearbyCount = this.countNearbyOfType(x, y, type, radius);
        return Math.min(nearbyCount * (maxBonus / 5), maxBonus);
    }
    
    // Find best move - biased toward staying in colony
    findColonyBiasedMove(x, y, type) {
        const emptyNeighbors = this.getNeighbors(x, y).filter(n => !n.entity);
        if (emptyNeighbors.length === 0) return null;
        
        const moveBias = this.settings.colony.moveBias;
        
        // Random chance to move randomly
        if (Math.random() > moveBias) {
            return emptyNeighbors[Math.floor(Math.random() * emptyNeighbors.length)];
        }
        
        // Score each empty cell by how many same-type neighbors it would have
        let bestMove = null;
        let bestScore = -1;
        
        for (const cell of emptyNeighbors) {
            const score = this.countNearbyOfType(cell.x, cell.y, type, this.settings.colony.radius);
            const randomizedScore = score + Math.random() * 2;
            if (randomizedScore > bestScore) {
                bestScore = randomizedScore;
                bestMove = cell;
            }
        }
        
        return bestMove || emptyNeighbors[Math.floor(Math.random() * emptyNeighbors.length)];
    }
    
    // Check if there's another entity of the same type within a radius
    hasNearbyOfType(x, y, type, radius = 3) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                    const entity = this.grid[ny][nx];
                    if (entity && entity.type === type) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    // Check for mate within radius 2 (easier to find mates)
    findMate(x, y, type, radius = 2) {
        const potentialMates = [];
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                    const entity = this.grid[ny][nx];
                    if (entity && entity.type === type && entity.energy > 40) {
                        potentialMates.push({ x: nx, y: ny, entity });
                    }
                }
            }
        }
        if (potentialMates.length === 0) return null;
        return potentialMates[Math.floor(Math.random() * potentialMates.length)];
    }
    
    processPlant(entity, x, y) {
        const settings = this.settings.plant;
        const colonyBonus = this.getColonyBonus(x, y, EntityType.PLANT);
        
        // Photosynthesis - bonus in colonies
        if (this.atmosphere.co2 > 3) {
            const rate = this.atmosphere.sunlight * (0.5 + colonyBonus * 0.3);
            entity.energy += rate;
            this.atmosphere.co2 = Math.max(0, this.atmosphere.co2 - 0.02);
            this.atmosphere.o2 = Math.min(100, this.atmosphere.o2 + 0.04);
        } else {
            entity.energy -= 0.5;
        }
        
        // Energy cost (configurable)
        entity.energy -= Math.max(settings.energyCost * 0.5, settings.energyCost - colonyBonus * 0.1);
        entity.age++;
        entity.cyclesSinceReproduction++;
        
        // Plants grow roots (trails)
        if (Math.random() < 0.1) {
            entity.addToTrail(x + (Math.random() - 0.5) * 2, y + (Math.random() - 0.5) * 2);
        }
        
        // Plant reproduction - higher chance in colonies (configurable)
        const nearbyPlants = this.countNearbyOfType(x, y, EntityType.PLANT, settings.spreadRadius);
        const reproChance = nearbyPlants > 0 ? 1 : 0.5;
        
        if (entity.energy > settings.reproEnergy && 
            entity.cyclesSinceReproduction >= settings.reproCooldown && 
            nearbyPlants > 0 &&
            Math.random() < reproChance) {
            const empty = this.findColonyBiasedMove(x, y, EntityType.PLANT);
            if (empty) {
                const newEntity = new Entity(EntityType.PLANT, empty.x, empty.y);
                this.grid[empty.y][empty.x] = newEntity;
                entity.energy -= settings.reproEnergy * 0.3;
                entity.cyclesSinceReproduction = 0;
            }
        }
        
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            const dead = new Entity(EntityType.DEAD_MATTER, x, y);
            dead.energy = 20;
            dead.trail = entity.trail.slice();
            this.grid[y][x] = dead;
            return false;
        }
        
        return true;
    }
    
    processHerbivore(entity, x, y) {
        const settings = this.settings.herbivore;
        const colonyBonus = this.getColonyBonus(x, y, EntityType.HERBIVORE);
        
        if (this.atmosphere.o2 > 8) {
            this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.015);
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.01);
        } else {
            entity.energy -= 3 * (1 - colonyBonus);
        }
        
        // Eating (configurable food energy)
        const plant = this.findNeighborOfType(x, y, EntityType.PLANT);
        if (plant && entity.energy < 120) {
            entity.energy += Math.min(this.grid[plant.y][plant.x].energy, settings.foodEnergy);
            this.grid[plant.y][plant.x] = null;
        }
        
        // Colony-biased movement (configurable)
        if (Math.random() < settings.moveChance) {
            const empty = this.findColonyBiasedMove(x, y, EntityType.HERBIVORE);
            if (empty) {
                entity.addToTrail(x, y);
                this.grid[y][x] = null;
                this.grid[empty.y][empty.x] = entity;
                entity.x = empty.x;
                entity.y = empty.y;
            }
        }
        
        // Energy cost (configurable)
        entity.energy -= Math.max(settings.energyCost * 0.6, settings.energyCost - colonyBonus * 0.2);
        entity.energy += colonyBonus * 0.15;
        entity.age++;
        
        // Reproduction (configurable)
        if (entity.energy > settings.reproEnergy) {
            const mate = this.findMate(entity.x, entity.y, EntityType.HERBIVORE, this.settings.colony.mateRadius);
            if (mate) {
                const empty = this.findColonyBiasedMove(entity.x, entity.y, EntityType.HERBIVORE);
                if (empty) {
                    this.grid[empty.y][empty.x] = new Entity(EntityType.HERBIVORE, empty.x, empty.y);
                    entity.energy -= settings.reproEnergy * 0.35;
                    mate.entity.energy -= settings.reproEnergy * 0.25;
                }
            }
        }
        
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            const dead = new Entity(EntityType.DEAD_MATTER, entity.x, entity.y);
            dead.energy = 35;
            dead.trail = entity.trail.slice();
            this.grid[entity.y][entity.x] = dead;
            return false;
        }
        
        return true;
    }
    
    processCarnivore(entity, x, y) {
        const settings = this.settings.carnivore;
        const packBonus = this.getColonyBonus(x, y, EntityType.CARNIVORE);
        
        if (this.atmosphere.o2 > 8) {
            this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.02);
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.015);
        } else {
            entity.energy -= 4 * (1 - packBonus);
        }
        
        // Pack hunting (configurable)
        const prey = this.findNeighborOfType(x, y, EntityType.HERBIVORE);
        if (prey && entity.energy < 140) {
            const preyEntity = this.grid[prey.y][prey.x];
            const huntBonus = 1 + packBonus * 0.3;
            entity.energy += Math.min(preyEntity.energy * 0.9 * huntBonus, settings.huntEnergy);
            const dead = new Entity(EntityType.DEAD_MATTER, prey.x, prey.y);
            dead.energy = 20;
            this.grid[prey.y][prey.x] = dead;
        }
        
        // Pack-biased movement (configurable)
        if (Math.random() < settings.moveChance) {
            const empty = this.findColonyBiasedMove(x, y, EntityType.CARNIVORE);
            if (empty) {
                entity.addToTrail(x, y);
                this.grid[y][x] = null;
                this.grid[empty.y][empty.x] = entity;
                entity.x = empty.x;
                entity.y = empty.y;
            }
        }
        
        // Energy cost (configurable)
        entity.energy -= Math.max(settings.energyCost * 0.6, settings.energyCost - packBonus * 0.3);
        entity.energy += packBonus * 0.1;
        entity.age++;
        
        // Reproduction (configurable)
        if (entity.energy > settings.reproEnergy) {
            const mate = this.findMate(entity.x, entity.y, EntityType.CARNIVORE, this.settings.colony.mateRadius);
            if (mate) {
                const empty = this.findColonyBiasedMove(entity.x, entity.y, EntityType.CARNIVORE);
                if (empty) {
                    this.grid[empty.y][empty.x] = new Entity(EntityType.CARNIVORE, empty.x, empty.y);
                    entity.energy -= settings.reproEnergy * 0.35;
                    mate.entity.energy -= settings.reproEnergy * 0.25;
                }
            }
        }
        
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            const dead = new Entity(EntityType.DEAD_MATTER, entity.x, entity.y);
            dead.energy = 40;
            dead.trail = entity.trail.slice();
            this.grid[entity.y][entity.x] = dead;
            return false;
        }
        
        return true;
    }
    
    processDecomposer(entity, x, y) {
        // Colony bonus - decomposers work better in clusters
        const colonyBonus = this.getColonyBonus(x, y, EntityType.DECOMPOSER);
        
        // Decomposers barely use oxygen
        this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.005);
        this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.01);
        
        // Decomposing - bonus efficiency in clusters
        const dead = this.findNeighborOfType(x, y, EntityType.DEAD_MATTER);
        if (dead) {
            const deadEntity = this.grid[dead.y][dead.x];
            const efficiencyBonus = 1 + colonyBonus * 0.2;  // Up to 10% more efficient
            entity.energy += deadEntity.energy * 0.8 * efficiencyBonus;
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.25);
            this.grid[dead.y][dead.x] = null;
        }
        
        // Colony-biased movement
        if (Math.random() < 0.25) {
            const empty = this.findColonyBiasedMove(x, y, EntityType.DECOMPOSER);
            if (empty) {
                entity.addToTrail(x, y);
                this.grid[y][x] = null;
                this.grid[empty.y][empty.x] = entity;
                entity.x = empty.x;
                entity.y = empty.y;
            }
        }
        
        // Reduced energy cost in clusters
        entity.energy -= Math.max(0.15, 0.25 - colonyBonus * 0.1);
        entity.energy += colonyBonus * 0.1;  // Small cluster bonus
        entity.age++;
        
        // Decomposer reproduction - cluster breeding
        if (entity.energy > 50) {
            const mate = this.findMate(entity.x, entity.y, EntityType.DECOMPOSER);
            if (mate) {
                const empty = this.findColonyBiasedMove(entity.x, entity.y, EntityType.DECOMPOSER);
                if (empty) {
                    this.grid[empty.y][empty.x] = new Entity(EntityType.DECOMPOSER, empty.x, empty.y);
                    entity.energy -= 15;
                    mate.entity.energy -= 10;
                }
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
    
    drawCurvedLine(ctx, points, color, alpha = 0.6) {
        if (points.length < 2) return;
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(points[0].x * this.cellSize + this.cellSize / 2, 
                   points[0].y * this.cellSize + this.cellSize / 2);
        
        for (let i = 1; i < points.length; i++) {
            const p0 = points[i - 1];
            const p1 = points[i];
            
            const cpx = (p0.x + p1.x) / 2 * this.cellSize + this.cellSize / 2;
            const cpy = (p0.y + p1.y) / 2 * this.cellSize + this.cellSize / 2;
            
            ctx.quadraticCurveTo(
                p0.x * this.cellSize + this.cellSize / 2,
                p0.y * this.cellSize + this.cellSize / 2,
                cpx, cpy
            );
        }
        
        ctx.stroke();
        ctx.restore();
    }
    
    drawSpiral(ctx, x, y, size, color) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        for (let i = 0; i < 20; i++) {
            const angle = i * 0.5;
            const r = i * size * 0.03;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
    }
    
    drawGrid(ctx, size) {
        ctx.save();
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let i = 0; i <= this.gridSize; i++) {
            const x = i * this.cellSize;
            // Fade from center
            const distFromCenter = Math.abs(i - this.gridSize / 2) / (this.gridSize / 2);
            ctx.globalAlpha = 0.3 * (1 - distFromCenter * 0.5);
            
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, size);
            ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let i = 0; i <= this.gridSize; i++) {
            const y = i * this.cellSize;
            const distFromCenter = Math.abs(i - this.gridSize / 2) / (this.gridSize / 2);
            ctx.globalAlpha = 0.3 * (1 - distFromCenter * 0.5);
            
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(size, y);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    render() {
        const ctx = this.ctx;
        const size = this.canvas.width;
        
        // Dark background
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, size, size);
        
        // Draw faded grid
        this.drawGrid(ctx, size);
        
        // First pass: draw all trails/tendrils
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const entity = this.grid[y][x];
                if (!entity || entity.trail.length < 2) continue;
                
                const colors = this.colors[entity.type];
                if (colors) {
                    this.drawCurvedLine(ctx, entity.trail, colors.line, 0.5);
                }
            }
        }
        
        // Draw connection lines between nearby same-type entities
        const drawnConnections = new Set();
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const entity = this.grid[y][x];
                if (!entity || entity.type === EntityType.DEAD_MATTER) continue;
                
                const neighbors = this.getNeighbors(x, y);
                for (const n of neighbors) {
                    if (n.entity && n.entity.type === entity.type) {
                        const key = `${Math.min(x, n.x)},${Math.min(y, n.y)}-${Math.max(x, n.x)},${Math.max(y, n.y)}`;
                        if (!drawnConnections.has(key)) {
                            drawnConnections.add(key);
                            
                            const colors = this.colors[entity.type];
                            ctx.save();
                            ctx.strokeStyle = colors.line;
                            ctx.globalAlpha = 0.3;
                            ctx.lineWidth = 1;
                            
                            // Draw wavy line
                            const x1 = x * this.cellSize + this.cellSize / 2;
                            const y1 = y * this.cellSize + this.cellSize / 2;
                            const x2 = n.x * this.cellSize + this.cellSize / 2;
                            const y2 = n.y * this.cellSize + this.cellSize / 2;
                            
                            const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * this.cellSize;
                            const my = (y1 + y2) / 2 + (Math.random() - 0.5) * this.cellSize;
                            
                            ctx.beginPath();
                            ctx.moveTo(x1, y1);
                            ctx.quadraticCurveTo(mx, my, x2, y2);
                            ctx.stroke();
                            ctx.restore();
                        }
                    }
                }
            }
        }
        
        // Second pass: draw entities
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const entity = this.grid[y][x];
                if (!entity) continue;
                
                const colors = this.colors[entity.type];
                const px = x * this.cellSize + this.cellSize / 2;
                const py = y * this.cellSize + this.cellSize / 2;
                
                const energyRatio = Math.min(entity.energy / 100, 1);
                const baseSize = this.cellSize * 0.3;
                const maxSize = this.cellSize * 0.9;
                const entitySize = baseSize + (maxSize - baseSize) * energyRatio;
                
                ctx.save();
                
                // Filled square
                ctx.fillStyle = colors.fill;
                ctx.fillRect(
                    px - entitySize / 2,
                    py - entitySize / 2,
                    entitySize,
                    entitySize
                );
                
                // Inner detail for high energy
                if (entity.energy > 50 && entity.type !== EntityType.DEAD_MATTER) {
                    const innerSize = entitySize * 0.5;
                    ctx.fillStyle = colors.light;
                    ctx.fillRect(
                        px - innerSize / 2,
                        py - innerSize / 2,
                        innerSize,
                        innerSize
                    );
                    
                    // White core for very high energy
                    if (entity.energy > 80) {
                        const coreSize = entitySize * 0.25;
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(
                            px - coreSize / 2,
                            py - coreSize / 2,
                            coreSize,
                            coreSize
                        );
                    }
                }
                
                // Draw spiral for mature entities
                if (entity.age > 30 && entity.type !== EntityType.DEAD_MATTER) {
                    this.drawSpiral(ctx, px, py, entitySize, colors.line);
                }
                
                // Outline
                ctx.strokeStyle = colors.line;
                ctx.globalAlpha = 0.6;
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    px - entitySize / 2,
                    py - entitySize / 2,
                    entitySize,
                    entitySize
                );
                
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
        this.updateInterval = Math.max(20, 250 - speed * 12);
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
                plants: 0.10, herbivores: 0.03, carnivores: 0.02, decomposers: 0.02,
                o2: 50, sunlight: 5
            },
            jungle: {
                plants: 0.18, herbivores: 0.05, carnivores: 0.01, decomposers: 0.03,
                o2: 60, sunlight: 8
            },
            predator: {
                plants: 0.08, herbivores: 0.04, carnivores: 0.035, decomposers: 0.02,
                o2: 45, sunlight: 4
            },
            barren: {
                plants: 0.04, herbivores: 0.02, carnivores: 0.01, decomposers: 0.01,
                o2: 30, sunlight: 3
            },
            overpop: {
                plants: 0.20, herbivores: 0.08, carnivores: 0.04, decomposers: 0.04,
                o2: 55, sunlight: 7
            },
            sparse: {
                plants: 0.06, herbivores: 0.02, carnivores: 0.01, decomposers: 0.01,
                o2: 40, sunlight: 4
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
    
    // Settings updaters
    updatePlantSettings(key, value) {
        this.settings.plant[key] = value;
    }
    
    updateHerbivoreSettings(key, value) {
        this.settings.herbivore[key] = value;
    }
    
    updateCarnivoreSettings(key, value) {
        this.settings.carnivore[key] = value;
    }
    
    updateColonySettings(key, value) {
        this.settings.colony[key] = value;
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
            playPauseText.textContent = running ? '⏸ PAUSE' : '▶ START';
            playPauseBtn.classList.toggle('active', running);
        });
        
        document.getElementById('step').addEventListener('click', () => {
            this.world.step();
        });
        
        document.getElementById('reset').addEventListener('click', () => {
            this.world.reset();
            playPauseText.textContent = '▶ START';
            playPauseBtn.classList.remove('active');
        });
        
        // Speed
        this.setupSlider('speed', 'speedValue', (val) => {
            this.world.setSpeed(val);
        });
        
        // Grid size
        this.setupSlider('gridSize', 'gridSizeValue', (val) => {
            this.world.setGridSize(val);
            this.world.reset();
        }, true);
        
        // Atmosphere
        this.setupSlider('sunlight', 'sunlightValue', (val) => {
            this.world.setSunlight(val);
        });
        
        this.setupSlider('initialO2', 'initialO2Value', (val) => {
            this.world.atmosphere.o2 = val;
            this.world.atmosphere.co2 = 100 - val;
        }, false, '%');
        
        // Spawn Densities
        this.setupSlider('plantDensity', 'plantDensityValue', (val) => {
            this.world.densities.plants = val / 100;
        }, false, '%');
        
        this.setupSlider('herbivoreDensity', 'herbivoreDensityValue', (val) => {
            this.world.densities.herbivores = val / 100;
        }, false, '%');
        
        this.setupSlider('carnivoreDensity', 'carnivoreDensityValue', (val) => {
            this.world.densities.carnivores = val / 100;
        }, false, '%');
        
        this.setupSlider('decomposerDensity', 'decomposerDensityValue', (val) => {
            this.world.densities.decomposers = val / 100;
        }, false, '%');
        
        // Plant Settings
        this.setupSlider('plantEnergyCost', 'plantEnergyCostValue', (val) => {
            this.world.updatePlantSettings('energyCost', val / 10);
        }, false, '', (val) => (val / 10).toFixed(1));
        
        this.setupSlider('plantReproEnergy', 'plantReproEnergyValue', (val) => {
            this.world.updatePlantSettings('reproEnergy', val);
        });
        
        this.setupSlider('plantReproCooldown', 'plantReproCooldownValue', (val) => {
            this.world.updatePlantSettings('reproCooldown', val);
        });
        
        this.setupSlider('plantSpreadRadius', 'plantSpreadRadiusValue', (val) => {
            this.world.updatePlantSettings('spreadRadius', val);
        });
        
        // Herbivore Settings
        this.setupSlider('herbivoreEnergyCost', 'herbivoreEnergyCostValue', (val) => {
            this.world.updateHerbivoreSettings('energyCost', val / 10);
        }, false, '', (val) => (val / 10).toFixed(1));
        
        this.setupSlider('herbivoreFoodEnergy', 'herbivoreFoodEnergyValue', (val) => {
            this.world.updateHerbivoreSettings('foodEnergy', val);
        });
        
        this.setupSlider('herbivoreReproEnergy', 'herbivoreReproEnergyValue', (val) => {
            this.world.updateHerbivoreSettings('reproEnergy', val);
        });
        
        this.setupSlider('herbivoreMoveChance', 'herbivoreMoveChanceValue', (val) => {
            this.world.updateHerbivoreSettings('moveChance', val / 100);
        }, false, '%');
        
        // Carnivore Settings
        this.setupSlider('carnivoreEnergyCost', 'carnivoreEnergyCostValue', (val) => {
            this.world.updateCarnivoreSettings('energyCost', val / 10);
        }, false, '', (val) => (val / 10).toFixed(1));
        
        this.setupSlider('carnivoreHuntEnergy', 'carnivoreHuntEnergyValue', (val) => {
            this.world.updateCarnivoreSettings('huntEnergy', val);
        });
        
        this.setupSlider('carnivoreReproEnergy', 'carnivoreReproEnergyValue', (val) => {
            this.world.updateCarnivoreSettings('reproEnergy', val);
        });
        
        this.setupSlider('carnivoreMoveChance', 'carnivoreMoveChanceValue', (val) => {
            this.world.updateCarnivoreSettings('moveChance', val / 100);
        }, false, '%');
        
        // Colony Settings
        this.setupSlider('colonyRadius', 'colonyRadiusValue', (val) => {
            this.world.updateColonySettings('radius', val);
        });
        
        this.setupSlider('colonyMaxBonus', 'colonyMaxBonusValue', (val) => {
            this.world.updateColonySettings('maxBonus', val / 10);
        }, false, '', (val) => (val / 10).toFixed(1));
        
        this.setupSlider('colonyMoveBias', 'colonyMoveBiasValue', (val) => {
            this.world.updateColonySettings('moveBias', val / 100);
        }, false, '%');
        
        this.setupSlider('mateRadius', 'mateRadiusValue', (val) => {
            this.world.updateColonySettings('mateRadius', val);
        });
        
        // Presets
        document.querySelectorAll('.btn-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const preset = btn.dataset.preset;
                const settings = this.world.applyPreset(preset);
                
                if (settings) {
                    // Update density sliders
                    this.updateSliderValue('plantDensity', settings.plants * 100, '%');
                    this.updateSliderValue('herbivoreDensity', settings.herbivores * 100, '%');
                    this.updateSliderValue('carnivoreDensity', settings.carnivores * 100, '%');
                    this.updateSliderValue('decomposerDensity', settings.decomposers * 100, '%');
                    this.updateSliderValue('sunlight', settings.sunlight);
                    this.updateSliderValue('initialO2', settings.o2, '%');
                    
                    this.world.reset();
                }
            });
        });
        
        // Initialize
        this.world.populate();
    }
    
    setupSlider(sliderId, valueId, callback, onChange = false, suffix = '', formatter = null) {
        const slider = document.getElementById(sliderId);
        const valueEl = document.getElementById(valueId);
        
        if (!slider || !valueEl) return;
        
        const updateValue = () => {
            const val = parseInt(slider.value);
            valueEl.textContent = formatter ? formatter(val) : val + suffix;
            callback(val);
        };
        
        if (onChange) {
            slider.addEventListener('input', () => {
                valueEl.textContent = formatter ? formatter(parseInt(slider.value)) : slider.value + suffix;
            });
            slider.addEventListener('change', updateValue);
        } else {
            slider.addEventListener('input', updateValue);
        }
    }
    
    updateSliderValue(sliderId, value, suffix = '') {
        const slider = document.getElementById(sliderId);
        const valueEl = document.getElementById(sliderId + 'Value');
        if (slider && valueEl) {
            slider.value = value;
            valueEl.textContent = Math.round(value) + suffix;
        }
    }
}

// Start
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('world');
    const world = new EcosystemWorld(canvas);
    const ui = new UIController(world);
    
    world.setSpeed(10);
    window.ecosystem = world;
    
    // UI Update loop for real-time stats
    function updateUI() {
        // Header stats
        const genEl = document.getElementById('generation');
        const popEl = document.getElementById('population');
        if (genEl) genEl.textContent = world.generation;
        if (popEl) popEl.textContent = 
            world.populations.plants + world.populations.herbivores + 
            world.populations.carnivores + world.populations.decomposers;
        
        // Atmosphere bars
        const o2Bar = document.getElementById('o2Bar');
        const co2Bar = document.getElementById('co2Bar');
        const o2Value = document.getElementById('o2Value');
        const co2Value = document.getElementById('co2Value');
        
        if (o2Bar) o2Bar.style.width = world.atmosphere.o2 + '%';
        if (co2Bar) co2Bar.style.width = world.atmosphere.co2 + '%';
        if (o2Value) o2Value.textContent = Math.round(world.atmosphere.o2) + '%';
        if (co2Value) co2Value.textContent = Math.round(world.atmosphere.co2) + '%';
        
        // Population counts
        const plantCount = document.getElementById('plantCount');
        const herbCount = document.getElementById('herbivoreCount');
        const carnCount = document.getElementById('carnivoreCount');
        const decomCount = document.getElementById('decomposerCount');
        
        if (plantCount) plantCount.textContent = world.populations.plants;
        if (herbCount) herbCount.textContent = world.populations.herbivores;
        if (carnCount) carnCount.textContent = world.populations.carnivores;
        if (decomCount) decomCount.textContent = world.populations.decomposers;
        
        requestAnimationFrame(updateUI);
    }
    
    updateUI();
});

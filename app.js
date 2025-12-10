// ============================================================================
// VOXEL ECOSYSTEM SIMULATOR - Complete Edition
// A comprehensive ecosystem simulation with genetics, terrain, weather,
// disease, population analytics, and much more!
// ============================================================================

// === ENUMERATIONS ===
const EntityType = {
    EMPTY: 0,
    PLANT: 1,
    HERBIVORE: 2,
    CARNIVORE: 3,
    DECOMPOSER: 4,
    DEAD_MATTER: 5,
    OMNIVORE: 6,
    APEX_PREDATOR: 7,
    PARASITE: 8
};

const TerrainType = {
    NORMAL: 0,
    WATER: 1,
    MOUNTAIN: 2,
    FERTILE: 3,
    BARREN: 4
};

const Season = {
    SPRING: 'spring',
    SUMMER: 'summer',
    FALL: 'fall',
    WINTER: 'winter'
};

const Weather = {
    CLEAR: 'clear',
    RAIN: 'rain',
    DROUGHT: 'drought',
    STORM: 'storm'
};

const LifeStage = {
    JUVENILE: 'juvenile',
    ADULT: 'adult',
    ELDER: 'elder'
};

const DisasterType = {
    FIRE: 'fire',
    FLOOD: 'flood',
    DISEASE_OUTBREAK: 'disease',
    METEOR: 'meteor'
};

// === GENETICS SYSTEM ===
class Genetics {
    constructor(parent1 = null, parent2 = null) {
        if (parent1 && parent2) {
            // Inherit from parents with mutation
            this.speed = this.inheritTrait(parent1.genetics.speed, parent2.genetics.speed);
            this.efficiency = this.inheritTrait(parent1.genetics.efficiency, parent2.genetics.efficiency);
            this.size = this.inheritTrait(parent1.genetics.size, parent2.genetics.size);
            this.fertility = this.inheritTrait(parent1.genetics.fertility, parent2.genetics.fertility);
            this.immunity = this.inheritTrait(parent1.genetics.immunity, parent2.genetics.immunity);
            this.lifespan = this.inheritTrait(parent1.genetics.lifespan, parent2.genetics.lifespan);
            this.perception = this.inheritTrait(parent1.genetics.perception, parent2.genetics.perception);
            this.camouflage = this.inheritTrait(parent1.genetics.camouflage, parent2.genetics.camouflage);
        } else {
            // Random initial genetics
            this.speed = 0.8 + Math.random() * 0.4;          // 0.8 - 1.2
            this.efficiency = 0.8 + Math.random() * 0.4;     // Energy efficiency
            this.size = 0.8 + Math.random() * 0.4;           // Size multiplier
            this.fertility = 0.8 + Math.random() * 0.4;      // Reproduction rate
            this.immunity = 0.5 + Math.random() * 0.5;       // Disease resistance
            this.lifespan = 0.8 + Math.random() * 0.4;       // Life expectancy
            this.perception = 0.8 + Math.random() * 0.4;     // Detection range
            this.camouflage = 0.5 + Math.random() * 0.5;     // Hide from predators
        }
    }
    
    inheritTrait(val1, val2) {
        // Average parents with mutation chance
        let base = (val1 + val2) / 2;
        
        // 20% chance of mutation
        if (Math.random() < 0.2) {
            const mutation = (Math.random() - 0.5) * 0.3;
            base += mutation;
        }
        
        // Clamp to reasonable bounds
        return Math.max(0.3, Math.min(2.0, base));
    }
    
    getFitness() {
        return (this.speed + this.efficiency + this.immunity + this.fertility) / 4;
    }
    
    // Get color tint based on genetics for visual diversity
    getColorTint() {
        const r = Math.floor((this.speed - 0.8) * 100);
        const g = Math.floor((this.efficiency - 0.8) * 100);
        const b = Math.floor((this.size - 0.8) * 100);
        return { r, g, b };
    }
}

// === ENTITY CLASS ===
class Entity {
    constructor(type, x, y, parent1 = null, parent2 = null) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.id = Entity.nextId++;
        
        // Genetics
        this.genetics = new Genetics(parent1, parent2);
        
        // Energy based on genetics
        this.energy = this.getInitialEnergy();
        this.maxEnergy = this.getMaxEnergy();
        
        // Age and lifecycle
        this.age = 0;
        this.maxAge = this.getMaxAge();
        this.lifeStage = LifeStage.JUVENILE;
        this.maturityAge = this.maxAge * 0.2;
        this.elderAge = this.maxAge * 0.75;
        
        // Trail for rendering
        this.trail = [];
        this.maxTrail = 12 + Math.floor(Math.random() * 8);
        
        // Reproduction tracking
        this.cyclesSinceReproduction = 0;
        this.offspring = 0;
        
        // Disease
        this.isInfected = false;
        this.diseaseTimer = 0;
        this.isImmune = false;
        this.immuneTimer = 0;
        
        // Behavior
        this.target = null;
        this.fleeing = false;
        this.fleeTimer = 0;
        this.memory = []; // Remember food/danger locations
        this.maxMemory = 5;
        
        // Statistics
        this.kills = 0;
        this.foodEaten = 0;
        this.distanceTraveled = 0;
        this.generation = parent1 ? Math.max(parent1.generation, parent2?.generation || 0) + 1 : 1;
        
        // Parasitism
        this.host = null;
        this.parasites = [];
    }
    
    static nextId = 1;
    
    getInitialEnergy() {
        const base = {
            [EntityType.PLANT]: 60,
            [EntityType.HERBIVORE]: 80,
            [EntityType.CARNIVORE]: 100,
            [EntityType.DECOMPOSER]: 50,
            [EntityType.DEAD_MATTER]: 40,
            [EntityType.OMNIVORE]: 90,
            [EntityType.APEX_PREDATOR]: 120,
            [EntityType.PARASITE]: 40
        };
        return (base[this.type] || 50) * this.genetics.size + Math.random() * 20;
    }
    
    getMaxEnergy() {
        const base = {
            [EntityType.PLANT]: 150,
            [EntityType.HERBIVORE]: 180,
            [EntityType.CARNIVORE]: 200,
            [EntityType.DECOMPOSER]: 120,
            [EntityType.DEAD_MATTER]: 80,
            [EntityType.OMNIVORE]: 200,
            [EntityType.APEX_PREDATOR]: 250,
            [EntityType.PARASITE]: 100
        };
        return (base[this.type] || 100) * this.genetics.size;
    }
    
    getMaxAge() {
        const base = {
            [EntityType.PLANT]: 150,
            [EntityType.HERBIVORE]: 120,
            [EntityType.CARNIVORE]: 100,
            [EntityType.DECOMPOSER]: 180,
            [EntityType.DEAD_MATTER]: 40,
            [EntityType.OMNIVORE]: 110,
            [EntityType.APEX_PREDATOR]: 90,
            [EntityType.PARASITE]: 60
        };
        return (base[this.type] || 100) * this.genetics.lifespan + Math.random() * 30;
    }
    
    updateLifeStage() {
        if (this.age >= this.elderAge) {
            this.lifeStage = LifeStage.ELDER;
        } else if (this.age >= this.maturityAge) {
            this.lifeStage = LifeStage.ADULT;
        }
    }
    
    canReproduce() {
        return this.lifeStage === LifeStage.ADULT && 
               this.cyclesSinceReproduction > 10 / this.genetics.fertility;
    }
    
    addToTrail(x, y) {
        this.trail.push({ x, y, time: Date.now() });
        if (this.trail.length > this.maxTrail) {
            this.trail.shift();
        }
    }
    
    remember(x, y, type, value) {
        this.memory.push({ x, y, type, value, time: Date.now() });
        if (this.memory.length > this.maxMemory) {
            this.memory.shift();
        }
    }
    
    getEffectiveSpeed() {
        let speed = this.genetics.speed;
        if (this.lifeStage === LifeStage.JUVENILE) speed *= 0.7;
        if (this.lifeStage === LifeStage.ELDER) speed *= 0.5;
        if (this.isInfected) speed *= 0.6;
        return speed;
    }
    
    getDisplaySize() {
        let size = this.genetics.size;
        if (this.lifeStage === LifeStage.JUVENILE) size *= 0.6;
        if (this.lifeStage === LifeStage.ELDER) size *= 0.9;
        return size;
    }
}

// === TERRAIN CELL ===
class TerrainCell {
    constructor(type = TerrainType.NORMAL) {
        this.type = type;
        this.fertility = type === TerrainType.FERTILE ? 1.5 : 
                        type === TerrainType.BARREN ? 0.3 : 1.0;
        this.moisture = type === TerrainType.WATER ? 1.0 : 0.5;
        this.temperature = 0.5; // 0 = cold, 1 = hot
        this.elevation = type === TerrainType.MOUNTAIN ? 1.0 : 
                        type === TerrainType.WATER ? 0.0 : 0.5;
    }
}

// === POPULATION HISTORY ===
class PopulationHistory {
    constructor(maxLength = 500) {
        this.maxLength = maxLength;
        this.data = {
            plants: [],
            herbivores: [],
            carnivores: [],
            decomposers: [],
            omnivores: [],
            apexPredators: [],
            parasites: [],
            deadMatter: [],
            totalPopulation: [],
            o2: [],
            co2: [],
            biodiversity: [],
            avgFitness: []
        };
        this.timestamps = [];
    }
    
    record(populations, atmosphere, biodiversity, avgFitness, generation) {
        this.timestamps.push(generation);
        this.data.plants.push(populations.plants);
        this.data.herbivores.push(populations.herbivores);
        this.data.carnivores.push(populations.carnivores);
        this.data.decomposers.push(populations.decomposers);
        this.data.omnivores.push(populations.omnivores || 0);
        this.data.apexPredators.push(populations.apexPredators || 0);
        this.data.parasites.push(populations.parasites || 0);
        this.data.deadMatter.push(populations.deadMatter);
        this.data.totalPopulation.push(
            populations.plants + populations.herbivores + 
            populations.carnivores + populations.decomposers +
            (populations.omnivores || 0) + (populations.apexPredators || 0) +
            (populations.parasites || 0)
        );
        this.data.o2.push(atmosphere.o2);
        this.data.co2.push(atmosphere.co2);
        this.data.biodiversity.push(biodiversity);
        this.data.avgFitness.push(avgFitness);
        
        // Trim if too long
        if (this.timestamps.length > this.maxLength) {
            this.timestamps.shift();
            for (const key in this.data) {
                this.data[key].shift();
            }
        }
    }
    
    getRecent(count = 100) {
        const start = Math.max(0, this.timestamps.length - count);
        const result = { timestamps: this.timestamps.slice(start) };
        for (const key in this.data) {
            result[key] = this.data[key].slice(start);
        }
        return result;
    }
}

// === DISASTER SYSTEM ===
class DisasterManager {
    constructor(world) {
        this.world = world;
        this.activeDisasters = [];
        this.disasterChance = 0.001; // Per step
        this.cooldown = 0;
    }
    
    update() {
        if (this.cooldown > 0) {
            this.cooldown--;
            return;
        }
        
        // Random disaster chance
        if (Math.random() < this.disasterChance && this.world.generation > 100) {
            this.triggerRandomDisaster();
        }
        
        // Update active disasters
        this.activeDisasters = this.activeDisasters.filter(d => {
            d.duration--;
            return d.duration > 0;
        });
    }
    
    triggerRandomDisaster() {
        const types = [DisasterType.FIRE, DisasterType.FLOOD, DisasterType.DISEASE_OUTBREAK];
        const type = types[Math.floor(Math.random() * types.length)];
        this.trigger(type);
    }
    
    trigger(type) {
        const centerX = Math.floor(Math.random() * this.world.gridSize);
        const centerY = Math.floor(Math.random() * this.world.gridSize);
        const radius = 5 + Math.floor(Math.random() * 10);
        
        this.cooldown = 200;
        
        const disaster = {
            type,
            centerX,
            centerY,
            radius,
            duration: 30 + Math.floor(Math.random() * 30)
        };
        
        this.activeDisasters.push(disaster);
        
        // Apply immediate effects
        switch (type) {
            case DisasterType.FIRE:
                this.applyFire(centerX, centerY, radius);
                break;
            case DisasterType.FLOOD:
                this.applyFlood(centerX, centerY, radius);
                break;
            case DisasterType.DISEASE_OUTBREAK:
                this.applyDiseaseOutbreak(centerX, centerY, radius);
                break;
        }
        
        // Log the disaster
        if (this.world.eventLog) {
            this.world.eventLog.push({
                type: 'disaster',
                disaster: type,
                generation: this.world.generation,
                x: centerX,
                y: centerY,
                radius
            });
        }
    }
    
    applyFire(cx, cy, radius) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx*dx + dy*dy > radius*radius) continue;
                
                const x = cx + dx;
                const y = cy + dy;
                if (x < 0 || x >= this.world.gridSize || y < 0 || y >= this.world.gridSize) continue;
                
                const entity = this.world.grid[y][x];
                const terrain = this.world.terrain[y][x];
                
                // Fire doesn't affect water
                if (terrain.type === TerrainType.WATER) continue;
                
                // Kill plants and some animals
                if (entity) {
                    const survivalChance = entity.type === EntityType.PLANT ? 0.1 :
                                          entity.genetics.speed * 0.3;
                    if (Math.random() > survivalChance) {
                        this.world.grid[y][x] = new Entity(EntityType.DEAD_MATTER, x, y);
                        this.world.grid[y][x].energy = 10;
                    }
                }
                
                // Reduce fertility
                terrain.fertility *= 0.5;
            }
        }
    }
    
    applyFlood(cx, cy, radius) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx*dx + dy*dy > radius*radius) continue;
                
                const x = cx + dx;
                const y = cy + dy;
                if (x < 0 || x >= this.world.gridSize || y < 0 || y >= this.world.gridSize) continue;
                
                const entity = this.world.grid[y][x];
                const terrain = this.world.terrain[y][x];
                
                // Mountains resist flood
                if (terrain.type === TerrainType.MOUNTAIN) continue;
                
                // Kill ground-based entities
                if (entity && entity.type !== EntityType.PLANT) {
                    const survivalChance = entity.genetics.speed * 0.4;
                    if (Math.random() > survivalChance) {
                        this.world.grid[y][x] = new Entity(EntityType.DEAD_MATTER, x, y);
                        this.world.grid[y][x].energy = 15;
                    }
                }
                
                // Increase moisture
                terrain.moisture = Math.min(1, terrain.moisture + 0.3);
            }
        }
    }
    
    applyDiseaseOutbreak(cx, cy, radius) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx*dx + dy*dy > radius*radius) continue;
                
                const x = cx + dx;
                const y = cy + dy;
                if (x < 0 || x >= this.world.gridSize || y < 0 || y >= this.world.gridSize) continue;
                
                const entity = this.world.grid[y][x];
                if (entity && entity.type !== EntityType.DEAD_MATTER && entity.type !== EntityType.PLANT) {
                    // Infection based on immunity
                    if (Math.random() > entity.genetics.immunity && !entity.isImmune) {
                        entity.isInfected = true;
                        entity.diseaseTimer = 30 + Math.floor(Math.random() * 30);
                    }
                }
            }
        }
    }
}

// === MAIN ECOSYSTEM WORLD ===
class EcosystemWorld {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Grid settings
        this.gridSize = 60;
        this.cellSize = 10;
        
        // Simulation state
        this.grid = [];
        this.terrain = [];
        this.generation = 0;
        this.isRunning = false;
        this.lastUpdate = 0;
        this.updateInterval = 80;
        
        // Time systems
        this.dayLength = 100; // Cycles per day
        this.timeOfDay = 0; // 0-1, 0.5 = noon
        this.isNight = false;
        this.seasonLength = 500; // Cycles per season
        this.currentSeason = Season.SPRING;
        this.seasonTimer = 0;
        
        // Weather
        this.weather = Weather.CLEAR;
        this.weatherTimer = 0;
        this.temperature = 0.5; // Global temperature modifier
        
        // Atmosphere
        this.atmosphere = {
            o2: 50,
            co2: 50,
            sunlight: 5
        };
        
        // Populations tracking
        this.populations = {
            plants: 0,
            herbivores: 0,
            carnivores: 0,
            decomposers: 0,
            omnivores: 0,
            apexPredators: 0,
            parasites: 0,
            deadMatter: 0
        };
        
        // Initial spawn densities
        this.densities = {
            plants: 0.12,
            herbivores: 0.04,
            carnivores: 0.02,
            decomposers: 0.02,
            omnivores: 0.01,
            apexPredators: 0.005,
            parasites: 0.005
        };
        
        // Configurable settings
        this.settings = {
            plant: {
                energyCost: 0.2,
                reproEnergy: 70,
                reproCooldown: 2,
                spreadRadius: 4,
                photosynthesisRate: 0.6
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
            omnivore: {
                energyCost: 0.6,
                plantEnergy: 20,
                meatEnergy: 50,
                reproEnergy: 85,
                moveChance: 0.4
            },
            apexPredator: {
                energyCost: 1.0,
                huntEnergy: 100,
                reproEnergy: 120,
                moveChance: 0.5
            },
            parasite: {
                energyCost: 0.3,
                drainRate: 2,
                reproEnergy: 50,
                moveChance: 0.2
            },
            colony: {
                radius: 2,
                maxBonus: 0.5,
                moveBias: 0.7,
                mateRadius: 2
            },
            disease: {
                spreadChance: 0.15,
                damagePerTick: 1,
                duration: 50,
                immuneDuration: 200
            }
        };
        
        // Colors with more variety
        this.colors = {
            [EntityType.PLANT]: { fill: '#2d8f4e', light: '#4ade80', line: '#65a30d' },
            [EntityType.HERBIVORE]: { fill: '#1e5aab', light: '#3b82f6', line: '#60a5fa' },
            [EntityType.CARNIVORE]: { fill: '#c91c1c', light: '#ef4444', line: '#f87171' },
            [EntityType.DECOMPOSER]: { fill: '#d4a012', light: '#fbbf24', line: '#fcd34d' },
            [EntityType.DEAD_MATTER]: { fill: '#4a4a4a', light: '#737373', line: '#525252' },
            [EntityType.OMNIVORE]: { fill: '#7c3aed', light: '#a78bfa', line: '#c4b5fd' },
            [EntityType.APEX_PREDATOR]: { fill: '#dc2626', light: '#f87171', line: '#fca5a5' },
            [EntityType.PARASITE]: { fill: '#059669', light: '#34d399', line: '#6ee7b7' }
        };
        
        this.terrainColors = {
            [TerrainType.NORMAL]: '#0f0f18',
            [TerrainType.WATER]: '#0c2d48',
            [TerrainType.MOUNTAIN]: '#2d2d3a',
            [TerrainType.FERTILE]: '#0f1a0f',
            [TerrainType.BARREN]: '#1a1510'
        };
        
        // History tracking
        this.history = new PopulationHistory(500);
        
        // Disaster manager
        this.disasters = new DisasterManager(this);
        
        // Event log
        this.eventLog = [];
        this.maxEvents = 100;
        
        // Selection/interaction
        this.selectedEntity = null;
        this.currentTool = 'select'; // select, spawn, terrain
        this.spawnType = EntityType.PLANT;
        this.terrainBrush = TerrainType.NORMAL;
        this.brushSize = 1;
        
        // Heatmap mode
        this.heatmapMode = null; // null, 'density', 'energy', 'danger', 'fertility'
        
        // Initialize
        this.init();
    }
    
    init() {
        this.resize();
        this.initTerrain();
        this.initGrid();
        this.setupEventListeners();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }
    
    resize() {
        const container = this.canvas.parentElement;
        const maxSize = Math.min(container.clientWidth, container.clientHeight) - 40;
        const size = Math.max(400, maxSize);
        
        this.canvas.width = size;
        this.canvas.height = size;
        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';
        
        this.cellSize = size / this.gridSize;
    }
    
    initTerrain() {
        this.terrain = [];
        for (let y = 0; y < this.gridSize; y++) {
            this.terrain[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                this.terrain[y][x] = new TerrainCell(TerrainType.NORMAL);
            }
        }
        
        // Generate terrain features using noise-like patterns
        this.generateTerrain();
    }
    
    generateTerrain() {
        // Water bodies (lakes/rivers)
        const numLakes = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numLakes; i++) {
            const cx = Math.floor(Math.random() * this.gridSize);
            const cy = Math.floor(Math.random() * this.gridSize);
            const rx = 3 + Math.floor(Math.random() * 5);
            const ry = 3 + Math.floor(Math.random() * 5);
            
            for (let dy = -ry; dy <= ry; dy++) {
                for (let dx = -rx; dx <= rx; dx++) {
                    const x = cx + dx;
                    const y = cy + dy;
                    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) continue;
                    
                    if ((dx*dx)/(rx*rx) + (dy*dy)/(ry*ry) < 1) {
                        this.terrain[y][x] = new TerrainCell(TerrainType.WATER);
                    }
                }
            }
        }
        
        // Mountains
        const numMountains = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numMountains; i++) {
            const cx = Math.floor(Math.random() * this.gridSize);
            const cy = Math.floor(Math.random() * this.gridSize);
            const radius = 4 + Math.floor(Math.random() * 4);
            
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const x = cx + dx;
                    const y = cy + dy;
                    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) continue;
                    
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < radius && this.terrain[y][x].type !== TerrainType.WATER) {
                        this.terrain[y][x] = new TerrainCell(TerrainType.MOUNTAIN);
                    }
                }
            }
        }
        
        // Fertile zones (near water)
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.terrain[y][x].type !== TerrainType.NORMAL) continue;
                
                // Check for nearby water
                let nearWater = false;
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                            if (this.terrain[ny][nx].type === TerrainType.WATER) {
                                nearWater = true;
                                break;
                            }
                        }
                    }
                    if (nearWater) break;
                }
                
                if (nearWater && Math.random() < 0.6) {
                    this.terrain[y][x] = new TerrainCell(TerrainType.FERTILE);
                }
            }
        }
        
        // Some barren patches
        const numBarren = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numBarren; i++) {
            const cx = Math.floor(Math.random() * this.gridSize);
            const cy = Math.floor(Math.random() * this.gridSize);
            const radius = 3 + Math.floor(Math.random() * 3);
            
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const x = cx + dx;
                    const y = cy + dy;
                    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) continue;
                    
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < radius && this.terrain[y][x].type === TerrainType.NORMAL) {
                        if (Math.random() < 0.7) {
                            this.terrain[y][x] = new TerrainCell(TerrainType.BARREN);
                        }
                    }
                }
            }
        }
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
        this.timeOfDay = 0;
        this.seasonTimer = 0;
        this.currentSeason = Season.SPRING;
        this.updateStats();
    }
    
    setupEventListeners() {
        // Mouse click for selection/spawning
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.handleRightClick(e);
        });
    }
    
    getGridCoords(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / this.cellSize);
        const y = Math.floor((event.clientY - rect.top) / this.cellSize);
        return { x: Math.max(0, Math.min(this.gridSize - 1, x)), 
                 y: Math.max(0, Math.min(this.gridSize - 1, y)) };
    }
    
    handleClick(event) {
        const { x, y } = this.getGridCoords(event);
        
        if (this.currentTool === 'select') {
            this.selectedEntity = this.grid[y][x];
            this.updateEntityInspector();
        } else if (this.currentTool === 'spawn') {
            this.spawnAt(x, y, this.spawnType);
        } else if (this.currentTool === 'terrain') {
            this.paintTerrain(x, y, this.terrainBrush);
        } else if (this.currentTool === 'kill') {
            this.killAt(x, y);
        }
    }
    
    handleRightClick(event) {
        const { x, y } = this.getGridCoords(event);
        this.killAt(x, y);
    }
    
    handleMouseMove(event) {
        if (event.buttons === 1 && this.currentTool === 'terrain') {
            const { x, y } = this.getGridCoords(event);
            this.paintTerrain(x, y, this.terrainBrush);
        }
    }
    
    spawnAt(x, y, type) {
        if (this.terrain[y][x].type === TerrainType.WATER && type !== EntityType.PLANT) return;
        if (this.terrain[y][x].type === TerrainType.MOUNTAIN) return;
        if (this.grid[y][x]) return;
        
        this.grid[y][x] = new Entity(type, x, y);
    }
    
    killAt(x, y) {
        const entity = this.grid[y][x];
        if (entity && entity.type !== EntityType.DEAD_MATTER) {
            const dead = new Entity(EntityType.DEAD_MATTER, x, y);
            dead.energy = entity.energy * 0.5;
            this.grid[y][x] = dead;
        } else {
            this.grid[y][x] = null;
        }
    }
    
    paintTerrain(cx, cy, type) {
        for (let dy = -this.brushSize + 1; dy < this.brushSize; dy++) {
            for (let dx = -this.brushSize + 1; dx < this.brushSize; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) continue;
                
                this.terrain[y][x] = new TerrainCell(type);
                
                // Remove entities from water/mountain
                if (type === TerrainType.WATER || type === TerrainType.MOUNTAIN) {
                    if (this.grid[y][x]) {
                        this.grid[y][x] = null;
                    }
                }
            }
        }
    }
    
    updateEntityInspector() {
        const inspector = document.getElementById('entityInspector');
        if (!inspector) return;
        
        if (!this.selectedEntity) {
            inspector.innerHTML = '<div class="inspector-empty">Click an entity to inspect</div>';
            return;
        }
        
        const e = this.selectedEntity;
        const typeName = Object.keys(EntityType).find(k => EntityType[k] === e.type);
        
        inspector.innerHTML = `
            <div class="inspector-header">
                <span class="inspector-type ${typeName?.toLowerCase()}">${typeName}</span>
                <span class="inspector-id">#${e.id}</span>
            </div>
            <div class="inspector-stats">
                <div class="stat-row">
                    <span>Energy</span>
                    <div class="stat-bar">
                        <div class="stat-fill energy" style="width: ${(e.energy/e.maxEnergy)*100}%"></div>
                    </div>
                    <span>${Math.round(e.energy)}/${Math.round(e.maxEnergy)}</span>
                </div>
                <div class="stat-row">
                    <span>Age</span>
                    <div class="stat-bar">
                        <div class="stat-fill age" style="width: ${(e.age/e.maxAge)*100}%"></div>
                    </div>
                    <span>${Math.round(e.age)}/${Math.round(e.maxAge)}</span>
                </div>
                <div class="stat-row">
                    <span>Stage</span>
                    <span class="stage-badge ${e.lifeStage}">${e.lifeStage}</span>
                </div>
                <div class="stat-row">
                    <span>Generation</span>
                    <span>${e.generation}</span>
                </div>
                ${e.isInfected ? '<div class="stat-row infected"><span>⚠️ INFECTED</span></div>' : ''}
            </div>
            <div class="inspector-genetics">
                <div class="genetics-title">🧬 Genetics</div>
                <div class="genetics-grid">
                    <div class="gene"><span>Speed</span><span>${e.genetics.speed.toFixed(2)}</span></div>
                    <div class="gene"><span>Efficiency</span><span>${e.genetics.efficiency.toFixed(2)}</span></div>
                    <div class="gene"><span>Size</span><span>${e.genetics.size.toFixed(2)}</span></div>
                    <div class="gene"><span>Fertility</span><span>${e.genetics.fertility.toFixed(2)}</span></div>
                    <div class="gene"><span>Immunity</span><span>${e.genetics.immunity.toFixed(2)}</span></div>
                    <div class="gene"><span>Perception</span><span>${e.genetics.perception.toFixed(2)}</span></div>
                </div>
                <div class="fitness">Fitness: ${e.genetics.getFitness().toFixed(2)}</div>
            </div>
            <div class="inspector-stats-extra">
                <span>Offspring: ${e.offspring}</span>
                <span>Kills: ${e.kills}</span>
                <span>Food: ${e.foodEaten}</span>
            </div>
        `;
    }
    
    // === POPULATION ===
    populate() {
        this.initGrid();
        Entity.nextId = 1;
        
        // Create colony seeds for natural distribution
        const numSeeds = 6 + Math.floor(Math.random() * 4);
        const seeds = [];
        
        for (let i = 0; i < numSeeds; i++) {
            let x, y, attempts = 0;
            do {
                x = Math.floor(Math.random() * this.gridSize);
                y = Math.floor(Math.random() * this.gridSize);
                attempts++;
            } while (this.terrain[y][x].type === TerrainType.WATER || 
                     this.terrain[y][x].type === TerrainType.MOUNTAIN && attempts < 50);
            
            const types = [
                EntityType.PLANT, EntityType.PLANT, EntityType.PLANT,
                EntityType.HERBIVORE, EntityType.CARNIVORE, EntityType.DECOMPOSER,
                EntityType.OMNIVORE
            ];
            
            seeds.push({
                x, y,
                type: types[Math.floor(Math.random() * types.length)]
            });
        }
        
        // Grow colonies
        for (const seed of seeds) {
            const radius = 4 + Math.floor(Math.random() * 6);
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const x = seed.x + dx;
                    const y = seed.y + dy;
                    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) continue;
                    if (this.terrain[y][x].type === TerrainType.WATER) continue;
                    if (this.terrain[y][x].type === TerrainType.MOUNTAIN) continue;
                    if (this.grid[y][x]) continue;
                    
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const prob = Math.max(0, 1 - dist/radius) * 0.5;
                    
                    if (Math.random() < prob) {
                        this.grid[y][x] = new Entity(seed.type, x, y);
                    }
                }
            }
        }
        
        // Scatter additional entities
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x]) continue;
                if (this.terrain[y][x].type === TerrainType.WATER) continue;
                if (this.terrain[y][x].type === TerrainType.MOUNTAIN) continue;
                
                const fertility = this.terrain[y][x].fertility;
                
                if (Math.random() < this.densities.plants * fertility * 0.5) {
                    this.grid[y][x] = new Entity(EntityType.PLANT, x, y);
                } else if (Math.random() < this.densities.herbivores * 0.3) {
                    this.grid[y][x] = new Entity(EntityType.HERBIVORE, x, y);
                } else if (Math.random() < this.densities.carnivores * 0.2) {
                    this.grid[y][x] = new Entity(EntityType.CARNIVORE, x, y);
                } else if (Math.random() < this.densities.decomposers * 0.3) {
                    this.grid[y][x] = new Entity(EntityType.DECOMPOSER, x, y);
                } else if (Math.random() < this.densities.omnivores * 0.2) {
                    this.grid[y][x] = new Entity(EntityType.OMNIVORE, x, y);
                } else if (Math.random() < this.densities.apexPredators * 0.1) {
                    this.grid[y][x] = new Entity(EntityType.APEX_PREDATOR, x, y);
                } else if (Math.random() < this.densities.parasites * 0.1) {
                    this.grid[y][x] = new Entity(EntityType.PARASITE, x, y);
                }
            }
        }
        
        this.updateStats();
    }
    
    // === HELPER METHODS ===
    getNeighbors(x, y) {
        const neighbors = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                    neighbors.push({ x: nx, y: ny, entity: this.grid[ny][nx], terrain: this.terrain[ny][nx] });
                }
            }
        }
        return neighbors;
    }
    
    findEmptyNeighbor(x, y, avoidWater = true) {
        const neighbors = this.getNeighbors(x, y).filter(n => {
            if (n.entity) return false;
            if (n.terrain.type === TerrainType.MOUNTAIN) return false;
            if (avoidWater && n.terrain.type === TerrainType.WATER) return false;
            return true;
        });
        if (neighbors.length === 0) return null;
        return neighbors[Math.floor(Math.random() * neighbors.length)];
    }
    
    findNeighborOfType(x, y, type) {
        const neighbors = this.getNeighbors(x, y).filter(n => n.entity && n.entity.type === type);
        if (neighbors.length === 0) return null;
        return neighbors[Math.floor(Math.random() * neighbors.length)];
    }
    
    findEntityInRange(x, y, type, range, perception = 1) {
        const effectiveRange = Math.ceil(range * perception);
        const targets = [];
        
        for (let dy = -effectiveRange; dy <= effectiveRange; dy++) {
            for (let dx = -effectiveRange; dx <= effectiveRange; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || nx >= this.gridSize || ny < 0 || ny >= this.gridSize) continue;
                
                const entity = this.grid[ny][nx];
                if (entity && entity.type === type) {
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist <= effectiveRange) {
                        targets.push({ x: nx, y: ny, entity, dist });
                    }
                }
            }
        }
        
        if (targets.length === 0) return null;
        
        // Return closest
        targets.sort((a, b) => a.dist - b.dist);
        return targets[0];
    }
    
    countNearbyOfType(x, y, type, radius = 2) {
        let count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                    const entity = this.grid[ny][nx];
                    if (entity && entity.type === type) count++;
                }
            }
        }
        return count;
    }
    
    getColonyBonus(x, y, type) {
        const radius = this.settings.colony.radius;
        const maxBonus = this.settings.colony.maxBonus;
        const nearbyCount = this.countNearbyOfType(x, y, type, radius);
        return Math.min(nearbyCount * (maxBonus / 5), maxBonus);
    }
    
    findColonyBiasedMove(x, y, type, avoidWater = true) {
        const emptyNeighbors = this.getNeighbors(x, y).filter(n => {
            if (n.entity) return false;
            if (n.terrain.type === TerrainType.MOUNTAIN) return false;
            if (avoidWater && n.terrain.type === TerrainType.WATER) return false;
            return true;
        });
        
        if (emptyNeighbors.length === 0) return null;
        
        if (Math.random() > this.settings.colony.moveBias) {
            return emptyNeighbors[Math.floor(Math.random() * emptyNeighbors.length)];
        }
        
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
    
    findMate(x, y, type, radius = 2) {
        const potentialMates = [];
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                    const entity = this.grid[ny][nx];
                    if (entity && entity.type === type && 
                        entity.canReproduce() && entity.energy > 40) {
                        potentialMates.push({ x: nx, y: ny, entity });
                    }
                }
            }
        }
        if (potentialMates.length === 0) return null;
        return potentialMates[Math.floor(Math.random() * potentialMates.length)];
    }
    
    moveToward(entity, targetX, targetY) {
        const dx = Math.sign(targetX - entity.x);
        const dy = Math.sign(targetY - entity.y);
        
        const nx = entity.x + dx;
        const ny = entity.y + dy;
        
        if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
            if (!this.grid[ny][nx] && 
                this.terrain[ny][nx].type !== TerrainType.MOUNTAIN &&
                this.terrain[ny][nx].type !== TerrainType.WATER) {
                return { x: nx, y: ny };
            }
        }
        
        return this.findEmptyNeighbor(entity.x, entity.y);
    }
    
    moveAwayFrom(entity, threatX, threatY) {
        const dx = Math.sign(entity.x - threatX);
        const dy = Math.sign(entity.y - threatY);
        
        const nx = entity.x + dx;
        const ny = entity.y + dy;
        
        if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
            if (!this.grid[ny][nx] && 
                this.terrain[ny][nx].type !== TerrainType.MOUNTAIN &&
                this.terrain[ny][nx].type !== TerrainType.WATER) {
                return { x: nx, y: ny };
            }
        }
        
        return this.findEmptyNeighbor(entity.x, entity.y);
    }
    
    // === TIME & WEATHER ===
    updateTime() {
        // Day/night cycle
        this.timeOfDay = (this.generation % this.dayLength) / this.dayLength;
        this.isNight = this.timeOfDay < 0.25 || this.timeOfDay > 0.75;
        
        // Season progression
        this.seasonTimer++;
        if (this.seasonTimer >= this.seasonLength) {
            this.seasonTimer = 0;
            const seasons = [Season.SPRING, Season.SUMMER, Season.FALL, Season.WINTER];
            const currentIndex = seasons.indexOf(this.currentSeason);
            this.currentSeason = seasons[(currentIndex + 1) % 4];
        }
        
        // Update global temperature based on season and time
        const seasonTemp = {
            [Season.SPRING]: 0.5,
            [Season.SUMMER]: 0.8,
            [Season.FALL]: 0.4,
            [Season.WINTER]: 0.2
        };
        const dayNightMod = this.isNight ? -0.1 : 0.1;
        this.temperature = seasonTemp[this.currentSeason] + dayNightMod;
        
        // Weather changes
        this.weatherTimer--;
        if (this.weatherTimer <= 0) {
            this.changeWeather();
        }
        
        // Apply weather effects
        this.applyWeatherEffects();
    }
    
    changeWeather() {
        const weatherChances = {
            [Weather.CLEAR]: 0.5,
            [Weather.RAIN]: 0.3,
            [Weather.DROUGHT]: 0.1,
            [Weather.STORM]: 0.1
        };
        
        // Adjust chances based on season
        if (this.currentSeason === Season.SUMMER) {
            weatherChances[Weather.DROUGHT] = 0.25;
            weatherChances[Weather.RAIN] = 0.15;
        } else if (this.currentSeason === Season.SPRING) {
            weatherChances[Weather.RAIN] = 0.4;
        }
        
        const rand = Math.random();
        let cumulative = 0;
        for (const [weather, chance] of Object.entries(weatherChances)) {
            cumulative += chance;
            if (rand < cumulative) {
                this.weather = weather;
                break;
            }
        }
        
        this.weatherTimer = 50 + Math.floor(Math.random() * 100);
    }
    
    applyWeatherEffects() {
        switch (this.weather) {
            case Weather.RAIN:
                // Increase moisture, boost plants
                for (let y = 0; y < this.gridSize; y++) {
                    for (let x = 0; x < this.gridSize; x++) {
                        this.terrain[y][x].moisture = Math.min(1, this.terrain[y][x].moisture + 0.001);
                    }
                }
                break;
                
            case Weather.DROUGHT:
                // Decrease moisture, hurt plants
                for (let y = 0; y < this.gridSize; y++) {
                    for (let x = 0; x < this.gridSize; x++) {
                        this.terrain[y][x].moisture = Math.max(0, this.terrain[y][x].moisture - 0.002);
                    }
                }
                break;
                
            case Weather.STORM:
                // Random lightning strikes (rare deaths)
                if (Math.random() < 0.01) {
                    const x = Math.floor(Math.random() * this.gridSize);
                    const y = Math.floor(Math.random() * this.gridSize);
                    if (this.grid[y][x] && this.terrain[y][x].type !== TerrainType.WATER) {
                        this.grid[y][x] = new Entity(EntityType.DEAD_MATTER, x, y);
                    }
                }
                break;
        }
    }
    
    getSunlightModifier() {
        let mod = 1.0;
        
        // Day/night
        if (this.isNight) mod *= 0.2;
        
        // Season
        if (this.currentSeason === Season.SUMMER) mod *= 1.3;
        else if (this.currentSeason === Season.WINTER) mod *= 0.5;
        
        // Weather
        if (this.weather === Weather.RAIN) mod *= 0.6;
        else if (this.weather === Weather.STORM) mod *= 0.3;
        
        return mod;
    }
    
    // === DISEASE SYSTEM ===
    processDisease(entity) {
        if (entity.isInfected) {
            entity.energy -= this.settings.disease.damagePerTick;
            entity.diseaseTimer--;
            
            // Spread to neighbors
            const neighbors = this.getNeighbors(entity.x, entity.y);
            for (const n of neighbors) {
                if (n.entity && !n.entity.isInfected && !n.entity.isImmune &&
                    n.entity.type !== EntityType.PLANT && n.entity.type !== EntityType.DEAD_MATTER) {
                    if (Math.random() < this.settings.disease.spreadChance * (1 - n.entity.genetics.immunity)) {
                        n.entity.isInfected = true;
                        n.entity.diseaseTimer = this.settings.disease.duration;
                    }
                }
            }
            
            // Recovery or death
            if (entity.diseaseTimer <= 0) {
                entity.isInfected = false;
                entity.isImmune = true;
                entity.immuneTimer = this.settings.disease.immuneDuration;
            }
        }
        
        // Immunity timer
        if (entity.isImmune) {
            entity.immuneTimer--;
            if (entity.immuneTimer <= 0) {
                entity.isImmune = false;
            }
        }
    }
    
    // === ENTITY PROCESSORS ===
    processPlant(entity, x, y) {
        const settings = this.settings.plant;
        const terrain = this.terrain[y][x];
        const colonyBonus = this.getColonyBonus(x, y, EntityType.PLANT);
        
        // Photosynthesis based on conditions
        if (this.atmosphere.co2 > 3) {
            const sunMod = this.getSunlightModifier();
            const fertilityMod = terrain.fertility;
            const moistureMod = terrain.moisture;
            
            const rate = this.atmosphere.sunlight * settings.photosynthesisRate * 
                        sunMod * fertilityMod * moistureMod * 
                        entity.genetics.efficiency * (1 + colonyBonus * 0.2);
            
            entity.energy += rate;
            this.atmosphere.co2 = Math.max(0, this.atmosphere.co2 - 0.02);
            this.atmosphere.o2 = Math.min(100, this.atmosphere.o2 + 0.04);
        } else {
            entity.energy -= 0.5;
        }
        
        // Seasonal effects
        if (this.currentSeason === Season.WINTER) {
            entity.energy -= 0.3; // Winter stress
        }
        
        // Energy cost
        const cost = settings.energyCost * (1 - colonyBonus * 0.1) / entity.genetics.efficiency;
        entity.energy -= Math.max(0.1, cost);
        entity.age++;
        entity.cyclesSinceReproduction++;
        entity.updateLifeStage();
        
        // Trail/roots
        if (Math.random() < 0.08) {
            entity.addToTrail(x + (Math.random() - 0.5) * 2, y + (Math.random() - 0.5) * 2);
        }
        
        // Reproduction
        const nearbyPlants = this.countNearbyOfType(x, y, EntityType.PLANT, settings.spreadRadius);
        if (entity.energy > settings.reproEnergy * entity.genetics.size &&
            entity.canReproduce() && nearbyPlants > 0 &&
            terrain.fertility > 0.3) {
            
            const reproChance = 0.3 * entity.genetics.fertility * terrain.fertility;
            if (Math.random() < reproChance) {
                const empty = this.findColonyBiasedMove(x, y, EntityType.PLANT);
                if (empty && this.terrain[empty.y][empty.x].type !== TerrainType.WATER) {
                    const mate = this.findMate(x, y, EntityType.PLANT, 3);
                    const parent2 = mate ? mate.entity : entity; // Self-pollinate if no mate
                    
                    const offspring = new Entity(EntityType.PLANT, empty.x, empty.y, entity, parent2);
                    this.grid[empty.y][empty.x] = offspring;
                    entity.energy -= settings.reproEnergy * 0.3;
                    entity.offspring++;
                    entity.cyclesSinceReproduction = 0;
                }
            }
        }
        
        // Death
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            const dead = new Entity(EntityType.DEAD_MATTER, x, y);
            dead.energy = entity.energy * 0.3 + 15;
            dead.trail = entity.trail.slice();
            this.grid[y][x] = dead;
            return false;
        }
        
        return true;
    }
    
    processHerbivore(entity, x, y) {
        const settings = this.settings.herbivore;
        const colonyBonus = this.getColonyBonus(x, y, EntityType.HERBIVORE);
        
        this.processDisease(entity);
        
        // Respiration
        if (this.atmosphere.o2 > 8) {
            this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.012);
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.008);
        } else {
            entity.energy -= 3 * (1 - colonyBonus * 0.5);
        }
        
        // Check for predators (flee behavior)
        const predator = this.findEntityInRange(x, y, EntityType.CARNIVORE, 3, entity.genetics.perception);
        const apex = this.findEntityInRange(x, y, EntityType.APEX_PREDATOR, 4, entity.genetics.perception);
        
        if ((predator || apex) && !entity.fleeing) {
            entity.fleeing = true;
            entity.fleeTimer = 10;
            entity.remember(predator?.x || apex?.x, predator?.y || apex?.y, 'danger', 1);
        }
        
        // Eating
        if (!entity.fleeing) {
            const plant = this.findNeighborOfType(x, y, EntityType.PLANT);
            if (plant && entity.energy < entity.maxEnergy * 0.8) {
                const plantEntity = this.grid[plant.y][plant.x];
                const energyGain = Math.min(plantEntity.energy, settings.foodEnergy) * entity.genetics.efficiency;
                entity.energy += energyGain;
                entity.foodEaten++;
                this.grid[plant.y][plant.x] = null;
            }
        }
        
        // Movement
        const moveChance = entity.fleeing ? 0.9 : settings.moveChance;
        if (Math.random() < moveChance * entity.getEffectiveSpeed()) {
            let target = null;
            
            if (entity.fleeing) {
                const threat = predator || apex;
                if (threat) {
                    target = this.moveAwayFrom(entity, threat.x, threat.y);
                }
                entity.fleeTimer--;
                if (entity.fleeTimer <= 0) entity.fleeing = false;
            } else if (entity.energy < entity.maxEnergy * 0.5) {
                // Look for food
                const food = this.findEntityInRange(x, y, EntityType.PLANT, 4, entity.genetics.perception);
                if (food) {
                    target = this.moveToward(entity, food.x, food.y);
                }
            }
            
            if (!target) {
                target = this.findColonyBiasedMove(x, y, EntityType.HERBIVORE);
            }
            
            if (target) {
                entity.addToTrail(x, y);
                entity.distanceTraveled++;
                this.grid[y][x] = null;
                this.grid[target.y][target.x] = entity;
                entity.x = target.x;
                entity.y = target.y;
            }
        }
        
        // Energy cost
        const cost = settings.energyCost * (entity.lifeStage === LifeStage.ELDER ? 1.3 : 1) / entity.genetics.efficiency;
        entity.energy -= Math.max(0.2, cost - colonyBonus * 0.1);
        entity.energy += colonyBonus * 0.1;
        entity.age++;
        entity.cyclesSinceReproduction++;
        entity.updateLifeStage();
        
        // Reproduction
        if (entity.energy > settings.reproEnergy && entity.canReproduce()) {
            const mate = this.findMate(entity.x, entity.y, EntityType.HERBIVORE, this.settings.colony.mateRadius);
            if (mate) {
                const empty = this.findColonyBiasedMove(entity.x, entity.y, EntityType.HERBIVORE);
                if (empty) {
                    const offspring = new Entity(EntityType.HERBIVORE, empty.x, empty.y, entity, mate.entity);
                    this.grid[empty.y][empty.x] = offspring;
                    entity.energy -= settings.reproEnergy * 0.35;
                    mate.entity.energy -= settings.reproEnergy * 0.25;
                    entity.offspring++;
                    mate.entity.offspring++;
                    entity.cyclesSinceReproduction = 0;
                }
            }
        }
        
        // Death
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            const dead = new Entity(EntityType.DEAD_MATTER, entity.x, entity.y);
            dead.energy = 30;
            dead.trail = entity.trail.slice();
            this.grid[entity.y][entity.x] = dead;
            return false;
        }
        
        return true;
    }
    
    processCarnivore(entity, x, y) {
        const settings = this.settings.carnivore;
        const packBonus = this.getColonyBonus(x, y, EntityType.CARNIVORE);
        
        this.processDisease(entity);
        
        // Respiration
        if (this.atmosphere.o2 > 8) {
            this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.015);
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.012);
        } else {
            entity.energy -= 4 * (1 - packBonus * 0.5);
        }
        
        // Hunting with intelligence
        let hunted = false;
        const preyTypes = [EntityType.HERBIVORE, EntityType.OMNIVORE];
        
        for (const preyType of preyTypes) {
            const prey = this.findNeighborOfType(x, y, preyType);
            if (prey && entity.energy < entity.maxEnergy * 0.9) {
                const preyEntity = this.grid[prey.y][prey.x];
                
                // Hunt success based on genetics
                const huntSuccess = 0.6 + packBonus * 0.2 + 
                                   (entity.genetics.speed - preyEntity.genetics.speed) * 0.2 -
                                   preyEntity.genetics.camouflage * 0.2;
                
                if (Math.random() < huntSuccess) {
                    const energyGain = Math.min(preyEntity.energy * 0.8, settings.huntEnergy) * 
                                      entity.genetics.efficiency * (1 + packBonus * 0.2);
                    entity.energy += energyGain;
                    entity.kills++;
                    entity.foodEaten++;
                    
                    const dead = new Entity(EntityType.DEAD_MATTER, prey.x, prey.y);
                    dead.energy = preyEntity.energy * 0.2;
                    this.grid[prey.y][prey.x] = dead;
                    hunted = true;
                    break;
                }
            }
        }
        
        // Movement (hunt or pack movement)
        if (Math.random() < settings.moveChance * entity.getEffectiveSpeed()) {
            let target = null;
            
            // Search for prey if hungry
            if (entity.energy < entity.maxEnergy * 0.6) {
                for (const preyType of preyTypes) {
                    const prey = this.findEntityInRange(x, y, preyType, 5, entity.genetics.perception);
                    if (prey) {
                        target = this.moveToward(entity, prey.x, prey.y);
                        break;
                    }
                }
            }
            
            if (!target) {
                target = this.findColonyBiasedMove(x, y, EntityType.CARNIVORE);
            }
            
            if (target) {
                entity.addToTrail(x, y);
                entity.distanceTraveled++;
                this.grid[y][x] = null;
                this.grid[target.y][target.x] = entity;
                entity.x = target.x;
                entity.y = target.y;
            }
        }
        
        // Energy cost
        const cost = settings.energyCost * (entity.lifeStage === LifeStage.ELDER ? 1.4 : 1) / entity.genetics.efficiency;
        entity.energy -= Math.max(0.3, cost - packBonus * 0.15);
        entity.energy += packBonus * 0.08;
        entity.age++;
        entity.cyclesSinceReproduction++;
        entity.updateLifeStage();
        
        // Reproduction
        if (entity.energy > settings.reproEnergy && entity.canReproduce()) {
            const mate = this.findMate(entity.x, entity.y, EntityType.CARNIVORE, this.settings.colony.mateRadius);
            if (mate) {
                const empty = this.findColonyBiasedMove(entity.x, entity.y, EntityType.CARNIVORE);
                if (empty) {
                    const offspring = new Entity(EntityType.CARNIVORE, empty.x, empty.y, entity, mate.entity);
                    this.grid[empty.y][empty.x] = offspring;
                    entity.energy -= settings.reproEnergy * 0.35;
                    mate.entity.energy -= settings.reproEnergy * 0.25;
                    entity.offspring++;
                    mate.entity.offspring++;
                    entity.cyclesSinceReproduction = 0;
                }
            }
        }
        
        // Death
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            const dead = new Entity(EntityType.DEAD_MATTER, entity.x, entity.y);
            dead.energy = 35;
            dead.trail = entity.trail.slice();
            this.grid[entity.y][entity.x] = dead;
            return false;
        }
        
        return true;
    }
    
    processOmnivore(entity, x, y) {
        const settings = this.settings.omnivore;
        const colonyBonus = this.getColonyBonus(x, y, EntityType.OMNIVORE);
        
        this.processDisease(entity);
        
        // Respiration
        if (this.atmosphere.o2 > 8) {
            this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.013);
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.01);
        } else {
            entity.energy -= 3.5 * (1 - colonyBonus * 0.5);
        }
        
        // Check for predators
        const apex = this.findEntityInRange(x, y, EntityType.APEX_PREDATOR, 4, entity.genetics.perception);
        if (apex && !entity.fleeing) {
            entity.fleeing = true;
            entity.fleeTimer = 8;
        }
        
        // Eating (plants or meat)
        if (!entity.fleeing) {
            // Prefer plants if abundant, otherwise hunt
            const plant = this.findNeighborOfType(x, y, EntityType.PLANT);
            const prey = this.findNeighborOfType(x, y, EntityType.HERBIVORE);
            const dead = this.findNeighborOfType(x, y, EntityType.DEAD_MATTER);
            
            if (dead && entity.energy < entity.maxEnergy * 0.9) {
                // Scavenge first
                const deadEntity = this.grid[dead.y][dead.x];
                entity.energy += deadEntity.energy * 0.6 * entity.genetics.efficiency;
                entity.foodEaten++;
                this.grid[dead.y][dead.x] = null;
            } else if (plant && entity.energy < entity.maxEnergy * 0.7) {
                const plantEntity = this.grid[plant.y][plant.x];
                entity.energy += Math.min(plantEntity.energy, settings.plantEnergy) * entity.genetics.efficiency;
                entity.foodEaten++;
                this.grid[plant.y][plant.x] = null;
            } else if (prey && entity.energy < entity.maxEnergy * 0.5) {
                const preyEntity = this.grid[prey.y][prey.x];
                const huntSuccess = 0.4 + (entity.genetics.speed - preyEntity.genetics.speed) * 0.3;
                
                if (Math.random() < huntSuccess) {
                    entity.energy += Math.min(preyEntity.energy * 0.7, settings.meatEnergy) * entity.genetics.efficiency;
                    entity.kills++;
                    entity.foodEaten++;
                    
                    const deadMatter = new Entity(EntityType.DEAD_MATTER, prey.x, prey.y);
                    deadMatter.energy = preyEntity.energy * 0.2;
                    this.grid[prey.y][prey.x] = deadMatter;
                }
            }
        }
        
        // Movement
        const moveChance = entity.fleeing ? 0.85 : settings.moveChance;
        if (Math.random() < moveChance * entity.getEffectiveSpeed()) {
            let target = null;
            
            if (entity.fleeing && apex) {
                target = this.moveAwayFrom(entity, apex.x, apex.y);
                entity.fleeTimer--;
                if (entity.fleeTimer <= 0) entity.fleeing = false;
            } else {
                target = this.findColonyBiasedMove(x, y, EntityType.OMNIVORE);
            }
            
            if (target) {
                entity.addToTrail(x, y);
                entity.distanceTraveled++;
                this.grid[y][x] = null;
                this.grid[target.y][target.x] = entity;
                entity.x = target.x;
                entity.y = target.y;
            }
        }
        
        // Energy cost
        const cost = settings.energyCost / entity.genetics.efficiency;
        entity.energy -= Math.max(0.25, cost - colonyBonus * 0.1);
        entity.age++;
        entity.cyclesSinceReproduction++;
        entity.updateLifeStage();
        
        // Reproduction
        if (entity.energy > settings.reproEnergy && entity.canReproduce()) {
            const mate = this.findMate(entity.x, entity.y, EntityType.OMNIVORE, this.settings.colony.mateRadius);
            if (mate) {
                const empty = this.findColonyBiasedMove(entity.x, entity.y, EntityType.OMNIVORE);
                if (empty) {
                    const offspring = new Entity(EntityType.OMNIVORE, empty.x, empty.y, entity, mate.entity);
                    this.grid[empty.y][empty.x] = offspring;
                    entity.energy -= settings.reproEnergy * 0.35;
                    mate.entity.energy -= settings.reproEnergy * 0.25;
                    entity.offspring++;
                    entity.cyclesSinceReproduction = 0;
                }
            }
        }
        
        // Death
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            const dead = new Entity(EntityType.DEAD_MATTER, entity.x, entity.y);
            dead.energy = 30;
            dead.trail = entity.trail.slice();
            this.grid[entity.y][entity.x] = dead;
            return false;
        }
        
        return true;
    }
    
    processApexPredator(entity, x, y) {
        const settings = this.settings.apexPredator;
        const packBonus = this.getColonyBonus(x, y, EntityType.APEX_PREDATOR);
        
        this.processDisease(entity);
        
        // Respiration
        if (this.atmosphere.o2 > 10) {
            this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.02);
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.018);
        } else {
            entity.energy -= 5 * (1 - packBonus * 0.3);
        }
        
        // Hunting (can eat carnivores too!)
        const preyTypes = [EntityType.HERBIVORE, EntityType.OMNIVORE, EntityType.CARNIVORE];
        
        for (const preyType of preyTypes) {
            const prey = this.findNeighborOfType(x, y, preyType);
            if (prey && entity.energy < entity.maxEnergy * 0.9) {
                const preyEntity = this.grid[prey.y][prey.x];
                
                const huntSuccess = 0.7 + packBonus * 0.15 + 
                                   entity.genetics.speed * 0.1 -
                                   preyEntity.genetics.speed * 0.05;
                
                if (Math.random() < huntSuccess) {
                    const energyGain = Math.min(preyEntity.energy * 0.85, settings.huntEnergy) * 
                                      entity.genetics.efficiency;
                    entity.energy += energyGain;
                    entity.kills++;
                    entity.foodEaten++;
                    
                    const dead = new Entity(EntityType.DEAD_MATTER, prey.x, prey.y);
                    dead.energy = preyEntity.energy * 0.15;
                    this.grid[prey.y][prey.x] = dead;
                    break;
                }
            }
        }
        
        // Movement (territorial, hunts actively)
        if (Math.random() < settings.moveChance * entity.getEffectiveSpeed()) {
            let target = null;
            
            if (entity.energy < entity.maxEnergy * 0.7) {
                for (const preyType of preyTypes) {
                    const prey = this.findEntityInRange(x, y, preyType, 6, entity.genetics.perception);
                    if (prey) {
                        target = this.moveToward(entity, prey.x, prey.y);
                        break;
                    }
                }
            }
            
            if (!target) {
                target = this.findEmptyNeighbor(x, y);
            }
            
            if (target) {
                entity.addToTrail(x, y);
                entity.distanceTraveled++;
                this.grid[y][x] = null;
                this.grid[target.y][target.x] = entity;
                entity.x = target.x;
                entity.y = target.y;
            }
        }
        
        // Energy cost (high metabolism)
        const cost = settings.energyCost / entity.genetics.efficiency;
        entity.energy -= Math.max(0.5, cost);
        entity.age++;
        entity.cyclesSinceReproduction++;
        entity.updateLifeStage();
        
        // Reproduction (rare)
        if (entity.energy > settings.reproEnergy && entity.canReproduce()) {
            const mate = this.findMate(entity.x, entity.y, EntityType.APEX_PREDATOR, 3);
            if (mate) {
                const empty = this.findEmptyNeighbor(entity.x, entity.y);
                if (empty) {
                    const offspring = new Entity(EntityType.APEX_PREDATOR, empty.x, empty.y, entity, mate.entity);
                    this.grid[empty.y][empty.x] = offspring;
                    entity.energy -= settings.reproEnergy * 0.4;
                    mate.entity.energy -= settings.reproEnergy * 0.3;
                    entity.offspring++;
                    entity.cyclesSinceReproduction = 0;
                }
            }
        }
        
        // Death
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            const dead = new Entity(EntityType.DEAD_MATTER, entity.x, entity.y);
            dead.energy = 50;
            dead.trail = entity.trail.slice();
            this.grid[entity.y][entity.x] = dead;
            return false;
        }
        
        return true;
    }
    
    processParasite(entity, x, y) {
        const settings = this.settings.parasite;
        
        this.processDisease(entity);
        
        // Very low respiration
        this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.003);
        this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.002);
        
        // Find host
        if (!entity.host) {
            const hostTypes = [EntityType.HERBIVORE, EntityType.OMNIVORE, EntityType.CARNIVORE];
            for (const hostType of hostTypes) {
                const potential = this.findNeighborOfType(x, y, hostType);
                if (potential) {
                    const hostEntity = this.grid[potential.y][potential.x];
                    if (hostEntity.parasites.length < 3) { // Max 3 parasites per host
                        entity.host = hostEntity;
                        hostEntity.parasites.push(entity);
                        break;
                    }
                }
            }
        }
        
        // Drain from host
        if (entity.host && entity.host.energy > 0) {
            const drain = settings.drainRate * entity.genetics.efficiency;
            entity.host.energy -= drain;
            entity.energy += drain * 0.8;
            entity.foodEaten++;
            
            // Random infection chance
            if (Math.random() < 0.02 && !entity.host.isInfected && !entity.host.isImmune) {
                entity.host.isInfected = true;
                entity.host.diseaseTimer = 40;
            }
            
            // Check if host died
            if (entity.host.energy <= 0) {
                entity.host.parasites = entity.host.parasites.filter(p => p !== entity);
                entity.host = null;
            }
        } else {
            entity.host = null;
        }
        
        // Movement (slow, looking for hosts)
        if (!entity.host && Math.random() < settings.moveChance * entity.getEffectiveSpeed()) {
            const target = this.findEmptyNeighbor(x, y);
            if (target) {
                entity.addToTrail(x, y);
                this.grid[y][x] = null;
                this.grid[target.y][target.x] = entity;
                entity.x = target.x;
                entity.y = target.y;
            }
        }
        
        // Energy cost
        entity.energy -= settings.energyCost;
        entity.age++;
        entity.cyclesSinceReproduction++;
        entity.updateLifeStage();
        
        // Reproduction
        if (entity.energy > settings.reproEnergy && entity.canReproduce()) {
            const empty = this.findEmptyNeighbor(entity.x, entity.y);
            if (empty) {
                const offspring = new Entity(EntityType.PARASITE, empty.x, empty.y, entity, entity);
                this.grid[empty.y][empty.x] = offspring;
                entity.energy -= settings.reproEnergy * 0.5;
                entity.offspring++;
                entity.cyclesSinceReproduction = 0;
            }
        }
        
        // Death
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            if (entity.host) {
                entity.host.parasites = entity.host.parasites.filter(p => p !== entity);
            }
            this.grid[entity.y][entity.x] = null;
            return false;
        }
        
        return true;
    }
    
    processDecomposer(entity, x, y) {
        const colonyBonus = this.getColonyBonus(x, y, EntityType.DECOMPOSER);
        
        this.processDisease(entity);
        
        // Minimal respiration
        this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.004);
        this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.008);
        
        // Decompose dead matter
        const dead = this.findNeighborOfType(x, y, EntityType.DEAD_MATTER);
        if (dead) {
            const deadEntity = this.grid[dead.y][dead.x];
            const efficiency = (1 + colonyBonus * 0.3) * entity.genetics.efficiency;
            entity.energy += deadEntity.energy * 0.7 * efficiency;
            entity.foodEaten++;
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.2);
            
            // Increase local fertility
            this.terrain[dead.y][dead.x].fertility = Math.min(2, 
                this.terrain[dead.y][dead.x].fertility + 0.1);
            
            this.grid[dead.y][dead.x] = null;
        }
        
        // Movement
        if (Math.random() < 0.2 * entity.getEffectiveSpeed()) {
            let target = null;
            
            // Look for dead matter
            const deadNearby = this.findEntityInRange(x, y, EntityType.DEAD_MATTER, 4, entity.genetics.perception);
            if (deadNearby) {
                target = this.moveToward(entity, deadNearby.x, deadNearby.y);
            } else {
                target = this.findColonyBiasedMove(x, y, EntityType.DECOMPOSER);
            }
            
            if (target) {
                entity.addToTrail(x, y);
                this.grid[y][x] = null;
                this.grid[target.y][target.x] = entity;
                entity.x = target.x;
                entity.y = target.y;
            }
        }
        
        // Energy cost
        entity.energy -= Math.max(0.1, 0.2 - colonyBonus * 0.05);
        entity.age++;
        entity.cyclesSinceReproduction++;
        entity.updateLifeStage();
        
        // Reproduction
        if (entity.energy > 50 && entity.canReproduce()) {
            const mate = this.findMate(entity.x, entity.y, EntityType.DECOMPOSER);
            if (mate) {
                const empty = this.findColonyBiasedMove(entity.x, entity.y, EntityType.DECOMPOSER);
                if (empty) {
                    const offspring = new Entity(EntityType.DECOMPOSER, empty.x, empty.y, entity, mate.entity);
                    this.grid[empty.y][empty.x] = offspring;
                    entity.energy -= 15;
                    mate.entity.energy -= 10;
                    entity.offspring++;
                    entity.cyclesSinceReproduction = 0;
                }
            }
        }
        
        // Death
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            this.grid[entity.y][entity.x] = null;
            return false;
        }
        
        return true;
    }
    
    processDeadMatter(entity, x, y) {
        entity.energy -= 0.3;
        entity.age++;
        
        // Decay contributes to atmosphere
        this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.01);
        
        // Increase local fertility as matter decays
        this.terrain[y][x].fertility = Math.min(2, this.terrain[y][x].fertility + 0.005);
        
        if (entity.energy <= 0 || entity.age > entity.maxAge) {
            this.grid[y][x] = null;
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.1);
            return false;
        }
        
        return true;
    }
    
    // === SIMULATION STEP ===
    step() {
        // Update time and weather
        this.updateTime();
        
        // Update disasters
        this.disasters.update();
        
        // Collect all entities
        const entities = [];
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x]) {
                    entities.push({ entity: this.grid[y][x], x, y });
                }
            }
        }
        
        // Shuffle for randomness
        for (let i = entities.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [entities[i], entities[j]] = [entities[j], entities[i]];
        }
        
        // Process each entity
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
                case EntityType.OMNIVORE:
                    this.processOmnivore(entity, x, y);
                    break;
                case EntityType.APEX_PREDATOR:
                    this.processApexPredator(entity, x, y);
                    break;
                case EntityType.PARASITE:
                    this.processParasite(entity, x, y);
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
        
        // Record history every 5 generations
        if (this.generation % 5 === 0) {
            const biodiversity = this.calculateBiodiversity();
            const avgFitness = this.calculateAverageFitness();
            this.history.record(this.populations, this.atmosphere, biodiversity, avgFitness, this.generation);
        }
        
        // Update selected entity inspector
        if (this.selectedEntity) {
            this.updateEntityInspector();
        }
    }
    
    calculateBiodiversity() {
        const counts = [
            this.populations.plants,
            this.populations.herbivores,
            this.populations.carnivores,
            this.populations.decomposers,
            this.populations.omnivores,
            this.populations.apexPredators,
            this.populations.parasites
        ].filter(c => c > 0);
        
        if (counts.length === 0) return 0;
        
        const total = counts.reduce((a, b) => a + b, 0);
        let entropy = 0;
        
        for (const count of counts) {
            const p = count / total;
            if (p > 0) {
                entropy -= p * Math.log(p);
            }
        }
        
        // Normalize to 0-1 range
        const maxEntropy = Math.log(counts.length);
        return maxEntropy > 0 ? entropy / maxEntropy : 0;
    }
    
    calculateAverageFitness() {
        let total = 0;
        let count = 0;
        
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const entity = this.grid[y][x];
                if (entity && entity.genetics) {
                    total += entity.genetics.getFitness();
                    count++;
                }
            }
        }
        
        return count > 0 ? total / count : 0;
    }
    
    updateStats() {
        this.populations = {
            plants: 0,
            herbivores: 0,
            carnivores: 0,
            decomposers: 0,
            omnivores: 0,
            apexPredators: 0,
            parasites: 0,
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
                        case EntityType.OMNIVORE: this.populations.omnivores++; break;
                        case EntityType.APEX_PREDATOR: this.populations.apexPredators++; break;
                        case EntityType.PARASITE: this.populations.parasites++; break;
                    }
                }
            }
        }
    }
    
    // === RENDERING ===
    render() {
        const ctx = this.ctx;
        const size = this.canvas.width;
        
        // Clear with dark background
        ctx.fillStyle = '#08080c';
        ctx.fillRect(0, 0, size, size);
        
        // Draw terrain first
        this.drawTerrain(ctx);
        
        // Draw grid overlay
        this.drawGrid(ctx, size);
        
        // Heatmap overlay if active
        if (this.heatmapMode) {
            this.drawHeatmap(ctx);
        }
        
        // Draw disaster effects
        this.drawDisasterEffects(ctx);
        
        // Draw entity trails
        this.drawTrails(ctx);
        
        // Draw connections between same-type entities
        this.drawConnections(ctx);
        
        // Draw entities
        this.drawEntities(ctx);
        
        // Draw day/night overlay
        this.drawDayNightOverlay(ctx, size);
        
        // Draw weather effects
        this.drawWeatherEffects(ctx, size);
        
        // Draw selection highlight
        if (this.selectedEntity) {
            this.drawSelectionHighlight(ctx);
        }
    }
    
    drawTerrain(ctx) {
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const terrain = this.terrain[y][x];
                const px = x * this.cellSize;
                const py = y * this.cellSize;
                
                ctx.fillStyle = this.terrainColors[terrain.type];
                ctx.fillRect(px, py, this.cellSize, this.cellSize);
                
                // Fertility indicator for fertile land
                if (terrain.type === TerrainType.FERTILE && terrain.fertility > 1.2) {
                    ctx.fillStyle = 'rgba(45, 143, 78, 0.15)';
                    ctx.fillRect(px, py, this.cellSize, this.cellSize);
                }
            }
        }
    }
    
    drawGrid(ctx, size) {
        ctx.save();
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 0.5;
        
        for (let i = 0; i <= this.gridSize; i++) {
            const pos = i * this.cellSize;
            const distFromCenter = Math.abs(i - this.gridSize / 2) / (this.gridSize / 2);
            ctx.globalAlpha = 0.2 * (1 - distFromCenter * 0.5);
            
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, size);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(size, pos);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    drawHeatmap(ctx) {
        ctx.save();
        
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                let value = 0;
                
                switch (this.heatmapMode) {
                    case 'density':
                        value = this.countNearbyOfType(x, y, null, 3) / 20;
                        break;
                    case 'energy':
                        const entity = this.grid[y][x];
                        value = entity ? entity.energy / 150 : 0;
                        break;
                    case 'danger':
                        value = (this.countNearbyOfType(x, y, EntityType.CARNIVORE, 4) +
                                this.countNearbyOfType(x, y, EntityType.APEX_PREDATOR, 4) * 2) / 10;
                        break;
                    case 'fertility':
                        value = this.terrain[y][x].fertility / 2;
                        break;
                }
                
                if (value > 0) {
                    const intensity = Math.min(1, value);
                    let color;
                    
                    if (this.heatmapMode === 'danger') {
                        color = `rgba(255, 0, 0, ${intensity * 0.4})`;
                    } else if (this.heatmapMode === 'fertility') {
                        color = `rgba(0, 255, 0, ${intensity * 0.3})`;
                    } else {
                        color = `rgba(255, 165, 0, ${intensity * 0.3})`;
                    }
                    
                    ctx.fillStyle = color;
                    ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
        
        ctx.restore();
    }
    
    drawDisasterEffects(ctx) {
        ctx.save();
        
        for (const disaster of this.disasters.activeDisasters) {
            const px = disaster.centerX * this.cellSize + this.cellSize / 2;
            const py = disaster.centerY * this.cellSize + this.cellSize / 2;
            const radius = disaster.radius * this.cellSize;
            
            let color;
            switch (disaster.type) {
                case DisasterType.FIRE:
                    color = 'rgba(255, 100, 0, 0.3)';
                    break;
                case DisasterType.FLOOD:
                    color = 'rgba(0, 100, 255, 0.3)';
                    break;
                case DisasterType.DISEASE_OUTBREAK:
                    color = 'rgba(100, 255, 100, 0.2)';
                    break;
                default:
                    color = 'rgba(255, 255, 255, 0.2)';
            }
            
            const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    drawTrails(ctx) {
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const entity = this.grid[y][x];
                if (!entity || entity.trail.length < 2) continue;
                
                const colors = this.colors[entity.type];
                if (colors) {
                    this.drawCurvedLine(ctx, entity.trail, colors.line, 0.4);
                }
            }
        }
    }
    
    drawCurvedLine(ctx, points, color, alpha = 0.5) {
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
    
    drawConnections(ctx) {
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
                            ctx.globalAlpha = 0.25;
                            ctx.lineWidth = 1;
                            
                            const x1 = x * this.cellSize + this.cellSize / 2;
                            const y1 = y * this.cellSize + this.cellSize / 2;
                            const x2 = n.x * this.cellSize + this.cellSize / 2;
                            const y2 = n.y * this.cellSize + this.cellSize / 2;
                            
                            ctx.beginPath();
                            ctx.moveTo(x1, y1);
                            ctx.lineTo(x2, y2);
                            ctx.stroke();
                            ctx.restore();
                        }
                    }
                }
            }
        }
    }
    
    drawEntities(ctx) {
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const entity = this.grid[y][x];
                if (!entity) continue;
                
                const colors = this.colors[entity.type];
                const px = x * this.cellSize + this.cellSize / 2;
                const py = y * this.cellSize + this.cellSize / 2;
                
                const displaySize = entity.getDisplaySize();
                const energyRatio = Math.min(entity.energy / entity.maxEnergy, 1);
                const baseSize = this.cellSize * 0.3 * displaySize;
                const maxSize = this.cellSize * 0.85 * displaySize;
                const entitySize = baseSize + (maxSize - baseSize) * energyRatio;
                
                ctx.save();
                
                // Glow for healthy entities
                if (entity.energy > entity.maxEnergy * 0.7 && entity.type !== EntityType.DEAD_MATTER) {
                    ctx.shadowColor = colors.light;
                    ctx.shadowBlur = 4;
                }
                
                // Disease indicator
                if (entity.isInfected) {
                    ctx.shadowColor = '#00ff00';
                    ctx.shadowBlur = 6;
                }
                
                // Main body
                ctx.fillStyle = colors.fill;
                ctx.fillRect(px - entitySize / 2, py - entitySize / 2, entitySize, entitySize);
                
                // Life stage indicator
                if (entity.type !== EntityType.DEAD_MATTER) {
                    if (entity.lifeStage === LifeStage.JUVENILE) {
                        // Small dot for juveniles
                        ctx.fillStyle = '#ffffff';
                        ctx.globalAlpha = 0.5;
                        ctx.beginPath();
                        ctx.arc(px, py - entitySize / 2 - 2, 2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.globalAlpha = 1;
                    } else if (entity.lifeStage === LifeStage.ELDER) {
                        // Gray tint for elders
                        ctx.fillStyle = 'rgba(128, 128, 128, 0.3)';
                        ctx.fillRect(px - entitySize / 2, py - entitySize / 2, entitySize, entitySize);
                    }
                }
                
                // Inner detail for energy
                if (entity.energy > entity.maxEnergy * 0.4 && entity.type !== EntityType.DEAD_MATTER) {
                    const innerSize = entitySize * 0.5;
                    ctx.fillStyle = colors.light;
                    ctx.fillRect(px - innerSize / 2, py - innerSize / 2, innerSize, innerSize);
                    
                    if (entity.energy > entity.maxEnergy * 0.7) {
                        const coreSize = entitySize * 0.25;
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(px - coreSize / 2, py - coreSize / 2, coreSize, coreSize);
                    }
                }
                
                // Outline
                ctx.strokeStyle = colors.line;
                ctx.globalAlpha = 0.6;
                ctx.lineWidth = 1;
                ctx.strokeRect(px - entitySize / 2, py - entitySize / 2, entitySize, entitySize);
                
                ctx.restore();
            }
        }
    }
    
    drawDayNightOverlay(ctx, size) {
        if (this.isNight) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 30, 0.3)';
            ctx.fillRect(0, 0, size, size);
            ctx.restore();
        }
    }
    
    drawWeatherEffects(ctx, size) {
        ctx.save();
        
        switch (this.weather) {
            case Weather.RAIN:
                // Draw rain drops
                ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)';
                ctx.lineWidth = 1;
                for (let i = 0; i < 50; i++) {
                    const x = Math.random() * size;
                    const y = Math.random() * size;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x - 2, y + 8);
                    ctx.stroke();
                }
                break;
                
            case Weather.STORM:
                // Darker overlay + occasional lightning
                ctx.fillStyle = 'rgba(0, 0, 20, 0.2)';
                ctx.fillRect(0, 0, size, size);
                
                if (Math.random() < 0.03) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.fillRect(0, 0, size, size);
                }
                break;
                
            case Weather.DROUGHT:
                // Warm tint
                ctx.fillStyle = 'rgba(255, 200, 100, 0.1)';
                ctx.fillRect(0, 0, size, size);
                break;
        }
        
        ctx.restore();
    }
    
    drawSelectionHighlight(ctx) {
        const entity = this.selectedEntity;
        if (!entity || !this.grid[entity.y] || this.grid[entity.y][entity.x] !== entity) {
            this.selectedEntity = null;
            return;
        }
        
        const px = entity.x * this.cellSize + this.cellSize / 2;
        const py = entity.y * this.cellSize + this.cellSize / 2;
        
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        
        const size = this.cellSize;
        ctx.strokeRect(px - size / 2, py - size / 2, size, size);
        
        ctx.restore();
    }
    
    // === ANIMATION ===
    animate(timestamp = 0) {
        if (this.isRunning && timestamp - this.lastUpdate > this.updateInterval) {
            this.step();
            this.lastUpdate = timestamp;
        }
        
        this.render();
        requestAnimationFrame((t) => this.animate(t));
    }
    
    // === CONTROLS ===
    start() { this.isRunning = true; }
    stop() { this.isRunning = false; }
    toggle() {
        this.isRunning = !this.isRunning;
        return this.isRunning;
    }
    
    reset() {
        this.stop();
        this.initTerrain();
        this.populate();
        this.history = new PopulationHistory(500);
        this.eventLog = [];
    }
    
    setSpeed(speed) {
        this.updateInterval = Math.max(10, 300 - speed * 15);
    }
    
    setGridSize(size) {
        this.gridSize = size;
        this.initTerrain();
        this.resize();
    }
    
    setSunlight(intensity) {
        this.atmosphere.sunlight = intensity;
    }
    
    triggerDisaster(type) {
        this.disasters.trigger(type);
    }
    
    // === SAVE/LOAD ===
    saveState() {
        const state = {
            version: 2,
            generation: this.generation,
            gridSize: this.gridSize,
            atmosphere: { ...this.atmosphere },
            timeOfDay: this.timeOfDay,
            currentSeason: this.currentSeason,
            seasonTimer: this.seasonTimer,
            weather: this.weather,
            weatherTimer: this.weatherTimer,
            densities: { ...this.densities },
            settings: JSON.parse(JSON.stringify(this.settings)),
            terrain: [],
            entities: []
        };
        
        // Save terrain
        for (let y = 0; y < this.gridSize; y++) {
            state.terrain[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                const t = this.terrain[y][x];
                state.terrain[y][x] = {
                    type: t.type,
                    fertility: t.fertility,
                    moisture: t.moisture
                };
            }
        }
        
        // Save entities
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const e = this.grid[y][x];
                if (e) {
                    state.entities.push({
                        type: e.type,
                        x: e.x,
                        y: e.y,
                        energy: e.energy,
                        age: e.age,
                        maxAge: e.maxAge,
                        lifeStage: e.lifeStage,
                        genetics: { ...e.genetics },
                        isInfected: e.isInfected,
                        diseaseTimer: e.diseaseTimer,
                        isImmune: e.isImmune,
                        generation: e.generation,
                        offspring: e.offspring,
                        kills: e.kills,
                        foodEaten: e.foodEaten
                    });
                }
            }
        }
        
        return JSON.stringify(state);
    }
    
    loadState(jsonString) {
        try {
            const state = JSON.parse(jsonString);
            
            if (state.version !== 2) {
                console.warn('Old save version, some data may be lost');
            }
            
            this.generation = state.generation;
            this.gridSize = state.gridSize;
            this.atmosphere = { ...state.atmosphere };
            this.timeOfDay = state.timeOfDay || 0;
            this.currentSeason = state.currentSeason || Season.SPRING;
            this.seasonTimer = state.seasonTimer || 0;
            this.weather = state.weather || Weather.CLEAR;
            this.weatherTimer = state.weatherTimer || 50;
            this.densities = { ...state.densities };
            this.settings = JSON.parse(JSON.stringify(state.settings));
            
            // Resize and reinit
            this.resize();
            this.initGrid();
            
            // Load terrain
            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 0; x < this.gridSize; x++) {
                    if (state.terrain[y] && state.terrain[y][x]) {
                        const t = state.terrain[y][x];
                        this.terrain[y][x] = new TerrainCell(t.type);
                        this.terrain[y][x].fertility = t.fertility;
                        this.terrain[y][x].moisture = t.moisture;
                    }
                }
            }
            
            // Load entities
            for (const e of state.entities) {
                const entity = new Entity(e.type, e.x, e.y);
                entity.energy = e.energy;
                entity.age = e.age;
                entity.maxAge = e.maxAge;
                entity.lifeStage = e.lifeStage;
                entity.genetics = new Genetics();
                Object.assign(entity.genetics, e.genetics);
                entity.isInfected = e.isInfected;
                entity.diseaseTimer = e.diseaseTimer;
                entity.isImmune = e.isImmune;
                entity.generation = e.generation;
                entity.offspring = e.offspring;
                entity.kills = e.kills;
                entity.foodEaten = e.foodEaten;
                
                this.grid[e.y][e.x] = entity;
            }
            
            this.updateStats();
            return true;
        } catch (err) {
            console.error('Failed to load state:', err);
            return false;
        }
    }
    
    // === PRESETS ===
    applyPreset(preset) {
        const presets = {
            balanced: {
                plants: 0.12, herbivores: 0.04, carnivores: 0.02, decomposers: 0.02,
                omnivores: 0.01, apexPredators: 0.005, parasites: 0.005,
                o2: 50, sunlight: 5
            },
            jungle: {
                plants: 0.20, herbivores: 0.06, carnivores: 0.015, decomposers: 0.03,
                omnivores: 0.02, apexPredators: 0.003, parasites: 0.008,
                o2: 65, sunlight: 8
            },
            predator: {
                plants: 0.10, herbivores: 0.05, carnivores: 0.04, decomposers: 0.02,
                omnivores: 0.01, apexPredators: 0.015, parasites: 0.005,
                o2: 45, sunlight: 5
            },
            barren: {
                plants: 0.04, herbivores: 0.02, carnivores: 0.01, decomposers: 0.01,
                omnivores: 0.005, apexPredators: 0.002, parasites: 0.002,
                o2: 30, sunlight: 3
            },
            outbreak: {
                plants: 0.12, herbivores: 0.08, carnivores: 0.02, decomposers: 0.02,
                omnivores: 0.02, apexPredators: 0.005, parasites: 0.02,
                o2: 50, sunlight: 5
            },
            extinction: {
                plants: 0.02, herbivores: 0.01, carnivores: 0.03, decomposers: 0.005,
                omnivores: 0.005, apexPredators: 0.02, parasites: 0.01,
                o2: 25, sunlight: 2
            }
        };
        
        if (presets[preset]) {
            const p = presets[preset];
            this.densities = {
                plants: p.plants,
                herbivores: p.herbivores,
                carnivores: p.carnivores,
                decomposers: p.decomposers,
                omnivores: p.omnivores,
                apexPredators: p.apexPredators,
                parasites: p.parasites
            };
            this.atmosphere.o2 = p.o2;
            this.atmosphere.co2 = 100 - p.o2;
            this.atmosphere.sunlight = p.sunlight;
            return p;
        }
        return null;
    }
}

// === POPULATION GRAPH ===
class PopulationGraph {
    constructor(canvas, world) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.world = world;
        
        this.colors = {
            plants: '#2d8f4e',
            herbivores: '#1e5aab',
            carnivores: '#c91c1c',
            decomposers: '#d4a012',
            omnivores: '#7c3aed',
            apexPredators: '#dc2626',
            parasites: '#059669'
        };
        
        this.showLines = {
            plants: true,
            herbivores: true,
            carnivores: true,
            decomposers: false,
            omnivores: true,
            apexPredators: true,
            parasites: false
        };
    }
    
    render() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear
        ctx.fillStyle = '#0c0c12';
        ctx.fillRect(0, 0, width, height);
        
        // Get recent history
        const data = this.world.history.getRecent(100);
        if (data.timestamps.length < 2) return;
        
        // Find max value for scaling
        let maxVal = 10;
        for (const key of Object.keys(this.colors)) {
            if (this.showLines[key] && data[key]) {
                const max = Math.max(...data[key]);
                if (max > maxVal) maxVal = max;
            }
        }
        
        // Draw grid lines
        ctx.strokeStyle = '#252530';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = height - (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Draw lines
        const xStep = width / (data.timestamps.length - 1);
        
        for (const [key, color] of Object.entries(this.colors)) {
            if (!this.showLines[key] || !data[key]) continue;
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            for (let i = 0; i < data[key].length; i++) {
                const x = i * xStep;
                const y = height - (data[key][i] / maxVal) * (height - 10);
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            
            ctx.stroke();
        }
        
        // Draw current values
        ctx.fillStyle = '#e5e5ea';
        ctx.font = '10px "Space Mono"';
        ctx.textAlign = 'right';
        ctx.fillText(`Max: ${Math.round(maxVal)}`, width - 5, 12);
    }
    
    toggleLine(key) {
        this.showLines[key] = !this.showLines[key];
    }
}

// === UI CONTROLLER ===
class UIController {
    constructor(world) {
        this.world = world;
        this.graph = null;
        this.setupControls();
    }
    
    setupControls() {
        // Main controls
        const playPauseBtn = document.getElementById('playPause');
        const playPauseText = document.getElementById('playPauseText');
        
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                const running = this.world.toggle();
                playPauseText.textContent = running ? '⏸ PAUSE' : '▶ START';
                playPauseBtn.classList.toggle('active', running);
            });
        }
        
        const stepBtn = document.getElementById('step');
        if (stepBtn) {
            stepBtn.addEventListener('click', () => this.world.step());
        }
        
        const resetBtn = document.getElementById('reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.world.reset();
                if (playPauseText) playPauseText.textContent = '▶ START';
                if (playPauseBtn) playPauseBtn.classList.remove('active');
            });
        }
        
        // Speed
        this.setupSlider('speed', 'speedValue', (val) => this.world.setSpeed(val));
        
        // Grid size
        this.setupSlider('gridSize', 'gridSizeValue', (val) => {
            this.world.setGridSize(val);
            this.world.reset();
        }, true);
        
        // Atmosphere
        this.setupSlider('sunlight', 'sunlightValue', (val) => this.world.setSunlight(val));
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
        this.setupSlider('omnivoreDensity', 'omnivoreDensityValue', (val) => {
            this.world.densities.omnivores = val / 100;
        }, false, '%');
        this.setupSlider('apexDensity', 'apexDensityValue', (val) => {
            this.world.densities.apexPredators = val / 100;
        }, false, '%');
        this.setupSlider('parasiteDensity', 'parasiteDensityValue', (val) => {
            this.world.densities.parasites = val / 100;
        }, false, '%');
        
        // Tools
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.world.currentTool = btn.dataset.tool;
            });
        });
        
        // Spawn type
        document.querySelectorAll('.spawn-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.spawn-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.world.spawnType = parseInt(btn.dataset.type);
            });
        });
        
        // Terrain brush
        document.querySelectorAll('.terrain-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.terrain-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.world.terrainBrush = parseInt(btn.dataset.terrain);
            });
        });
        
        // Brush size
        this.setupSlider('brushSize', 'brushSizeValue', (val) => {
            this.world.brushSize = val;
        });
        
        // Heatmap
        document.querySelectorAll('.heatmap-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const isActive = btn.classList.contains('active');
                document.querySelectorAll('.heatmap-btn').forEach(b => b.classList.remove('active'));
                
                if (isActive) {
                    this.world.heatmapMode = null;
                } else {
                    btn.classList.add('active');
                    this.world.heatmapMode = btn.dataset.mode;
                }
            });
        });
        
        // Disasters
        document.querySelectorAll('.disaster-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.world.triggerDisaster(btn.dataset.disaster);
            });
        });
        
        // Save/Load
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const data = this.world.saveState();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ecosystem_gen${this.world.generation}.json`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }
        
        const loadBtn = document.getElementById('loadBtn');
        const loadFile = document.getElementById('loadFile');
        if (loadBtn && loadFile) {
            loadBtn.addEventListener('click', () => loadFile.click());
            loadFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        if (this.world.loadState(ev.target.result)) {
                            console.log('State loaded successfully');
                        }
                    };
                    reader.readAsText(file);
                }
            });
        }
        
        // Presets
        document.querySelectorAll('.btn-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const preset = btn.dataset.preset;
                const settings = this.world.applyPreset(preset);
                
                if (settings) {
                    this.updateSliderValue('plantDensity', settings.plants * 100, '%');
                    this.updateSliderValue('herbivoreDensity', settings.herbivores * 100, '%');
                    this.updateSliderValue('carnivoreDensity', settings.carnivores * 100, '%');
                    this.updateSliderValue('decomposerDensity', settings.decomposers * 100, '%');
                    this.updateSliderValue('omnivoreDensity', (settings.omnivores || 0) * 100, '%');
                    this.updateSliderValue('apexDensity', (settings.apexPredators || 0) * 100, '%');
                    this.updateSliderValue('parasiteDensity', (settings.parasites || 0) * 100, '%');
                    this.updateSliderValue('sunlight', settings.sunlight);
                    this.updateSliderValue('initialO2', settings.o2, '%');
                    
                    this.world.reset();
                }
            });
        });
        
        // Setup graph
        const graphCanvas = document.getElementById('populationGraph');
        if (graphCanvas) {
            this.graph = new PopulationGraph(graphCanvas, this.world);
        }
        
        // Initialize
        this.world.populate();
    }
    
    setupSlider(sliderId, valueId, callback, onChange = false, suffix = '', formatter = null) {
        const slider = document.getElementById(sliderId);
        const valueEl = document.getElementById(valueId);
        
        if (!slider || !valueEl) return;
        
        const updateValue = () => {
            const val = parseFloat(slider.value);
            valueEl.textContent = formatter ? formatter(val) : val + suffix;
            callback(val);
        };
        
        if (onChange) {
            slider.addEventListener('input', () => {
                valueEl.textContent = formatter ? formatter(parseFloat(slider.value)) : slider.value + suffix;
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

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('world');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    
    const world = new EcosystemWorld(canvas);
    const ui = new UIController(world);
    
    world.setSpeed(10);
    window.ecosystem = world;
    window.ecosystemUI = ui;
    
    // UI Update loop
    function updateUI() {
        // Header stats
        const genEl = document.getElementById('generation');
        const popEl = document.getElementById('population');
        if (genEl) genEl.textContent = world.generation;
        if (popEl) popEl.textContent = 
            world.populations.plants + world.populations.herbivores + 
            world.populations.carnivores + world.populations.decomposers +
            world.populations.omnivores + world.populations.apexPredators +
            world.populations.parasites;
        
        // Time display
        const timeEl = document.getElementById('timeDisplay');
        if (timeEl) {
            const hour = Math.floor(world.timeOfDay * 24);
            const period = world.isNight ? '🌙' : '☀️';
            timeEl.textContent = `${period} ${hour}:00`;
        }
        
        const seasonEl = document.getElementById('seasonDisplay');
        if (seasonEl) {
            const seasonEmoji = {
                [Season.SPRING]: '🌸',
                [Season.SUMMER]: '☀️',
                [Season.FALL]: '🍂',
                [Season.WINTER]: '❄️'
            };
            seasonEl.textContent = `${seasonEmoji[world.currentSeason]} ${world.currentSeason.toUpperCase()}`;
        }
        
        const weatherEl = document.getElementById('weatherDisplay');
        if (weatherEl) {
            const weatherEmoji = {
                [Weather.CLEAR]: '🌤️',
                [Weather.RAIN]: '🌧️',
                [Weather.DROUGHT]: '🏜️',
                [Weather.STORM]: '⛈️'
            };
            weatherEl.textContent = `${weatherEmoji[world.weather]} ${world.weather.toUpperCase()}`;
        }
        
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
        const counts = {
            plantCount: world.populations.plants,
            herbivoreCount: world.populations.herbivores,
            carnivoreCount: world.populations.carnivores,
            decomposerCount: world.populations.decomposers,
            omnivoreCount: world.populations.omnivores,
            apexCount: world.populations.apexPredators,
            parasiteCount: world.populations.parasites
        };
        
        for (const [id, count] of Object.entries(counts)) {
            const el = document.getElementById(id);
            if (el) el.textContent = count;
        }
        
        // Biodiversity
        const bioEl = document.getElementById('biodiversity');
        if (bioEl) {
            const bio = world.calculateBiodiversity();
            bioEl.textContent = (bio * 100).toFixed(1) + '%';
        }
        
        // Average fitness
        const fitEl = document.getElementById('avgFitness');
        if (fitEl) {
            const fit = world.calculateAverageFitness();
            fitEl.textContent = fit.toFixed(2);
        }
        
        // Update graph
        if (ui.graph) {
            ui.graph.render();
        }
        
        requestAnimationFrame(updateUI);
    }
    
    updateUI();
});

// Panel toggle function (global for onclick)
function togglePanel(header) {
    const content = header.nextElementSibling;
    const toggle = header.querySelector('.panel-toggle');
    content.classList.toggle('collapsed');
    toggle.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
}


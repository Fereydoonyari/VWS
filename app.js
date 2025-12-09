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
            carnivores: 0.015,
            decomposers: 0.02
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
    
    // Check if there's an adjacent mate (for animals)
    findMate(x, y, type) {
        const neighbors = this.getNeighbors(x, y).filter(n => 
            n.entity && 
            n.entity.type === type && 
            n.entity.energy > 50  // Mate must have enough energy
        );
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
        entity.cyclesSinceReproduction++;
        
        // Plants grow roots (trails)
        if (Math.random() < 0.1) {
            entity.addToTrail(x + (Math.random() - 0.5) * 2, y + (Math.random() - 0.5) * 2);
        }
        
        // Plant reproduction: every 4 cycles, needs another plant within radius 3
        if (entity.energy > 80 && 
            entity.cyclesSinceReproduction >= 4 && 
            this.hasNearbyOfType(x, y, EntityType.PLANT, 3)) {
            const empty = this.findEmptyNeighbor(x, y);
            if (empty) {
                const newEntity = new Entity(EntityType.PLANT, empty.x, empty.y);
                this.grid[empty.y][empty.x] = newEntity;
                entity.energy -= 30;
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
        
        if (Math.random() < 0.4) {
            const empty = this.findEmptyNeighbor(x, y);
            if (empty) {
                entity.addToTrail(x, y);
                this.grid[y][x] = null;
                this.grid[empty.y][empty.x] = entity;
                entity.x = empty.x;
                entity.y = empty.y;
            }
        }
        
        entity.energy -= 0.7;
        entity.age++;
        
        // Herbivore reproduction: needs adjacent mate with enough energy
        if (entity.energy > 90) {
            const mate = this.findMate(entity.x, entity.y, EntityType.HERBIVORE);
            if (mate) {
                const empty = this.findEmptyNeighbor(entity.x, entity.y);
                if (empty) {
                    this.grid[empty.y][empty.x] = new Entity(EntityType.HERBIVORE, empty.x, empty.y);
                    entity.energy -= 35;
                    mate.entity.energy -= 35; // Both parents lose energy
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
            const dead = new Entity(EntityType.DEAD_MATTER, prey.x, prey.y);
            dead.energy = 15;
            this.grid[prey.y][prey.x] = dead;
        }
        
        if (Math.random() < 0.55) {
            const empty = this.findEmptyNeighbor(x, y);
            if (empty) {
                entity.addToTrail(x, y);
                this.grid[y][x] = null;
                this.grid[empty.y][empty.x] = entity;
                entity.x = empty.x;
                entity.y = empty.y;
            }
        }
        
        entity.energy -= 1.0;
        entity.age++;
        
        // Carnivore reproduction: needs adjacent mate with enough energy
        if (entity.energy > 110) {
            const mate = this.findMate(entity.x, entity.y, EntityType.CARNIVORE);
            if (mate) {
                const empty = this.findEmptyNeighbor(entity.x, entity.y);
                if (empty) {
                    this.grid[empty.y][empty.x] = new Entity(EntityType.CARNIVORE, empty.x, empty.y);
                    entity.energy -= 45;
                    mate.entity.energy -= 45; // Both parents lose energy
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
        this.atmosphere.o2 = Math.max(0, this.atmosphere.o2 - 0.01);
        this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.015);
        
        const dead = this.findNeighborOfType(x, y, EntityType.DEAD_MATTER);
        if (dead) {
            const deadEntity = this.grid[dead.y][dead.x];
            entity.energy += deadEntity.energy * 0.6;
            this.atmosphere.co2 = Math.min(100, this.atmosphere.co2 + 0.3);
            this.grid[dead.y][dead.x] = null;
        }
        
        if (Math.random() < 0.2) {
            const empty = this.findEmptyNeighbor(x, y);
            if (empty) {
                entity.addToTrail(x, y);
                this.grid[y][x] = null;
                this.grid[empty.y][empty.x] = entity;
                entity.x = empty.x;
                entity.y = empty.y;
            }
        }
        
        entity.energy -= 0.35;
        entity.age++;
        
        // Decomposer reproduction: needs adjacent mate with enough energy
        if (entity.energy > 60) {
            const mate = this.findMate(entity.x, entity.y, EntityType.DECOMPOSER);
            if (mate) {
                const empty = this.findEmptyNeighbor(entity.x, entity.y);
                if (empty) {
                    this.grid[empty.y][empty.x] = new Entity(EntityType.DECOMPOSER, empty.x, empty.y);
                    entity.energy -= 20;
                    mate.entity.energy -= 20; // Both parents lose energy
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
                plants: 0.10, herbivores: 0.03, carnivores: 0.015, decomposers: 0.02,
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

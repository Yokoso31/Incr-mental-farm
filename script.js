// --- CONFIGURATION CONSTANTE ---
const CONFIG = {
    producers: {
        botanistDrone: { baseCost: 15, production: 1, name: "Drone Botaniste" },
        hydroBay: { baseCost: 100, production: 8, name: "Baie Hydroponique" },
        bioDome: { baseCost: 1100, production: 47, name: "Bio-Dôme Lunaire" }
    }
};

// --- ETAT DU JEU (Initial) ---
const DEFAULT_STATE = {
    bioPlants: 0,
    totalBioPlants: 0,
    clickValue: 1,
    producers: {
        botanistDrone: { count: 0 },
        hydroBay: { count: 0 },
        bioDome: { count: 0 }
    }
};

// Initialisation de l'état
let gameData = JSON.parse(JSON.stringify(DEFAULT_STATE));

// --- UTILITAIRES ---
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return Math.floor(num);
}

// --- SYSTÈME DE SAUVEGARDE ---
function saveGame() {
    localStorage.setItem('bioDomeSave', JSON.stringify(gameData));
    console.log("Jeu sauvegardé auto.");
}

function loadGame() {
    const save = localStorage.getItem('bioDomeSave');
    if (save) {
        try {
            const savedData = JSON.parse(save);
            gameData = { ...DEFAULT_STATE, ...savedData };
            gameData.producers = { ...DEFAULT_STATE.producers, ...savedData.producers };
            console.log("Sauvegarde chargée.");
        } catch (e) {
            console.error("Erreur chargement sauvegarde:", e);
        }
    }
}

function resetGame() {
    if(confirm("Voulez-vous vraiment tout réinitialiser ? Cette action est irréversible.")) {
        localStorage.removeItem('bioDomeSave');
        gameData = JSON.parse(JSON.stringify(DEFAULT_STATE));
        updateUI();
        console.log("Jeu réinitialisé.");
    }
}

// --- VISUAL EFFECTS (JUICE) ---
function createParticle(x, y, text) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.textContent = '+' + text;
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;

    document.body.appendChild(particle);

    // Nettoyage après l'animation (1s)
    setTimeout(() => {
        particle.remove();
    }, 1000);
}

// --- LOGIQUE METIER ---
function getProducerCost(id) {
    const pConfig = CONFIG.producers[id];
    const pState = gameData.producers[id];
    return Math.floor(pConfig.baseCost * Math.pow(1.15, pState.count));
}

function getProductionPerSecond() {
    let rate = 0;
    for (let id in CONFIG.producers) {
        if (gameData.producers[id]) {
            rate += gameData.producers[id].count * CONFIG.producers[id].production;
        }
    }
    return rate;
}

function harvest(event) {
    gameData.bioPlants += gameData.clickValue;
    gameData.totalBioPlants += gameData.clickValue;

    // Effet visuel
    if (event) {
        // Ajouter un petit aléatoire à la position pour que ça ne s'empile pas parfaitement
        const offsetX = (Math.random() - 0.5) * 20;
        const offsetY = (Math.random() - 0.5) * 20;
        createParticle(event.clientX + offsetX, event.clientY + offsetY, gameData.clickValue);
    }

    updateUI();
}

function buyProducer(id) {
    let cost = getProducerCost(id);
    if (gameData.bioPlants >= cost) {
        gameData.bioPlants -= cost;
        gameData.producers[id].count++;
        updateUI();
    }
}

// --- BOUCLE DE JEU ---
// Production passive
setInterval(() => {
    let passiveGain = getProductionPerSecond();
    if (passiveGain > 0) {
        gameData.bioPlants += passiveGain;
        gameData.totalBioPlants += passiveGain;
        updateUI();
    }
}, 1000);

// Sauvegarde automatique (10s)
setInterval(() => {
    saveGame();
}, 10000);

// --- INTERFACE ---
function updateUI() {
    // Ressources avec formatage
    document.getElementById('bio-plants').textContent = formatNumber(gameData.bioPlants);
    document.getElementById('gps').textContent = formatNumber(getProductionPerSecond());

    // Producteurs
    for (let id in CONFIG.producers) {
        const pState = gameData.producers[id];
        const currentCost = getProducerCost(id);

        const countEl = document.getElementById(`count-${id}`);
        const costEl = document.getElementById(`cost-${id}`);
        const btn = document.getElementById(`btn-${id}`);

        if (countEl) countEl.textContent = pState.count;
        if (costEl) costEl.textContent = formatNumber(currentCost);
        if (btn) btn.disabled = gameData.bioPlants < currentCost;
    }
}

// --- DÉMARRAGE ---
loadGame();
updateUI();

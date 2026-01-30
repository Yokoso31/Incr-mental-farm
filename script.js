// --- CONFIGURATION INITIALE ---
let gameData = {
    bioPlants: 0,
    totalBioPlants: 0,
    clickValue: 1,

    // Unités de production
    producers: {
        botanistDrone: { count: 0, baseCost: 15, production: 1, name: "Drone Botaniste" },
        hydroBay: { count: 0, baseCost: 100, production: 8, name: "Baie Hydroponique" },
        bioDome: { count: 0, baseCost: 1100, production: 47, name: "Bio-Dôme Lunaire" }
    }
};

// --- UTILITAIRES ---
function getCost(id) {
    let p = gameData.producers[id];
    return Math.floor(p.baseCost * Math.pow(1.15, p.count));
}

function getProductionPerSecond() {
    let rate = 0;
    for (let id in gameData.producers) {
        let p = gameData.producers[id];
        rate += p.count * p.production;
    }
    return rate;
}

// --- LOGIQUE CORE ---

// Fonction de récolte manuelle
function harvest() {
    gameData.bioPlants += gameData.clickValue;
    gameData.totalBioPlants += gameData.clickValue;
    updateUI();

    // Petit effet visuel optionnel ou feedback console
    // console.log("Récolte !");
}

// Fonction d'achat
function buyProducer(id) {
    let cost = getCost(id);
    let p = gameData.producers[id];

    if (gameData.bioPlants >= cost) {
        gameData.bioPlants -= cost;
        p.count++;
        updateUI();
    } else {
        console.log("Ressources insuffisantes !");
    }
}

// Boucle de production (s'exécute chaque seconde)
setInterval(() => {
    let passiveGain = getProductionPerSecond();

    gameData.bioPlants += passiveGain;
    gameData.totalBioPlants += passiveGain;
    updateUI();
}, 1000);

// --- INTERFACE ---
function updateUI() {
    // Mise à jour des compteurs principaux
    document.getElementById('bio-plants').textContent = Math.floor(gameData.bioPlants);
    document.getElementById('gps').textContent = getProductionPerSecond();

    // Mise à jour des producteurs
    for (let id in gameData.producers) {
        let p = gameData.producers[id];
        let currentCost = getCost(id);

        // Mise à jour des textes
        document.getElementById(`count-${id}`).textContent = p.count;
        document.getElementById(`cost-${id}`).textContent = currentCost;

        // Gestion de l'état du bouton (activé/désactivé)
        let btn = document.getElementById(`btn-${id}`);
        if (gameData.bioPlants >= currentCost) {
            btn.disabled = false;
        } else {
            btn.disabled = true;
        }
    }
}

// Initialisation de l'UI au chargement
updateUI();

// --- CONFIGURATION CONSTANTE ---
const CONFIG = {
    producers: {
        botanistDrone: { baseCost: 15, production: 1, name: "Drone Botaniste" },
        hydroBay: { baseCost: 100, production: 8, name: "Baie Hydroponique" },
        bioDome: { baseCost: 1100, production: 47, name: "Bio-Dôme Lunaire" }
    },
    upgrades: {
        fertilizer: {
            name: "Engrais Lunaire",
            cost: 500,
            desc: "Double la production des Drones Botanistes.",
            effectType: "multiplier",
            target: "botanistDrone",
            value: 2
        },
        bionicGloves: {
            name: "Gants Bioniques",
            cost: 2000,
            desc: "Récolte manuelle augmentée de 1% de la production/sec.",
            effectType: "clickBoost",
            value: 0.01
        },
        hydroPump: {
            name: "Pompe Haute Pression",
            cost: 5000,
            desc: "Double la production des Baies Hydroponiques.",
            effectType: "multiplier",
            target: "hydroBay",
            value: 2
        }
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
    },
    upgrades: [],
    lastSaveTime: Date.now()
};

// Initialisation de l'état
let gameData = JSON.parse(JSON.stringify(DEFAULT_STATE));

// --- UTILITAIRES ---
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return Math.floor(num);
}

function hasUpgrade(id) {
    return gameData.upgrades.includes(id);
}

// --- SYSTÈME DE SAUVEGARDE ---
function saveGame() {
    gameData.lastSaveTime = Date.now();
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
            if (!gameData.upgrades) gameData.upgrades = [];

            // Calcul Gain Hors Ligne
            if (gameData.lastSaveTime) {
                const now = Date.now();
                const diffSeconds = (now - gameData.lastSaveTime) / 1000;

                if (diffSeconds > 10) {
                    const gps = getProductionPerSecond();
                    if (gps > 0) {
                        const offlineGain = gps * diffSeconds;
                        gameData.bioPlants += offlineGain;
                        gameData.totalBioPlants += offlineGain;
                        // On retarde un peu l'alerte pour laisser le DOM se charger
                        setTimeout(() => {
                            alert(`Bienvenue de retour !\nVous avez gagné ${formatNumber(offlineGain)} Bio-Plantes pendant votre absence (${formatNumber(diffSeconds)}s).`);
                        }, 500);
                    }
                }
            }

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
        gameData.lastSaveTime = Date.now();
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
            let pProd = gameData.producers[id].count * CONFIG.producers[id].production;

            // Multiplicateurs d'upgrades
            for (let uid in CONFIG.upgrades) {
                let u = CONFIG.upgrades[uid];
                if (hasUpgrade(uid) && u.effectType === 'multiplier' && u.target === id) {
                    pProd *= u.value;
                }
            }

            rate += pProd;
        }
    }
    return rate;
}

function harvest(event) {
    let val = gameData.clickValue;

    // Effet Gants Bioniques
    if (hasUpgrade('bionicGloves')) {
        val += getProductionPerSecond() * CONFIG.upgrades.bionicGloves.value;
    }

    gameData.bioPlants += val;
    gameData.totalBioPlants += val;

    // Effet visuel
    if (event) {
        const offsetX = (Math.random() - 0.5) * 20;
        const offsetY = (Math.random() - 0.5) * 20;
        createParticle(event.clientX + offsetX, event.clientY + offsetY, formatNumber(val));
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

function buyUpgrade(id) {
    if (hasUpgrade(id)) return;

    let u = CONFIG.upgrades[id];
    if (gameData.bioPlants >= u.cost) {
        gameData.bioPlants -= u.cost;
        gameData.upgrades.push(id);
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
    // Ressources
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

    // Améliorations
    // On génère la liste si elle est vide (au premier chargement)
    const upgradesContainer = document.getElementById('upgrades-container');
    if (upgradesContainer && upgradesContainer.children.length === 0) {
        for (let uid in CONFIG.upgrades) {
            let u = CONFIG.upgrades[uid];
            let div = document.createElement('div');
            div.className = 'upgrade-item';
            div.id = `upgrade-item-${uid}`;
            div.innerHTML = `
                <div class="info">
                    <h3>${u.name}</h3>
                    <p>${u.desc}</p>
                    <small>Coût: <span id="cost-upgrade-${uid}">${formatNumber(u.cost)}</span></small>
                </div>
                <button onclick="buyUpgrade('${uid}')" id="btn-upgrade-${uid}">Acheter</button>
            `;
            upgradesContainer.appendChild(div);
        }
    }

    // Mise à jour de l'état des améliorations
    for (let uid in CONFIG.upgrades) {
        let u = CONFIG.upgrades[uid];
        let btn = document.getElementById(`btn-upgrade-${uid}`);
        let item = document.getElementById(`upgrade-item-${uid}`);

        if (btn && item) {
            if (hasUpgrade(uid)) {
                item.classList.add('bought');
                btn.textContent = "Acheté";
                btn.disabled = true;
            } else {
                item.classList.remove('bought');
                btn.disabled = gameData.bioPlants < u.cost;
            }
        }
    }
}

// --- DÉMARRAGE ---
loadGame();
updateUI();

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
    },
    events: [
        {
            name: "Pluie de Météorites",
            desc: "Une météorite riche en nutriments s'est écrasée !",
            type: "instant",
            gainMultiplier: 60, // Gagne 60s de prod
            prob: 0.3
        },
        {
            name: "Éruption Solaire",
            desc: "Les panneaux solaires surchargent ! Production x2 pendant 30s.",
            type: "buff",
            duration: 30,
            effectValue: 2,
            prob: 0.2
        },
        {
            name: "Fuite d'Oxygène",
            desc: "Une maintenance d'urgence ralentit la production (-50% pendant 30s).",
            type: "debuff",
            duration: 30,
            effectValue: 0.5,
            prob: 0.2
        },
        {
            name: "Découverte Archéologique",
            desc: "Vous avez trouvé une ancienne cache de ressources.",
            type: "instant",
            gainFlat: 500,
            prob: 0.3
        }
    ]
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
    lastSaveTime: Date.now(),
    // Stats
    startTime: Date.now(),
    totalClicks: 0,
    lifetimeBioPlants: 0
};

// --- ETAT TEMPORAIRE (Non sauvegardé) ---
let activeEvent = null; // { endTime, value }

// Initialisation de l'état
let gameData = JSON.parse(JSON.stringify(DEFAULT_STATE));

// --- UTILITAIRES ---
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return Math.floor(num);
}

function formatTime(ms) {
    let seconds = Math.floor(ms / 1000);
    let hours = Math.floor(seconds / 3600);
    let minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

function hasUpgrade(id) {
    return gameData.upgrades.includes(id);
}

// --- SYSTÈME DE SAUVEGARDE & EXPORT ---
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
            if (!gameData.startTime) gameData.startTime = Date.now();

            // Calcul Gain Hors Ligne
            if (gameData.lastSaveTime) {
                const now = Date.now();
                const diffSeconds = (now - gameData.lastSaveTime) / 1000;

                if (diffSeconds > 10) {
                    const gps = getProductionPerSecond(false); // Ignore temp buffs
                    if (gps > 0) {
                        const offlineGain = gps * diffSeconds;
                        addPlants(offlineGain);

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
        gameData.startTime = Date.now();
        activeEvent = null;
        updateUI();
        console.log("Jeu réinitialisé.");
    }
}

function exportSave() {
    const saveString = btoa(JSON.stringify(gameData));
    prompt("Copiez votre code de sauvegarde :", saveString);
}

function importSave() {
    const saveString = prompt("Collez votre code de sauvegarde :");
    if (saveString) {
        try {
            const json = atob(saveString);
            const savedData = JSON.parse(json);
            if (savedData.bioPlants !== undefined) {
                gameData = { ...DEFAULT_STATE, ...savedData };
                saveGame();
                updateUI();
                alert("Sauvegarde chargée avec succès !");
            } else {
                alert("Sauvegarde invalide.");
            }
        } catch (e) {
            alert("Erreur lors de l'importation. Code invalide.");
            console.error(e);
        }
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

function showNotification(title, message, type = 'neutral') {
    const container = document.getElementById('notification-area');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<h4>${title}</h4><p>${message}</p>`;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse'; // Pas implémenté mais disparaît
        toast.remove();
    }, 5000);
}

// --- LOGIQUE METIER ---
function addPlants(amount) {
    gameData.bioPlants += amount;
    gameData.totalBioPlants += amount;
    if (!gameData.lifetimeBioPlants) gameData.lifetimeBioPlants = 0;
    gameData.lifetimeBioPlants += amount;
}

function getProducerCost(id) {
    const pConfig = CONFIG.producers[id];
    const pState = gameData.producers[id];
    return Math.floor(pConfig.baseCost * Math.pow(1.15, pState.count));
}

function getProductionPerSecond(includeTemp = true) {
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

    // Effet d'événement temporaire
    if (includeTemp && activeEvent && activeEvent.endTime > Date.now()) {
        rate *= activeEvent.value;
    }

    return rate;
}

function harvest(event) {
    let val = gameData.clickValue;

    if (hasUpgrade('bionicGloves')) {
        val += getProductionPerSecond() * CONFIG.upgrades.bionicGloves.value;
    }

    addPlants(val);
    gameData.totalClicks = (gameData.totalClicks || 0) + 1;

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

// --- SYSTEME D'EVENEMENTS ---
function triggerRandomEvent() {
    // 30% de chance qu'un event se produise à chaque check
    if (Math.random() > 0.3) return;

    // Choisir un event pondéré (simple ici: equiprobable parmi liste)
    const eventConfig = CONFIG.events[Math.floor(Math.random() * CONFIG.events.length)];

    // Appliquer effet
    if (eventConfig.type === 'instant') {
        let gain = 0;
        if (eventConfig.gainMultiplier) {
            gain = getProductionPerSecond(false) * eventConfig.gainMultiplier;
        } else if (eventConfig.gainFlat) {
            gain = eventConfig.gainFlat;
        }
        if (gain < 10) gain = 10; // Minimum syndical
        addPlants(gain);
        showNotification(eventConfig.name, `${eventConfig.desc} (+${formatNumber(gain)})`, 'positive');
    }
    else if (eventConfig.type === 'buff' || eventConfig.type === 'debuff') {
        activeEvent = {
            endTime: Date.now() + (eventConfig.duration * 1000),
            value: eventConfig.effectValue
        };
        const type = eventConfig.type === 'buff' ? 'positive' : 'negative';
        showNotification(eventConfig.name, eventConfig.desc, type);
    }
}

// --- BOUCLE DE JEU ---
// Production passive
setInterval(() => {
    let passiveGain = getProductionPerSecond();
    if (passiveGain > 0) {
        addPlants(passiveGain);
        updateUI();
    }

    // Nettoyage event expiré
    if (activeEvent && activeEvent.endTime <= Date.now()) {
        activeEvent = null;
        updateUI(); // Pour rafraichir le GPS affiché
    }
}, 1000);

// Sauvegarde automatique (10s)
setInterval(() => {
    saveGame();
}, 10000);

// Check Events (toutes les 60s)
setInterval(() => {
    // Seulement si le joueur a commencé à jouer un peu (ex: 100 plantes total)
    if (gameData.lifetimeBioPlants > 100) {
        triggerRandomEvent();
    }
}, 60000);

// --- INTERFACE ---
function updateUI() {
    // Ressources
    document.getElementById('bio-plants').textContent = formatNumber(gameData.bioPlants);

    const gps = getProductionPerSecond();
    let gpsText = formatNumber(gps);

    // Indicateur visuel si buff/debuff
    const gpsEl = document.getElementById('gps');
    if (activeEvent && activeEvent.endTime > Date.now()) {
        gpsEl.style.color = activeEvent.value > 1 ? '#00ff00' : '#ff0000';
        gpsText += activeEvent.value > 1 ? " (Boost!)" : " (Panne!)";
    } else {
        gpsEl.style.color = '';
    }
    gpsEl.textContent = gpsText;

    // Stats UI
    if (document.getElementById('stat-time')) {
        let timePlayed = Date.now() - (gameData.startTime || Date.now());
        document.getElementById('stat-time').textContent = formatTime(timePlayed);
        document.getElementById('stat-clicks').textContent = formatNumber(gameData.totalClicks || 0);
        document.getElementById('stat-total').textContent = formatNumber(gameData.lifetimeBioPlants || 0);
    }

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

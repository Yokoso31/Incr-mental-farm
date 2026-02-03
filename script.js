// --- ASSETS GRAPHIQUES (SVG) ---
const SVGS = {
    botanistDrone: `<svg viewBox="0 0 64 64" class="unit-svg"><circle cx="32" cy="32" r="10" fill="#66fcf1" opacity="0.8"/><path d="M12 32H22M42 32H52M32 12V22M32 42V52" stroke="#45a29e" stroke-width="3"/><circle cx="12" cy="32" r="4" fill="#45a29e"/><circle cx="52" cy="32" r="4" fill="#45a29e"/><circle cx="32" cy="12" r="4" fill="#45a29e"/><circle cx="32" cy="52" r="4" fill="#45a29e"/></svg>`,
    hydroBay: `<svg viewBox="0 0 64 64" class="unit-svg"><path d="M32 4L54 40C54 52.1503 44.1503 62 32 62C19.8497 62 10 52.1503 10 40L32 4Z" fill="#45a29e" opacity="0.6"/><path d="M32 16L42 40C42 45.5228 37.5228 50 32 50C26.4772 50 22 45.5228 22 40L32 16Z" fill="#66fcf1"/></svg>`,
    bioDome: `<svg viewBox="0 0 64 64" class="unit-svg"><path d="M4 60H60" stroke="#45a29e" stroke-width="2"/><path d="M8 60C8 30 20 10 32 10C44 10 56 30 56 60" fill="rgba(102, 252, 241, 0.2)" stroke="#66fcf1" stroke-width="2"/><rect x="28" y="40" width="8" height="20" fill="#45a29e"/></svg>`,
    solarPanel: `<svg viewBox="0 0 64 64" class="unit-svg"><rect x="15" y="15" width="34" height="34" fill="#1f2833" stroke="#f1c40f" stroke-width="2"/><line x1="15" y1="26" x2="49" y2="26" stroke="#f1c40f"/><line x1="15" y1="37" x2="49" y2="37" stroke="#f1c40f"/><line x1="26" y1="15" x2="26" y2="49" stroke="#f1c40f"/><line x1="37" y1="15" x2="37" y2="49" stroke="#f1c40f"/></svg>`
};

// --- CONFIGURATION CONSTANTE ---
const CONFIG = {
    producers: {
        botanistDrone: { baseCost: 15, production: 1, name: "Drone Botaniste", energyConsumption: 0, icon: SVGS.botanistDrone, animation: "float" },
        hydroBay: { baseCost: 100, production: 8, name: "Baie Hydroponique", energyConsumption: 1, icon: SVGS.hydroBay, animation: "float" },
        bioDome: { baseCost: 1100, production: 47, name: "Bio-Dôme Lunaire", energyConsumption: 5, icon: SVGS.bioDome, animation: "pulse" },
        solarPanel: { baseCost: 50, production: 0, name: "Panneau Solaire", energyProduction: 2, type: 'energy', icon: SVGS.solarPanel, animation: "spin" }
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
            gainMultiplier: 60,
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
    ],
    achievements: {
        firstK: { name: "Le Premier Millier", desc: "Posséder 1k Bio-Plantes", condition: (data) => data.lifetimeBioPlants >= 1000 },
        droneArmy: { name: "Armée de Drones", desc: "Posséder 10 Drones", condition: (data) => data.producers.botanistDrone.count >= 10 },
        clicker: { name: "Doigts de Feu", desc: "Cliquer 100 fois", condition: (data) => data.totalClicks >= 100 },
        martian: { name: "Vers l'Infini", desc: "Effectuer un Prestige", condition: (data) => data.prestigeCount > 0 }
    },
    prestige: {
        baseRequirement: 1000000, // 1 Million pour prestige
        crystalMultiplier: 0.10 // +10% par cristal
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
        bioDome: { count: 0 },
        solarPanel: { count: 1 } // On donne 1 panneau au début pour pas frustrer
    },
    upgrades: [],
    lastSaveTime: Date.now(),
    // Stats
    startTime: Date.now(),
    totalClicks: 0,
    lifetimeBioPlants: 0,
    // Prestige & Trophées
    martianCrystals: 0,
    prestigeCount: 0,
    achievements: []
};

// --- ETAT TEMPORAIRE ---
let activeEvent = null;
let renderedCounts = {}; // Pour le suivi visuel

// Initialisation
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

// --- LOGIQUE PRESTIGE ---
function canPrestige() {
    return gameData.bioPlants >= CONFIG.prestige.baseRequirement;
}

function getPrestigeGain() {
    if (gameData.bioPlants < CONFIG.prestige.baseRequirement) return 0;
    // Formule simple : 1 cristal par tranche de 1M (racine carrée pour lisser si on veut, mais ici linéaire simple pour commencer)
    // Essayons racine : sqrt(plants / 1M)
    return Math.floor(Math.sqrt(gameData.bioPlants / CONFIG.prestige.baseRequirement));
}

function doPrestige() {
    const gain = getPrestigeGain();
    if (gain <= 0) return;

    if (confirm(`Voulez-vous voyager vers Mars ?\nVous perdrez vos plantes et bâtiments, mais gagnerez ${gain} Cristaux Martiens (+${Math.floor(gain * 10)}% production permanente).`)) {
        // Sauvegarde des éléments persistants
        const crystals = gameData.martianCrystals + gain;
        const count = gameData.prestigeCount + 1;
        const achievements = gameData.achievements;
        const stats = {
            startTime: gameData.startTime,
            totalClicks: gameData.totalClicks,
            lifetimeBioPlants: gameData.lifetimeBioPlants
        };

        // Reset
        gameData = JSON.parse(JSON.stringify(DEFAULT_STATE));

        // Restauration
        gameData.martianCrystals = crystals;
        gameData.prestigeCount = count;
        gameData.achievements = achievements;
        gameData.startTime = stats.startTime;
        gameData.totalClicks = stats.totalClicks;
        gameData.lifetimeBioPlants = stats.lifetimeBioPlants;
        gameData.lastSaveTime = Date.now();

        saveGame();
        updateUI();
        showNotification("Décollage !", "Bienvenue sur Mars, Commandant.", "positive");
    }
}

// --- LOGIQUE ACHIEVEMENTS ---
function checkAchievements() {
    for (let id in CONFIG.achievements) {
        if (!gameData.achievements.includes(id)) {
            if (CONFIG.achievements[id].condition(gameData)) {
                gameData.achievements.push(id);
                showNotification("Succès Débloqué !", CONFIG.achievements[id].name, "positive");
                updateUI(); // Pour afficher le badge
            }
        }
    }
}

// --- LOGIQUE ENERGIE ---
function getEnergyStatus() {
    let produced = 0;
    let consumed = 0;

    for (let id in CONFIG.producers) {
        const p = CONFIG.producers[id];
        const count = gameData.producers[id].count;

        if (p.energyProduction) produced += p.energyProduction * count;
        if (p.energyConsumption) consumed += p.energyConsumption * count;
    }

    return { produced, consumed, deficit: consumed > produced };
}

// --- LOGIQUE METIER ---
function addPlants(amount) {
    gameData.bioPlants += amount;
    gameData.totalBioPlants += amount;
    if (!gameData.lifetimeBioPlants) gameData.lifetimeBioPlants = 0;
    gameData.lifetimeBioPlants += amount;
    checkAchievements();
}

function getProducerCost(id) {
    const pConfig = CONFIG.producers[id];
    const pState = gameData.producers[id];
    return Math.floor(pConfig.baseCost * Math.pow(1.15, pState.count));
}

function getProductionPerSecond(includeTemp = true) {
    let rate = 0;
    const energy = getEnergyStatus();

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

    // Malus Energie (si pas de buff solaire actif)
    // Note: Si Éruption Solaire, on ignore le déficit peut-être ? Non, gardons simple.
    if (energy.deficit) {
        rate *= 0.25; // Malus sévère
    }

    // Bonus Prestige
    if (gameData.martianCrystals > 0) {
        rate *= (1 + (gameData.martianCrystals * CONFIG.prestige.crystalMultiplier));
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

    // Bonus Prestige sur clic aussi
    if (gameData.martianCrystals > 0) {
        val *= (1 + (gameData.martianCrystals * CONFIG.prestige.crystalMultiplier));
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

// --- SYSTÈME DE SAUVEGARDE & EXPORT ---
function saveGame() {
    gameData.lastSaveTime = Date.now();
    localStorage.setItem('bioDomeSave', JSON.stringify(gameData));
}

function loadGame() {
    const save = localStorage.getItem('bioDomeSave');
    if (save) {
        try {
            const savedData = JSON.parse(save);
            // Merge deep pour conserver achievements et cristaux
            gameData = { ...DEFAULT_STATE, ...savedData };
            // Merge producers specifique
            for(let key in DEFAULT_STATE.producers) {
                if(savedData.producers && savedData.producers[key]) {
                    gameData.producers[key] = savedData.producers[key];
                } else {
                    gameData.producers[key] = { ...DEFAULT_STATE.producers[key] };
                }
            }

            if (!gameData.achievements) gameData.achievements = [];

            // Calcul Gain Hors Ligne
            if (gameData.lastSaveTime) {
                const now = Date.now();
                const diffSeconds = (now - gameData.lastSaveTime) / 1000;

                if (diffSeconds > 10) {
                    const gps = getProductionPerSecond(false);
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

function resetGame() { /* Identique précedemment, voir plus bas si besoin modif */
    if(confirm("Voulez-vous vraiment tout réinitialiser ? Cette action est irréversible.")) {
        localStorage.removeItem('bioDomeSave');
        gameData = JSON.parse(JSON.stringify(DEFAULT_STATE));
        gameData.lastSaveTime = Date.now();
        gameData.startTime = Date.now();
        activeEvent = null;
        updateUI();
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
        }
    }
}

// --- VISUAL EFFECTS ---
function createParticle(x, y, text) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.textContent = '+' + text;
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 1000);
}

function showNotification(title, message, type = 'neutral') {
    const container = document.getElementById('notification-area');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<h4>${title}</h4><p>${message}</p>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// --- SYSTEME D'EVENEMENTS ---
function triggerRandomEvent() {
    // Sélection pondérée par 'prob'
    const rand = Math.random();
    let cumulative = 0;
    let eventConfig = null;

    // Normalisation si la somme != 1 (sécurité)
    const totalProb = CONFIG.events.reduce((sum, e) => sum + e.prob, 0);
    const normalizedRand = rand * totalProb;

    for (const event of CONFIG.events) {
        cumulative += event.prob;
        if (normalizedRand < cumulative) {
            eventConfig = event;
            break;
        }
    }

    if (!eventConfig) return; // Sécurité

    // Chance globale d'avoir un événement (30% pour ne pas spammer chaque minute)
    if (Math.random() > 0.3) return;

    if (eventConfig.type === 'instant') {
        let gain = 0;
        if (eventConfig.gainMultiplier) {
            gain = getProductionPerSecond(false) * eventConfig.gainMultiplier;
        } else if (eventConfig.gainFlat) {
            gain = eventConfig.gainFlat;
        }
        if (gain < 10) gain = 10;
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
setInterval(() => {
    let passiveGain = getProductionPerSecond();
    if (passiveGain > 0) {
        addPlants(passiveGain);
        updateUI();
    }
    if (activeEvent && activeEvent.endTime <= Date.now()) {
        activeEvent = null;
        updateUI();
    }
}, 1000);

setInterval(() => saveGame(), 10000);

setInterval(() => {
    if (gameData.lifetimeBioPlants > 100) triggerRandomEvent();
}, 60000);

// --- INTERFACE ---
function updateUI() {
    // Ressources
    document.getElementById('bio-plants').textContent = formatNumber(gameData.bioPlants);

    const gps = getProductionPerSecond();
    let gpsText = formatNumber(gps);

    const energy = getEnergyStatus();

    // Energie UI
    const energyEl = document.getElementById('energy-display');
    const fillEl = document.getElementById('energy-bar-fill');

    if (energyEl && fillEl) {
        let pct = 0;
        if (energy.produced > 0) {
            pct = (energy.consumed / energy.produced) * 100;
        } else if (energy.consumed > 0) {
            pct = 100;
        }

        const visualPct = Math.min(pct, 100);
        fillEl.style.width = `${visualPct}%`;

        if (energy.deficit) {
            fillEl.style.background = 'linear-gradient(90deg, #ff4d4d, #c0392b)';
            fillEl.style.boxShadow = '0 0 15px #ff4d4d';
            energyEl.style.color = '#ff9999';
            energyEl.textContent = `${Math.floor(pct)}% (DÉFICIT!)`;
            gpsText += " (MANQUE ÉNERGIE!)";
        } else {
            fillEl.style.background = 'linear-gradient(90deg, var(--accent-green), var(--highlight))';
            fillEl.style.boxShadow = '0 0 15px var(--highlight)';
            energyEl.style.color = '#fff';
            energyEl.textContent = `${Math.floor(pct)}% (Prod: ${energy.produced})`;
        }
    }

    const gpsEl = document.getElementById('gps');
    if (activeEvent && activeEvent.endTime > Date.now()) {
        gpsEl.style.color = activeEvent.value > 1 ? '#00ff00' : '#ff0000';
        gpsText += activeEvent.value > 1 ? " (Boost!)" : " (Panne!)";
    } else if (energy.deficit) {
        gpsEl.style.color = '#ff4d4d';
    } else {
        gpsEl.style.color = '';
    }
    gpsEl.textContent = gpsText;

    // Cristaux UI
    const crystalsEl = document.getElementById('martian-crystals');
    const bonusEl = document.getElementById('crystal-bonus');
    if (crystalsEl) {
        if (gameData.martianCrystals > 0) {
            document.getElementById('prestige-section').style.display = 'block';
            crystalsEl.textContent = gameData.martianCrystals;
            if (bonusEl) bonusEl.textContent = Math.floor(gameData.martianCrystals * CONFIG.prestige.crystalMultiplier * 100);
        } else {
            // Cache si 0, sauf si on peut prestige
            document.getElementById('prestige-section').style.display = canPrestige() ? 'block' : 'none';
        }
    }

    // Bouton Prestige
    const prestigeBtn = document.getElementById('btn-prestige');
    if (prestigeBtn) {
        const gain = getPrestigeGain();
        prestigeBtn.disabled = gain <= 0;
        prestigeBtn.textContent = `Voyage vers Mars (+${gain} Cristaux)`;
    }

    // Stats UI
    if (document.getElementById('stat-time')) {
        let timePlayed = Date.now() - (gameData.startTime || Date.now());
        document.getElementById('stat-time').textContent = formatTime(timePlayed);
        document.getElementById('stat-clicks').textContent = formatNumber(gameData.totalClicks || 0);
        document.getElementById('stat-total').textContent = formatNumber(gameData.lifetimeBioPlants || 0);
    }

    // Producteurs
    const producersList = document.getElementById('producers-list');
    // On doit s'assurer que le HTML des producers correspond à la CONFIG (car on a ajouté Solar Panel)
    // Idéalement on génère le HTML depuis CONFIG, mais pour l'instant on va update le texte
    // Sauf que Solar Panel n'est pas dans le HTML initial.
    // On va faire un check rapide : si l'élément n'existe pas, on le crée.

    for (let id in CONFIG.producers) {
        const pState = gameData.producers[id];
        const pConfig = CONFIG.producers[id];
        const currentCost = getProducerCost(id);

        let pDiv = document.getElementById(`producer-${id}`);
        if (!pDiv && producersList) {
            // Création dynamique si manquant (ex: Solar Panel)
            pDiv = document.createElement('div');
            pDiv.className = 'producer';
            pDiv.id = `producer-${id}`;
            pDiv.innerHTML = `
                <div class="info">
                    <h3><span class="producer-icon ${pConfig.animation}">${pConfig.icon}</span> ${pConfig.name}</h3>
                    <p>Production: ${pConfig.production > 0 ? '+' + pConfig.production : '0'}/sec</p>
                    <p class="energy-info" style="font-size: 0.7em; color: #aaa;">
                        ${pConfig.energyProduction ? '⚡ Produit: ' + pConfig.energyProduction : ''}
                        ${pConfig.energyConsumption ? '⚡ Conso: ' + pConfig.energyConsumption : ''}
                    </p>
                </div>
                <div class="controls">
                    <span class="owned">Possédé: <span id="count-${id}">0</span></span>
                    <button onclick="buyProducer('${id}')" id="btn-${id}">
                        Acheter (<span id="cost-${id}">${currentCost}</span>)
                    </button>
                </div>
            `;
            producersList.appendChild(pDiv);
        }

        const countEl = document.getElementById(`count-${id}`);
        const costEl = document.getElementById(`cost-${id}`);
        const btn = document.getElementById(`btn-${id}`);

        if (countEl) countEl.textContent = pState.count;
        if (costEl) costEl.textContent = formatNumber(currentCost);
        if (btn) btn.disabled = gameData.bioPlants < currentCost;
    }

    // Achievements UI
    const achievementsContainer = document.getElementById('achievements-list');
    if (achievementsContainer) {
        // Clear et redraw propre (ou check existant)
        achievementsContainer.innerHTML = '';
        for (let id in CONFIG.achievements) {
            let ach = CONFIG.achievements[id];
            let unlocked = gameData.achievements.includes(id);
            let div = document.createElement('div');
            div.className = `achievement-item ${unlocked ? 'unlocked' : 'locked'}`;
            div.title = ach.desc;
            div.innerHTML = `
                <span class="icon">${unlocked ? '🏆' : '🔒'}</span>
                <span class="name">${ach.name}</span>
            `;
            achievementsContainer.appendChild(div);
        }
    }

    // Base Visuelle
    updateBaseGrid();

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

    // Update upgrade status
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

// --- FONCTION GRID VISUELLE ---
function updateBaseGrid() {
    const grid = document.getElementById('base-grid');
    if (!grid) return;

    // Check Reset (Prestige)
    let totalReal = 0;
    for (let k in gameData.producers) totalReal += gameData.producers[k].count;

    // Si on a moins de batiments qu'avant, c'est un reset -> tout effacer
    let totalRendered = 0;
    for (let k in renderedCounts) totalRendered += renderedCounts[k];

    if (totalReal < totalRendered) {
        grid.innerHTML = '';
        renderedCounts = {};
    }

    for (let id in gameData.producers) {
        const count = gameData.producers[id].count;
        if (!renderedCounts[id]) renderedCounts[id] = 0;

        if (count > renderedCounts[id]) {
            const diff = count - renderedCounts[id];

            // On ajoute visuellement, avec un plafond pour éviter de faire planter le navigateur
            // Max 30 icônes par type affichées
            const MAX_DISPLAY = 30;

            // Nombre d'unités déjà affichées (supposé capé à MAX_DISPLAY)
            let displayed = Math.min(renderedCounts[id], MAX_DISPLAY);

            for (let i = 0; i < diff; i++) {
                if (displayed >= MAX_DISPLAY) {
                   // On a atteint le max visuel, on ne fait rien
                } else {
                     const div = document.createElement('div');
                     div.className = 'base-unit';
                     div.innerHTML = CONFIG.producers[id].icon;
                     div.title = `${CONFIG.producers[id].name} (Unité ${renderedCounts[id] + 1})`;
                     grid.appendChild(div);
                     displayed++;
                }
            }
            renderedCounts[id] = count;
        }
    }
}

// --- DÉMARRAGE ---
loadGame();
updateUI();

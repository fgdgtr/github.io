/**
 * RACK ASSISTANT v1.0
 * IA simplifiée 100% gratuite pour Rack Retour + Rack Attente Délais
 * Fonctionne hors-ligne, zéro coûts, localStorage
 */

class RackAssistant {
  constructor() {
    this.clients = JSON.parse(localStorage.getItem('rack_clients') || '{}');
    this.recentClients = JSON.parse(localStorage.getItem('rack_recent') || '[]');
    this.afsPatterns = JSON.parse(localStorage.getItem('rack_afs_patterns') || '{}');
    this.init();
  }

  init() {
    // Crée widget assistant
    this.createWidget();
    // Ajoute raccourcis clavier
    document.addEventListener('keydown', (e) => this.handleShortcuts(e));
    // Auto-sauvegarde historique
    this.setupAutoSave();
  }

  createWidget() {
    const widget = document.createElement('div');
    widget.id = 'rack-assistant-widget';
    widget.innerHTML = `
      <style>
        #rack-assistant-widget {
          position: fixed;
          bottom: 80px;
          right: 14px;
          z-index: 99;
          background: rgba(28,24,20,.95);
          backdrop-filter: blur(12px);
          border: 1.5px solid rgba(255,255,255,.2);
          border-radius: 12px;
          padding: 10px;
          width: 280px;
          max-height: 340px;
          overflow-y: auto;
          font-family: 'DM Sans', sans-serif;
          color: #f3efe9;
          box-shadow: 0 10px 40px rgba(0,0,0,.3);
        }
        #rack-assistant-widget.dark {
          background: rgba(8,8,8,.95);
          border-color: rgba(255,255,255,.1);
        }
        .ras-title {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #fbbf24;
        }
        .ras-close {
          margin-left: auto;
          background: none;
          border: none;
          color: #fbbf24;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          line-height: 1;
        }
        .ras-close:active { opacity: 0.6; }
        .ras-section {
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }
        .ras-section:last-child {
          border-bottom: none;
        }
        .ras-lbl {
          font-size: 9px;
          font-weight: 700;
          color: rgba(255,255,255,.4);
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .ras-client-item {
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 8px;
          padding: 7px 9px;
          margin-bottom: 4px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          transition: all .15s;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ras-client-item:hover {
          background: rgba(251,191,36,.15);
          border-color: rgba(251,191,36,.3);
        }
        .ras-client-item:active {
          transform: scale(0.95);
        }
        .ras-client-name {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ras-client-badge {
          background: rgba(251,191,36,.2);
          color: #fbbf24;
          border-radius: 4px;
          padding: 2px 5px;
          font-size: 8px;
          font-weight: 700;
          flex-shrink: 0;
          margin-left: 4px;
        }
        .ras-alert {
          background: rgba(239,68,68,.1);
          border: 1px solid rgba(239,68,68,.3);
          border-radius: 8px;
          padding: 8px;
          margin-bottom: 6px;
          font-size: 10px;
          color: #fca5a5;
          font-weight: 600;
          line-height: 1.4;
        }
        .ras-alert.warning {
          background: rgba(245,158,11,.1);
          border-color: rgba(245,158,11,.3);
          color: #fcd34d;
        }
        .ras-alert.info {
          background: rgba(96,165,250,.1);
          border-color: rgba(96,165,250,.3);
          color: #93c5fd;
        }
        .ras-btn {
          width: 100%;
          padding: 6px;
          background: rgba(251,191,36,.15);
          border: 1px solid rgba(251,191,36,.3);
          color: #fbbf24;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all .15s;
          margin-top: 4px;
        }
        .ras-btn:active {
          opacity: 0.7;
          transform: scale(0.95);
        }
        .ras-empty {
          font-size: 10px;
          color: rgba(255,255,255,.3);
          font-style: italic;
          padding: 8px;
          text-align: center;
        }
        .ras-stats {
          font-size: 9px;
          color: rgba(255,255,255,.4);
          margin-top: 3px;
        }
      </style>
      <div class="ras-title">
        🤖 ASSISTANT
        <button class="ras-close" onclick="document.getElementById('rack-assistant-widget').style.display='none'">×</button>
      </div>
      <div id="ras-content"></div>
    `;
    document.body.appendChild(widget);
  }

  handleShortcuts(e) {
    // Ctrl+K = Ouvrir assistant
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const w = document.getElementById('rack-assistant-widget');
      w.style.display = w.style.display === 'none' ? 'block' : 'none';
      this.render();
    }
    // Ctrl+Shift+C = Copier dernier client
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      if (this.recentClients.length > 0) {
        navigator.clipboard.writeText(this.recentClients[0]);
      }
    }
  }

  registerClient(clientNum, company = '', afsArr = []) {
    if (!clientNum) return;
    
    // Sauvegarde client
    if (!this.clients[clientNum]) {
      this.clients[clientNum] = { company: company || '', count: 0 };
    }
    this.clients[clientNum].count += 1;
    this.clients[clientNum].company = company || this.clients[clientNum].company;
    
    // Sauvegarde historique récent
    this.recentClients = [clientNum, ...this.recentClients.filter(c => c !== clientNum)].slice(0, 8);
    
    // Sauvegarde patterns AFS
    afsArr.forEach(afs => {
      if (!this.afsPatterns[clientNum]) this.afsPatterns[clientNum] = [];
      if (this.afsPatterns[clientNum].indexOf(afs) < 0) {
        this.afsPatterns[clientNum].push(afs);
      }
    });
    
    this.saveLocal();
  }

  saveLocal() {
    localStorage.setItem('rack_clients', JSON.stringify(this.clients));
    localStorage.setItem('rack_recent', JSON.stringify(this.recentClients));
    localStorage.setItem('rack_afs_patterns', JSON.stringify(this.afsPatterns));
  }

  setupAutoSave() {
    // Quand on remplit le formulaire, on enregistre
    document.addEventListener('change', (e) => {
      const inp = e.target;
      if (inp.id === 'inp-client' || inp.id === 'edit-client') {
        const client = inp.value.trim().toUpperCase();
        if (client) {
          this.registerClient(client);
          this.render();
        }
      }
    });
  }

  getAutoSuggestion(clientNum) {
    // Suggère l'AFS associé à un client
    return this.afsPatterns[clientNum] || [];
  }

  getPlacementSuggestion(stateObj, currentId) {
    // Suggère le meilleur emplacement basé sur saturation
    const niveaux = ['D', 'C', 'B', 'A'];
    let bestId = null, maxEmpty = -1;
    
    niveaux.forEach(niv => {
      let empty = 0;
      for (let c = 1; c <= 6; c++) {
        const id = niv + c;
        const raw = stateObj[id];
        if (!raw || (!raw.ref && !raw.reserved)) empty++;
      }
      if (empty > maxEmpty) {
        maxEmpty = empty;
        bestId = niv + '1';
      }
    });
    return bestId;
  }

  render() {
    const content = document.getElementById('ras-content');
    if (!content) return;

    let html = '';

    // SECTION 1 : Clients récents
    html += '<div class="ras-section">';
    html += '<div class="ras-lbl">📌 Derniers clients</div>';
    if (this.recentClients.length > 0) {
      this.recentClients.slice(0, 4).forEach(client => {
        const data = this.clients[client];
        const badge = data ? (data.count > 5 ? '⭐' : '•') : '';
        html += `
          <div class="ras-client-item" onclick="window.RackAssist.quickFill('${client}')">
            <span class="ras-client-name">${client}</span>
            <span class="ras-client-badge">${badge}</span>
          </div>
        `;
      });
    } else {
      html += '<div class="ras-empty">Aucun client encore</div>';
    }
    html += '</div>';

    // SECTION 2 : Alertes urgentes
    html += '<div class="ras-section">';
    html += '<div class="ras-lbl">⚡ Alertes urgentes</div>';
    const alerts = this.generateAlerts();
    if (alerts.length > 0) {
      alerts.forEach(alert => {
        html += `<div class="ras-alert ${alert.type}">${alert.msg}</div>`;
      });
    } else {
      html += '<div class="ras-empty">Tout est OK ✓</div>';
    }
    html += '</div>';

    // SECTION 3 : Stats
    html += '<div class="ras-section">';
    html += '<div class="ras-lbl">📊 Statistiques</div>';
    html += `<div class="ras-stats">
      <div>👥 Clients : ${Object.keys(this.clients).length}</div>
      <div>📦 Entrées : ${Object.values(this.clients).reduce((sum, c) => sum + (c.count || 0), 0)}</div>
      <div>🔖 AFS patterns : ${Object.keys(this.afsPatterns).length}</div>
    </div>`;
    html += '</div>';

    // SECTION 4 : Raccourcis
    html += '<div class="ras-section">';
    html += '<div class="ras-lbl">⌨️ Raccourcis</div>';
    html += '<div class="ras-empty" style="font-size:9px; text-align:left; padding:6px; font-style:normal;">Ctrl+K : Ouvrir/fermer<br/>Ctrl+Shift+C : Copier dernier</div>';
    html += '</div>';

    content.innerHTML = html;
  }

  generateAlerts() {
    const alerts = [];
    
    // Détecte les colis proches de 90j (si on a accès au state)
    if (window.state) {
      const niveaux = ['D', 'C', 'B', 'A'];
      niveaux.forEach(niv => {
        for (let c = 1; c <= 6; c++) {
          const id = niv + c;
          const raw = window.state[id];
          if (raw && raw.colis && Array.isArray(raw.colis)) {
            raw.colis.forEach(colis => {
              if (!colis.done && !colis.hors_prod && colis.ts) {
                const remaining = Math.max(0, 90 - Math.floor((Date.now() - colis.ts) / 86400000));
                if (remaining <= 5 && remaining > 0) {
                  alerts.push({
                    type: 'warning',
                    msg: `⚠️ ${colis.client} : ${remaining}j avant limite`
                  });
                } else if (remaining === 0) {
                  alerts.push({
                    type: 'error',
                    msg: `🔴 ${colis.client} : Limite atteinte !`
                  });
                }
              }
            });
          }
        }
      });
    }

    return alerts.slice(0, 3);
  }

  quickFill(client) {
    // Remplit le formulaire rapidement
    const inpClient = document.getElementById('inp-client');
    if (inpClient) {
      inpClient.value = client;
      inpClient.focus();
      
      // Remplir l'entreprise si on la connaît
      const inpCompany = document.getElementById('inp-company');
      if (inpCompany && this.clients[client] && this.clients[client].company) {
        inpCompany.value = this.clients[client].company;
      }
      
      // Suggestions AFS
      const afssugg = this.getAutoSuggestion(client);
      if (afssugg.length > 0) {
        const inpAfs = document.getElementById('inp-afs');
        if (inpAfs) {
          inpAfs.value = afssugg.join(', ');
        }
      }
      
      inpClient.dispatchEvent(new Event('change'));
    }
  }

  // API publique pour enregistrer manuellement
  track(clientNum, company = '', afsArr = []) {
    this.registerClient(clientNum, company, afsArr);
  }
}

// Instance globale
window.RackAssist = new RackAssistant();

console.log('✅ Rack Assistant loaded! Ctrl+K pour ouvrir');

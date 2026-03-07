// --- ERROR HANDLING FOR DEBUGGING ---
window.onerror = function(msg, source, lineno, colno, error) {
    const trap = document.getElementById('error-trap');
    trap.classList.remove('hidden');
    trap.innerText = `ERROR: ${msg}\nLine: ${lineno}`;
    return false;
};

// --- DATA & STATE ---
const DEFAULT_CLIENTS = [
    { id: 1, name: "Starbucks", branch: "Centro" },
    { id: 2, name: "Starbucks", branch: "Norte" },
    { id: 3, name: "Cielito Querido", branch: "Plaza" },
    { id: 4, name: "Punta del Cielo", branch: "" },
    { id: 5, name: "Italian Coffee", branch: "Sur" }
];

const DEFAULT_PRODUCTS = [
    { id: 1, name: "Croissants", emoji: "🥐" },
    { id: 2, name: "Chocolatines", emoji: "🍫" },
    { id: 3, name: "Muffins", emoji: "🧁" }
];

let state = {
    view: 'dashboard',
    clients: JSON.parse(localStorage.getItem('clients')) || DEFAULT_CLIENTS,
    products: JSON.parse(localStorage.getItem('products')) || DEFAULT_PRODUCTS,
    activeRoute: JSON.parse(localStorage.getItem('activeRoute')) || null,
    history: JSON.parse(localStorage.getItem('history')) || [],
    keypad: { open: false, stopIdx: null, prodIdx: null, field: null, val: 0, el: null }
};

// --- CORE APP LOGIC ---
const app = {
    init: () => {
        try {
            app.renderDashboardClients();
            app.updateStats();
            
            if (state.activeRoute && !state.activeRoute.completed) {
                app.resumeRoute();
            } else {
                app.showDashboard();
            }

            setInterval(() => {
                const now = new Date();
                const el = document.getElementById('live-time');
                if(el) el.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }, 1000);
        } catch(e) {
            console.error("Init Error", e);
        }
    },

    save: () => {
        localStorage.setItem('clients', JSON.stringify(state.clients));
        localStorage.setItem('products', JSON.stringify(state.products));
        localStorage.setItem('activeRoute', JSON.stringify(state.activeRoute));
        localStorage.setItem('history', JSON.stringify(state.history));
        app.updateStats();
    },

    updateStats: () => {
        document.getElementById('stat-routes').innerText = state.history.length;
    },

    // --- NAVIGATION ---
    showDashboard: () => {
        app.switchView('view-dashboard');
        document.getElementById('fab-dashboard').classList.remove('hidden');
        document.getElementById('fab-route').classList.add('hidden');
        document.getElementById('fab-history').classList.add('hidden');
        document.getElementById('header-subtitle').innerText = "Panel de Control";
        document.getElementById('btn-config').classList.remove('hidden');
        app.renderDashboardClients();
    },

    switchView: (viewId) => {
        ['view-dashboard', 'view-route', 'view-history', 'view-config'].forEach(id => {
            const el = document.getElementById(id);
            if(id === viewId) {
                el.classList.remove('hidden');
                el.classList.add('animate-fade-in');
            } else if (id !== 'view-config') { // Don't auto-hide config unless explicit
                el.classList.add('hidden');
            }
        });
        
        // Reset scroll
        document.getElementById('app-container').scrollTop = 0;
    },

    // --- DASHBOARD ---
    renderDashboardClients: () => {
        const list = document.getElementById('dashboard-client-list');
        list.innerHTML = '';
        
        state.clients.forEach(c => {
            const div = document.createElement('div');
            div.className = "flex items-center px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer";
            div.onclick = (e) => {
                if(e.target.type !== 'checkbox') {
                    const cb = div.querySelector('input');
                    cb.checked = !cb.checked;
                }
            };
            div.innerHTML = `
                <input type="checkbox" class="logistics-checkbox w-6 h-6 rounded border-slate-300 text-blue-600 focus:ring-blue-500 client-checkbox transition-all" value="${c.id}" checked>
                <div class="ml-4 flex-1">
                    <p class="text-sm font-bold text-slate-800">${c.name}</p>
                    ${c.branch ? `<p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${c.branch}</p>` : ''}
                </div>
            `;
            list.appendChild(div);
        });
    },

    toggleAllClients: () => {
        const cbs = document.querySelectorAll('.client-checkbox');
        const allChecked = Array.from(cbs).every(cb => cb.checked);
        cbs.forEach(cb => cb.checked = !allChecked);
    },

    // --- ROUTE ---
    startRoute: () => {
        const selectedIds = Array.from(document.querySelectorAll('.client-checkbox:checked')).map(cb => parseInt(cb.value));
        if (selectedIds.length === 0) return alert("Selecciona al menos un punto.");

        const selectedClients = state.clients.filter(c => selectedIds.includes(c.id));
        state.activeRoute = {
            id: Date.now(),
            startTime: new Date().toISOString(),
            endTime: null,
            stops: selectedClients.map(c => ({
                clientId: c.id,
                clientName: c.name,
                clientBranch: c.branch,
                status: 'pending',
                completedAt: null,
                notes: '',
                data: state.products.map(p => ({ productId: p.id, productName: p.name, delivered: 0, returned: 0 }))
            })),
            completed: false
        };
        app.save();
        app.resumeRoute();
    },

    resumeRoute: () => {
        app.switchView('view-route');
        document.getElementById('fab-dashboard').classList.add('hidden');
        document.getElementById('fab-route').classList.remove('hidden');
        document.getElementById('fab-history').classList.add('hidden');
        document.getElementById('header-subtitle').innerText = "Ruta en Curso";
        document.getElementById('btn-config').classList.add('hidden');
        app.renderTimeline();
        app.updateProgress();
    },

    renderTimeline: () => {
        const container = document.getElementById('route-timeline');
        container.innerHTML = '';
        
        state.activeRoute.stops.forEach((stop, index) => {
            const isDone = stop.status === 'completed';
            const isActive = !isDone && (index === 0 || state.activeRoute.stops[index-1].status === 'completed');
            
            const div = document.createElement('div');
            div.className = `relative pl-6 pb-2 transition-all duration-300`;
            
            const stopId = `stop-${index}`;
            const dotClass = isDone ? 'bg-green-500 ring-green-200' : (isActive ? 'bg-blue-600 ring-blue-200 animate-pulse' : 'bg-slate-300 ring-slate-100');
            const cardClass = isDone ? 'bg-white border-l-4 border-green-500 opacity-80' : (isActive ? 'bg-white border-l-4 border-blue-600 shadow-md transform scale-[1.02]' : 'bg-slate-50 border-l-4 border-slate-300 opacity-60');

            div.innerHTML = `
                <div class="absolute -left-[9px] top-4 w-4 h-4 rounded-full ${dotClass} ring-4 z-10 transition-colors duration-500"></div>
                <div class="rounded-xl border border-slate-200 overflow-hidden ${cardClass} transition-all duration-300" id="${stopId}-card">
                    <div class="p-4 cursor-pointer flex justify-between items-center" onclick="app.toggleStop(${index})">
                        <div>
                            <h3 class="font-bold text-slate-800 text-sm">${stop.clientName}</h3>
                            <p class="text-[10px] text-slate-500 uppercase tracking-wider font-bold">${stop.clientBranch || 'Principal'}</p>
                        </div>
                        <div>
                            ${isDone 
                                ? `<span class="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">✔ ENTREGADO</span>` 
                                : (isActive ? `<span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">EN CURSO</span>` : `<span class="text-[10px] font-bold text-slate-400">PENDIENTE</span>`)}
                        </div>
                    </div>
                    
                    <div id="${stopId}-body" class="${isActive && !isDone ? '' : 'hidden'} border-t border-slate-100 bg-white">
                        <div class="p-4 space-y-5">
                            ${stop.data.map((prod, pIdx) => `
                                <div class="flex items-center justify-between gap-2">
                                    <div class="w-24 font-bold text-slate-700 text-xs flex items-center gap-1.5 leading-tight">
                                        <span class="text-base">${app.getProductEmoji(prod.productName)}</span>
                                        ${prod.productName}
                                    </div>
                                    <div class="flex items-center gap-2 flex-1">
                                        <div class="flex-1 bg-slate-50 rounded-lg border border-slate-200 p-1 flex flex-col items-center cursor-pointer active:bg-blue-50 active:border-blue-300 transition-colors" onclick="app.openKeypad(${index}, ${pIdx}, 'delivered', this)">
                                            <span class="text-[8px] text-slate-400 uppercase font-bold">Entregado</span>
                                            <span class="text-xl font-bold text-slate-800" id="val-${index}-${pIdx}-delivered">${prod.delivered}</span>
                                        </div>
                                        <div class="flex-1 bg-slate-50 rounded-lg border border-slate-200 p-1 flex flex-col items-center cursor-pointer active:bg-red-50 active:border-red-300 transition-colors" onclick="app.openKeypad(${index}, ${pIdx}, 'returned', this)">
                                            <span class="text-[8px] text-red-300 uppercase font-bold">Devuelto</span>
                                            <span class="text-xl font-bold text-red-500" id="val-${index}-${pIdx}-returned">${prod.returned}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                            
                            <div class="pt-2">
                                <input type="text" placeholder="Observaciones (opcional)..." class="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 transition-colors" value="${stop.notes}" onchange="app.updateNote(${index}, this.value)">
                            </div>

                            <button onclick="app.completeStop(${index})" class="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-slate-200 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 text-xs uppercase tracking-wide">
                                <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                Registrar Visita
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    },

    toggleStop: (index) => {
        const body = document.getElementById(`stop-${index}-body`);
        if(body.classList.contains('hidden')){
            document.querySelectorAll('[id$="-body"]').forEach(el => el.classList.add('hidden'));
            body.classList.remove('hidden');
            body.classList.add('animate-slide-up');
        } else {
            body.classList.add('hidden');
        }
    },

    // --- KEYPAD LOGIC ---
    openKeypad: (stopIdx, prodIdx, field, el) => {
        state.keypad = { open: true, stopIdx, prodIdx, field, val: 0, el };
        // Get current value
        const currentVal = state.activeRoute.stops[stopIdx].data[prodIdx][field];
        state.keypad.val = currentVal;
        
        // Show Drawer
        document.getElementById('keypad-overlay').classList.remove('hidden');
        document.getElementById('keypad-drawer').classList.add('open');
        
        // Highlight element slightly?
        el.classList.add('ring-2', 'ring-blue-400');
    },

    closeKeypad: () => {
        if(!state.keypad.open) return;
        
        // Save final value
        const { stopIdx, prodIdx, field, val, el } = state.keypad;
        state.activeRoute.stops[stopIdx].data[prodIdx][field] = val;
        app.save();
        
        // UI Cleanup
        document.getElementById('keypad-drawer').classList.remove('open');
        setTimeout(() => document.getElementById('keypad-overlay').classList.add('hidden'), 200);
        if(el) el.classList.remove('ring-2', 'ring-blue-400');
        
        state.keypad = { open: false, stopIdx: null, prodIdx: null, field: null, val: 0, el: null };
    },

    keypadTap: (num) => {
        let s = state.keypad.val.toString();
        if(s === "0") s = "";
        s += num;
        state.keypad.val = parseInt(s) || 0;
        app.updateKeypadDisplay();
    },

    keypadBackspace: () => {
        let s = state.keypad.val.toString();
        s = s.slice(0, -1);
        state.keypad.val = parseInt(s) || 0;
        app.updateKeypadDisplay();
    },
    
    keypadClear: () => {
        state.keypad.val = 0;
        app.updateKeypadDisplay();
    },

    keypadAdd: (amount) => {
        state.keypad.val += amount;
        app.updateKeypadDisplay();
    },

    updateKeypadDisplay: () => {
        const { stopIdx, prodIdx, field, val } = state.keypad;
        // Update the visible DOM element immediately
        const span = document.getElementById(`val-${stopIdx}-${prodIdx}-${field}`);
        if(span) {
            span.innerText = val;
            span.classList.remove('animate-pop');
            void span.offsetWidth; // trigger reflow
            span.classList.add('animate-pop');
        }
    },

    // --- ACTION LOGIC ---
    updateNote: (idx, txt) => {
        state.activeRoute.stops[idx].notes = txt;
        app.save();
    },

    completeStop: (index) => {
        state.activeRoute.stops[index].status = 'completed';
        state.activeRoute.stops[index].completedAt = new Date().toISOString();
        app.save();
        app.renderTimeline();
        app.updateProgress();

        // Auto open next
        const nextIdx = index + 1;
        if(nextIdx < state.activeRoute.stops.length) {
            setTimeout(() => {
                const nextCard = document.getElementById(`stop-${nextIdx}-card`);
                nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                app.toggleStop(nextIdx);
            }, 400);
        }
    },

    updateProgress: () => {
        const total = state.activeRoute.stops.length;
        const done = state.activeRoute.stops.filter(s => s.status === 'completed').length;
        const pct = Math.round((done / total) * 100);
        
        document.getElementById('progress-bar').style.width = `${pct}%`;
        document.getElementById('progress-text').innerText = `${pct}% Completado`;
        document.getElementById('stops-left-text').innerText = `${total - done} pendientes`;

        const btn = document.getElementById('btn-finish-route');
        if(done === total) {
            btn.disabled = false;
            btn.classList.remove('bg-slate-800', 'text-slate-400', 'cursor-not-allowed');
            btn.classList.add('bg-green-600', 'text-white', 'shadow-green-200', 'hover:bg-green-700');
        } else {
            btn.disabled = true;
            btn.classList.add('bg-slate-800', 'text-slate-400', 'cursor-not-allowed');
            btn.classList.remove('bg-green-600', 'text-white', 'shadow-green-200', 'hover:bg-green-700');
        }
    },

    finishRoute: () => {
        if(!confirm("¿Finalizar ruta y guardar en historial?")) return;
        state.activeRoute.completed = true;
        state.activeRoute.endTime = new Date().toISOString();
        state.history.unshift(state.activeRoute);
        state.activeRoute = null;
        app.save();
        location.reload();
    },

    cancelRoute: () => {
        if(confirm("¿Cancelar ruta actual? Se perderán los datos.")) {
            state.activeRoute = null;
            app.save();
            location.reload();
        }
    },

    // --- HISTORY & HELPERS ---
    getProductEmoji: (name) => {
        const p = state.products.find(x => x.name === name);
        return p ? p.emoji : '📦';
    },

    viewHistory: () => {
        app.switchView('view-history');
        document.getElementById('fab-dashboard').classList.add('hidden');
        document.getElementById('fab-history').classList.remove('hidden');
        
        const list = document.getElementById('history-list');
        list.innerHTML = state.history.length ? '' : '<div class="text-center text-slate-400 py-10 text-sm">No hay historial</div>';
        
        state.history.forEach((h, idx) => {
            const d = new Date(h.startTime);
            list.innerHTML += `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-3 items-start">
                    <input type="checkbox" class="history-checkbox w-5 h-5 mt-1 rounded text-green-600 focus:ring-green-500" value="${idx}">
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-800 text-sm capitalize">${d.toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'})}</h3>
                        <p class="text-xs text-slate-400 mt-0.5">${d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} - ${h.stops.length} Paradas</p>
                    </div>
                </div>
            `;
        });
    },

    generateWeeklyReport: () => {
        const idxs = Array.from(document.querySelectorAll('.history-checkbox:checked')).map(c => c.value);
        if(!idxs.length) return alert("Selecciona días para el reporte.");
        
        const reports = idxs.map(i => state.history[i]).sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
        let msg = "*LOGISTICA - REPORTE SEMANAL*\n\n";
        
        reports.forEach(r => {
            msg += `📅 *${new Date(r.startTime).toLocaleDateString('es-ES',{weekday:'long', day:'numeric'})}*\n`;
            let totals = {};
            r.stops.forEach(s => s.data.forEach(d => {
                if(!totals[d.productName]) totals[d.productName] = {ent:0, dev:0};
                totals[d.productName].ent += d.delivered;
                totals[d.productName].dev += d.returned;
            }));
            
            Object.keys(totals).forEach(k => {
                const t = totals[k];
                if(t.ent>0||t.dev>0) msg += `   ${k}: Ent ${t.ent} | Dev ${t.dev}\n`;
            });
            
            const notes = r.stops.filter(s => s.notes);
            if(notes.length) {
                msg += "   ⚠️ Notas:\n";
                notes.forEach(n => msg += `   - ${n.clientName}: ${n.notes}\n`);
            }
            msg += "\n";
        });
        
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
    },

    // --- CONFIG ---
    toggleConfig: () => {
        const el = document.getElementById('view-config');
        if(el.classList.contains('hidden')) {
            el.classList.remove('hidden');
            app.renderConfigLists();
        } else {
            el.classList.add('hidden');
        }
    },

    renderConfigLists: () => {
        const cList = document.getElementById('config-client-list');
        cList.innerHTML = state.clients.map((c, i) => `
            <li class="px-4 py-3 flex justify-between items-center bg-white">
                <span class="text-sm font-bold text-slate-700">${c.name} <span class="font-normal text-slate-400 text-xs">${c.branch||''}</span></span>
                <button onclick="app.delClient(${i})" class="text-red-400 font-bold px-2">✕</button>
            </li>
        `).join('');
        
        const pList = document.getElementById('config-product-list');
        pList.innerHTML = state.products.map((p, i) => `
            <li class="px-4 py-3 flex justify-between items-center bg-white">
                <span class="text-sm font-bold text-slate-700">${p.emoji} ${p.name}</span>
                <button onclick="app.delProd(${i})" class="text-red-400 font-bold px-2">✕</button>
            </li>
        `).join('');
    },

    addClientPrompt: () => {
        const n = prompt("Nombre:"); if(!n) return;
        state.clients.push({id: Date.now(), name: n, branch: prompt("Sucursal:")||""});
        app.save(); app.renderConfigLists(); app.renderDashboardClients();
    },
    delClient: (i) => { if(confirm("¿Borrar?")) { state.clients.splice(i,1); app.save(); app.renderConfigLists(); app.renderDashboardClients(); } },
    addProductPrompt: () => {
        const n = prompt("Producto:"); if(!n) return;
        state.products.push({id: Date.now(), name: n, emoji: prompt("Emoji:")||"📦"});
        app.save(); app.renderConfigLists();
    },
    delProd: (i) => { if(confirm("¿Borrar?")) { state.products.splice(i,1); app.save(); app.renderConfigLists(); } },
    resetAllData: () => { if(confirm("¿BORRAR TODO?")) { localStorage.clear(); location.reload(); } }
};

// Start
document.addEventListener('DOMContentLoaded', app.init);
let currentRoomCode = null;
let currentRoomState = null;
let clickRaceInterval = null;

function showGameRoom() {
    const html = `
        <div class="min-h-screen ${currentTheme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 to-pink-50'}">
            <div class="${currentTheme === 'dark' ? 'glass-dark' : 'glass'} sticky top-0 z-50 shadow-lg">
                <div class="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <button onclick="showDashboard()" class="w-10 h-10 bg-black/10 dark:bg-white/10 rounded-xl flex items-center justify-center hover:bg-black/20 dark:hover:bg-white/20 transition ${currentTheme === 'dark' ? 'text-white' : 'text-gray-800'}">
                            <i class="ri-arrow-left-line text-xl"></i>
                        </button>
                        <h1 class="text-xl font-bold ${currentTheme === 'dark' ? 'text-white' : 'text-gray-800'}">Sala de Jogos 🎮</h1>
                    </div>
                    <div class="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/20 text-yellow-600 font-bold border border-yellow-500/30 shadow-sm">
                        <i class="ri-coins-fill text-yellow-500"></i>
                        <span>${currentUser?.loveCoins || 0} Love Coins</span>
                    </div>
                </div>
            </div>

            <div class="container mx-auto px-4 py-8 relative">
                <div id="gameLobby" class="max-w-md mx-auto ${currentTheme === 'dark' ? 'glass-dark' : 'glass'} rounded-3xl p-8 text-center animate-fade-in shadow-2xl">
                    <div class="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
                        <i class="ri-gamepad-line text-5xl text-white"></i>
                    </div>
                    <h2 class="text-2xl font-bold ${currentTheme === 'dark' ? 'text-white' : 'text-gray-800'} mb-2">Jogar com o Mozão</h2>
                    <p class="${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-8">Crie uma sala privada ou entre com um código para começarem a jogar juntos!</p>
                    
                    <button onclick="createRoom()" class="w-full py-4 mb-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2 text-lg">
                        <i class="ri-add-circle-line"></i> Criar Nova Sala
                    </button>
                    
                    <div class="relative flex py-2 items-center">
                        <div class="flex-grow border-t ${currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-300'}"></div>
                        <span class="flex-shrink-0 mx-4 ${currentTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'} text-sm font-semibold">OU</span>
                        <div class="flex-grow border-t ${currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-300'}"></div>
                    </div>
                    
                    <div class="flex gap-2 mt-4">
                        <input type="text" id="roomCodeInput" placeholder="Código" class="flex-1 px-4 py-3 rounded-xl bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-center font-bold text-lg tracking-widest focus:ring-2 focus:ring-purple-500 outline-none uppercase" maxlength="4">
                        <button onclick="joinRoom()" class="px-6 py-3 bg-white/20 dark:bg-gray-800 text-gray-800 dark:text-white rounded-xl font-bold border border-gray-200 dark:border-gray-700 hover:bg-white/40 transition">
                            Entrar
                        </button>
                    </div>
                </div>

                <div id="roomActive" class="hidden max-w-2xl mx-auto animate-fade-in"></div>
            </div>
        </div>
    `;
    document.getElementById('app').innerHTML = html;
    initGameSockets();
}

function createRoom() {
    if(!socket) initChat();
    socket.emit('createRoom', { userId: currentUser.id || currentUser._id, name: currentUser.name });
}

function joinRoom() {
    const code = document.getElementById('roomCodeInput').value.trim();
    if (code.length >= 4) {
        if(!socket) initChat();
        socket.emit('joinRoom', { roomCode: code, userId: currentUser.id || currentUser._id, name: currentUser.name });
        currentRoomCode = code;
    }
}

function initGameSockets() {
    if (!socket) initChat();
    
    // Remove old listeners to prevent duplicates if user goes back and forth
    socket.off('roomCreated');
    socket.off('roomUpdated');
    socket.off('roomError');
    socket.off('gameStarting');
    socket.off('gameStarted');
    socket.off('scoreUpdated');
    socket.off('gameOver');

    socket.on('roomCreated', (code) => {
        currentRoomCode = code;
        renderRoomLobby(code, [{ userId: currentUser.id || currentUser._id, name: currentUser.name, ready: false }]);
    });

    socket.on('roomUpdated', (room) => {
        currentRoomState = room;
        if (!room.gameStarted) {
            renderRoomLobby(currentRoomCode, room.players);
        }
    });

    socket.on('roomError', (msg) => { alert(msg); });

    socket.on('gameStarting', (countdown) => {
        document.getElementById('roomActive').innerHTML = `
            <div class="text-center py-20 animate-fade-in">
                <h2 class="text-4xl font-bold text-purple-500 mb-4">Prepare-se!</h2>
                <div class="text-8xl font-black text-pink-500 animate-ping">${countdown}</div>
            </div>
        `;
    });

    socket.on('gameStarted', () => {
        startClickRace();
    });

    socket.on('scoreUpdated', (room) => {
        currentRoomState = room;
        updateClickRaceScore();
    });

    socket.on('gameOver', (room) => {
        currentRoomState = room;
        endClickRace();
    });
}

function renderRoomLobby(code, players) {
    document.getElementById('gameLobby').classList.add('hidden');
    const roomDiv = document.getElementById('roomActive');
    roomDiv.classList.remove('hidden');

    const me = players.find(p => p.userId === (currentUser.id || currentUser._id));
    const other = players.find(p => p.userId !== (currentUser.id || currentUser._id));

    roomDiv.innerHTML = `
        <div class="${currentTheme === 'dark' ? 'glass-dark' : 'glass'} rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
            <div class="absolute top-4 right-4 bg-black/20 px-3 py-1 rounded-lg text-sm font-bold font-mono tracking-widest ${currentTheme === 'dark' ? 'text-white' : 'text-gray-800'}">
                CÓDIGO: ${code}
            </div>
            
            <h2 class="text-3xl font-bold ${currentTheme === 'dark' ? 'text-white' : 'text-gray-800'} mb-8 mt-4">Corrida de Cliques ⚡</h2>
            <p class="mb-8 ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">Quem clicar mais vezes em 10 segundos vence!</p>
            
            <div class="flex justify-center items-center gap-8 mb-10">
                <div class="flex flex-col items-center">
                    <div class="w-24 h-24 rounded-3xl bg-purple-500 flex items-center justify-center shadow-lg mb-3 border-4 ${me?.ready ? 'border-green-400' : 'border-transparent'} transition-all">
                        <i class="ri-user-smile-line text-5xl text-white"></i>
                    </div>
                    <div class="font-bold text-lg ${currentTheme === 'dark' ? 'text-white' : 'text-gray-800'}">${me?.name || 'Você'}</div>
                    <div class="text-sm ${me?.ready ? 'text-green-500' : 'text-yellow-500'} font-bold">${me?.ready ? 'PRONTO' : 'AGUARDANDO'}</div>
                </div>

                <div class="text-3xl font-black text-gray-400 opacity-50">VS</div>

                <div class="flex flex-col items-center">
                    <div class="w-24 h-24 rounded-3xl ${other ? 'bg-pink-500' : 'bg-gray-300 dark:bg-gray-700'} flex items-center justify-center shadow-lg mb-3 border-4 ${other?.ready ? 'border-green-400' : 'border-transparent'} transition-all">
                        ${other ? '<i class="ri-user-heart-line text-5xl text-white"></i>' : '<i class="ri-loader-4-line text-5xl text-gray-500 animate-spin"></i>'}
                    </div>
                    <div class="font-bold text-lg ${currentTheme === 'dark' ? 'text-white' : 'text-gray-800'}">${other ? other.name : 'Aguardando...'}</div>
                    <div class="text-sm ${other?.ready ? 'text-green-500' : 'text-gray-400'} font-bold">${other ? (other.ready ? 'PRONTO' : 'ESCOLHENDO') : '...'}</div>
                </div>
            </div>

            <button id="readyBtn" onclick="toggleReady()" ${!other || me?.ready ? 'disabled' : ''} class="w-full max-w-sm mx-auto py-4 bg-gradient-to-r ${me?.ready ? 'from-green-400 to-green-500' : 'from-purple-500 to-pink-500'} text-white rounded-xl font-bold hover:shadow-lg transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:transform-none text-lg">
                ${me?.ready ? '<i class="ri-check-line mr-2"></i> Pronto!' : '<i class="ri-thumb-up-fill mr-2"></i> Estou Pronto!'}
            </button>
        </div>
    `;
}

function toggleReady() {
    socket.emit('playerReady', currentRoomCode);
}

// --- LÓGICA DA CORRIDA DE CLIQUES ---
function startClickRace() {
    const roomDiv = document.getElementById('roomActive');
    
    roomDiv.innerHTML = `
        <div class="${currentTheme === 'dark' ? 'glass-dark' : 'glass'} rounded-3xl p-8 text-center shadow-2xl animate-fade-in">
            <div class="flex justify-between items-center mb-10 px-4 bg-black/5 dark:bg-white/5 rounded-2xl p-4">
                <div class="text-center">
                    <div class="text-sm ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">Você</div>
                    <div class="text-3xl font-bold text-purple-500" id="scoreMe">0</div>
                </div>
                <div class="text-center">
                    <div class="text-sm ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">Tempo</div>
                    <div class="text-5xl font-black text-red-500" id="timer">10.0s</div>
                </div>
                <div class="text-center">
                    <div class="text-sm ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">Mozão</div>
                    <div class="text-3xl font-bold text-pink-500" id="scoreOther">0</div>
                </div>
            </div>
            
            <button onclick="doClick()" class="w-56 h-56 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-white text-6xl shadow-[0_0_50px_rgba(168,85,247,0.5)] hover:scale-95 active:scale-90 active:shadow-inner transition-transform mx-auto flex flex-col items-center justify-center border-8 border-white/20 select-none">
                <i class="ri-cursor-fill mb-2"></i>
                <span class="text-xl font-bold">CLIQUE!</span>
            </button>
        </div>
    `;

    let t = 100; // 10 seconds in deciseconds
    clickRaceInterval = setInterval(() => {
        t--;
        const timerEl = document.getElementById('timer');
        if(timerEl) timerEl.textContent = (t/10).toFixed(1) + 's';
        if(t <= 0) clearInterval(clickRaceInterval);
    }, 100);
}

function doClick() {
    if(socket && currentRoomCode) {
        socket.emit('clickRaceClick', currentRoomCode);
    }
}

function updateClickRaceScore() {
    const me = currentRoomState.players.find(p => p.userId === (currentUser.id || currentUser._id));
    const other = currentRoomState.players.find(p => p.userId !== (currentUser.id || currentUser._id));
    
    if(document.getElementById('scoreMe')) document.getElementById('scoreMe').textContent = me?.score || 0;
    if(document.getElementById('scoreOther')) document.getElementById('scoreOther').textContent = other?.score || 0;
}

function endClickRace() {
    clearInterval(clickRaceInterval);
    const roomDiv = document.getElementById('roomActive');
    
    const me = currentRoomState.players.find(p => p.userId === (currentUser.id || currentUser._id));
    const other = currentRoomState.players.find(p => p.userId !== (currentUser.id || currentUser._id));
    
    let resultMsg = "Empate!";
    let resultColor = "text-yellow-500";
    if(me.score > other.score) { resultMsg = "Você Venceu! 🏆"; resultColor = "text-green-500"; }
    else if (me.score < other.score) { resultMsg = "Você Perdeu! 💔"; resultColor = "text-red-500"; }

    roomDiv.innerHTML = `
        <div class="${currentTheme === 'dark' ? 'glass-dark' : 'glass'} rounded-3xl p-10 text-center shadow-2xl animate-fade-in">
            <h2 class="text-5xl font-black ${resultColor} mb-8">${resultMsg}</h2>
            
            <div class="flex justify-center gap-12 mb-10">
                <div class="text-center">
                    <div class="text-lg ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">Você</div>
                    <div class="text-6xl font-bold ${currentTheme === 'dark' ? 'text-white' : 'text-gray-800'}">${me.score}</div>
                </div>
                <div class="text-center">
                    <div class="text-lg ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">${other.name}</div>
                    <div class="text-6xl font-bold ${currentTheme === 'dark' ? 'text-white' : 'text-gray-800'}">${other.score}</div>
                </div>
            </div>

            <button onclick="showDashboard()" class="px-8 py-4 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-700 transition">
                Voltar ao Mural
            </button>
        </div>
    `;
}

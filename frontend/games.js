let currentRoomCode = null;
let currentRoomState = null;
let clickRaceInterval = null;
let reactionInterval = null;

const GAME_TYPES = {
    clickRace: { name: "Corrida de Cliques ⚡", desc: "Quem clicar mais vezes em 10s vence!" },
    ticTacToe: { name: "Jogo da Velha ❌⭕", desc: "O clássico das disputas de casais!" },
    reaction: { name: "Teste de Reflexo 🥷", desc: "Clique primeiro quando ficar verde!" },
    roulette: { name: "Roleta de Verdades 🎡", desc: "Sorteie uma pergunta picante/fofa!" }
};

function showGameRoom() {
    const html = `
        <div class="min-h-screen ${currentTheme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 to-pink-50'}">
            <div class="${currentTheme === 'dark' ? 'glass-dark' : 'glass'} sticky top-0 z-50 shadow-lg">
                <div class="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <button onclick="showDashboard()" class="w-10 h-10 bg-black/10 dark:bg-white/10 rounded-xl flex items-center justify-center hover:bg-black/20 dark:hover:bg-white/20 transition ${currentTheme === 'dark' ? 'text-white' : 'text-gray-800'}">
                            <i class="ri-arrow-left-line text-xl"></i>
                        </button>
                        <h1 class="text-xl font-bold ${currentTheme === 'dark' ? 'text-white' : 'text-gray-800'}">Fliperama do Casal 🎮</h1>
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

function changeGameSelection(e) {
    if(!socket) return;
    socket.emit('changeGameType', { roomCode: currentRoomCode, gameType: e.target.value });
}

function initGameSockets() {
    if (!socket) initChat();
    
    // Remove old listeners
    socket.off('roomCreated'); socket.off('roomUpdated'); socket.off('roomError');
    socket.off('gameStarting'); socket.off('gameStarted'); socket.off('scoreUpdated'); socket.off('gameOver');
    socket.off('gameEvent');

    socket.on('roomCreated', (code) => {
        currentRoomCode = code;
        renderRoomLobby(code, [{ userId: currentUser.id || currentUser._id, name: currentUser.name, ready: false }], 'clickRace');
    });

    socket.on('roomUpdated', (room) => {
        currentRoomState = room;
        if (!room.gameStarted) {
            renderRoomLobby(currentRoomCode, room.players, room.gameType);
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

    socket.on('gameStarted', (gameType) => {
        if (gameType === 'clickRace') startClickRace();
        else if (gameType === 'ticTacToe') startTicTacToe();
        else if (gameType === 'reaction') startReactionGame();
        else if (gameType === 'roulette') startRoulette();
    });

    socket.on('scoreUpdated', (room) => {
        currentRoomState = room;
        updateClickRaceScore();
    });

    socket.on('gameOver', (room) => {
        currentRoomState = room;
        endClickRace();
    });

    socket.on('gameEvent', (data) => {
        if(data.action === 'ticTacToeMove') handleTicTacToeMove(data.payload);
        else if(data.action === 'ticTacToeReset') resetTicTacToe();
        else if(data.action === 'spinRoulette') showRouletteResult(data.payload);
        else if(data.action === 'reactionWait') showReactionWait();
        else if(data.action === 'reactionGo') showReactionGo();
        else if(data.action === 'reactionWin') endReactionRound(data.payload.winner, true);
        else if(data.action === 'reactionEarly') endReactionRound(data.payload.loser, false);
    });
}

function renderRoomLobby(code, players, gameType = 'clickRace') {
    document.getElementById('gameLobby').classList.add('hidden');
    const roomDiv = document.getElementById('roomActive');
    roomDiv.classList.remove('hidden');

    const myUserId = currentUser.id || currentUser._id;
    const me = players.find(p => p.userId === myUserId);
    const other = players.find(p => p.userId !== myUserId);
    const isCreator = players[0].userId === myUserId;

    let gameSelectHtml = '';
    if (isCreator) {
        gameSelectHtml = `
            <div class="mb-6">
                <label class="block text-sm font-bold mb-2 ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}">Escolha o Jogo:</label>
                <select onchange="changeGameSelection(event)" class="w-full max-w-sm px-4 py-3 rounded-xl bg-white/50 dark:bg-gray-800/50 border border-purple-500 text-center font-bold text-lg outline-none cursor-pointer">
                    ${Object.entries(GAME_TYPES).map(([k, v]) => `<option value="${k}" ${gameType === k ? 'selected' : ''}>${v.name}</option>`).join('')}
                </select>
            </div>
        `;
    } else {
        gameSelectHtml = `
            <div class="mb-6">
                <label class="block text-sm font-bold mb-2 ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}">Jogo Escolhido:</label>
                <div class="w-full max-w-sm mx-auto px-4 py-3 rounded-xl bg-white/20 dark:bg-gray-800/50 border border-purple-500 text-center font-bold text-lg">
                    ${GAME_TYPES[gameType].name}
                </div>
            </div>
        `;
    }

    roomDiv.innerHTML = `
        <div class="${currentTheme === 'dark' ? 'glass-dark' : 'glass'} rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
            <div class="absolute top-4 right-4 bg-black/20 px-3 py-1 rounded-lg text-sm font-bold font-mono tracking-widest ${currentTheme === 'dark' ? 'text-white' : 'text-gray-800'}">
                SALA: ${code}
            </div>
            
            ${gameSelectHtml}
            <p class="mb-8 ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">${GAME_TYPES[gameType].desc}</p>
            
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

            <button onclick="toggleReady()" ${!other || me?.ready ? 'disabled' : ''} class="w-full max-w-sm mx-auto py-4 bg-gradient-to-r ${me?.ready ? 'from-green-400 to-green-500' : 'from-purple-500 to-pink-500'} text-white rounded-xl font-bold hover:shadow-lg transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:transform-none text-lg">
                ${me?.ready ? '<i class="ri-check-line mr-2"></i> Pronto!' : '<i class="ri-thumb-up-fill mr-2"></i> Estou Pronto!'}
            </button>
        </div>
    `;
}

function toggleReady() {
    socket.emit('playerReady', currentRoomCode);
}

// ==========================================
// 1. CORRIDA DE CLIQUES
// ==========================================
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
            
            <button onclick="socket.emit('clickRaceClick', currentRoomCode)" class="w-56 h-56 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-white text-6xl shadow-[0_0_50px_rgba(168,85,247,0.5)] hover:scale-95 active:scale-90 transition-transform mx-auto flex flex-col items-center justify-center border-8 border-white/20 select-none">
                <i class="ri-cursor-fill mb-2"></i>
                <span class="text-xl font-bold">CLIQUE!</span>
            </button>
        </div>
    `;
    let t = 100;
    clickRaceInterval = setInterval(() => {
        t--;
        const timerEl = document.getElementById('timer');
        if(timerEl) timerEl.textContent = (t/10).toFixed(1) + 's';
        if(t <= 0) clearInterval(clickRaceInterval);
    }, 100);
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
            <button onclick="showGameRoom()" class="px-8 py-4 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition">Sair</button>
        </div>
    `;
}


// ==========================================
// 2. JOGO DA VELHA
// ==========================================
let board = Array(9).fill(null);
let xIsNext = true;

function startTicTacToe() {
    board = Array(9).fill(null);
    xIsNext = true;
    renderTicTacToe();
}

function renderTicTacToe() {
    const roomDiv = document.getElementById('roomActive');
    const myUserId = currentUser.id || currentUser._id;
    const isCreator = currentRoomState.players[0].userId === myUserId;
    const mySymbol = isCreator ? 'X' : 'O';
    const currentTurnSymbol = xIsNext ? 'X' : 'O';
    const myTurn = mySymbol === currentTurnSymbol;
    
    // Check winner
    const winner = calculateWinner(board);
    let statusMsg = myTurn ? "Sua vez!" : "Vez do Mozão...";
    if (winner) statusMsg = winner === mySymbol ? "Você Venceu! 🎉" : "Você Perdeu! 💔";
    else if (!board.includes(null)) statusMsg = "Deu Velha! 👵";

    let squaresHtml = '';
    for(let i=0; i<9; i++) {
        let content = '';
        if(board[i] === 'X') content = '<i class="ri-close-line text-blue-500"></i>';
        else if (board[i] === 'O') content = '<i class="ri-heart-3-line text-pink-500"></i>';

        squaresHtml += `
            <button onclick="doTicTacToeMove(${i})" ${board[i] || winner || !myTurn ? 'disabled' : ''} 
                class="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center text-6xl hover:bg-white/20 transition-all cursor-pointer disabled:cursor-default">
                ${content}
            </button>
        `;
    }

    roomDiv.innerHTML = `
        <div class="${currentTheme === 'dark' ? 'glass-dark' : 'glass'} rounded-3xl p-8 text-center shadow-2xl animate-fade-in max-w-md mx-auto">
            <h2 class="text-3xl font-bold mb-2 ${winner ? 'text-green-500' : 'text-purple-500'}">${statusMsg}</h2>
            <div class="mb-8 text-sm ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">Você é o ${mySymbol === 'X' ? 'X (Azul)' : 'Coração (Rosa)'}</div>
            
            <div class="grid grid-cols-3 gap-2 mx-auto w-fit mb-8">
                ${squaresHtml}
            </div>

            ${(winner || !board.includes(null)) ? `
                <button onclick="socket.emit('gameEvent', {roomCode: currentRoomCode, action: 'ticTacToeReset'})" class="px-8 py-3 bg-purple-500 text-white rounded-xl font-bold">Jogar Novamente</button>
                <button onclick="showGameRoom()" class="px-8 py-3 bg-gray-500 text-white rounded-xl font-bold ml-2">Sair</button>
            ` : ''}
        </div>
    `;
}

function doTicTacToeMove(i) {
    if(!socket || board[i]) return;
    socket.emit('gameEvent', {roomCode: currentRoomCode, action: 'ticTacToeMove', payload: { index: i }});
}

function handleTicTacToeMove(payload) {
    board[payload.index] = xIsNext ? 'X' : 'O';
    xIsNext = !xIsNext;
    renderTicTacToe();
}

function resetTicTacToe() {
    board = Array(9).fill(null);
    xIsNext = true;
    renderTicTacToe();
}

function calculateWinner(squares) {
    const lines = [ [0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6] ];
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return squares[a];
        }
    }
    return null;
}


// ==========================================
// 3. JOGO DE REFLEXO
// ==========================================
function startReactionGame() {
    // Initial wait state is managed by server
}

function showReactionWait() {
    const roomDiv = document.getElementById('roomActive');
    roomDiv.innerHTML = `
        <div onclick="doReactionClick()" class="h-96 rounded-3xl p-8 text-center shadow-2xl animate-fade-in bg-red-500 flex flex-col justify-center cursor-pointer active:scale-95 transition-transform">
            <h2 class="text-6xl font-black text-white mb-4">AGUARDE...</h2>
            <p class="text-white text-xl">Não clique ainda!</p>
        </div>
    `;
}

function showReactionGo() {
    const roomDiv = document.getElementById('roomActive');
    roomDiv.innerHTML = `
        <div onclick="doReactionClick()" class="h-96 rounded-3xl p-8 text-center shadow-2xl bg-green-500 flex flex-col justify-center cursor-pointer active:scale-95 transition-transform">
            <h2 class="text-7xl font-black text-white mb-4">CLIQUE!</h2>
        </div>
    `;
}

function doReactionClick() {
    if(socket) socket.emit('gameEvent', {roomCode: currentRoomCode, action: 'reactionClick'});
}

function endReactionRound(name, wasWin) {
    const roomDiv = document.getElementById('roomActive');
    const myName = currentUser.name;
    const iWon = (name === myName && wasWin) || (name !== myName && !wasWin);

    roomDiv.innerHTML = `
        <div class="h-96 rounded-3xl p-8 text-center shadow-2xl ${currentTheme === 'dark' ? 'glass-dark' : 'glass'} flex flex-col justify-center relative">
            <button onclick="showGameRoom()" class="absolute top-4 right-4 px-4 py-2 bg-black/20 rounded-lg text-white font-bold">Sair</button>
            <h2 class="text-5xl font-black ${iWon ? 'text-green-500' : 'text-red-500'} mb-4">${iWon ? 'Você Venceu!' : 'Você Perdeu!'}</h2>
            <p class="text-xl ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}">
                ${wasWin ? `${name} teve o reflexo mais rápido!` : `${name} clicou no vermelho e perdeu!`}
            </p>
            <p class="mt-8 text-sm opacity-50">Próxima rodada começando...</p>
        </div>
    `;
}


// ==========================================
// 4. ROLETA DE VERDADES
// ==========================================
function startRoulette() {
    const roomDiv = document.getElementById('roomActive');
    roomDiv.innerHTML = `
        <div class="${currentTheme === 'dark' ? 'glass-dark' : 'glass'} rounded-3xl p-10 text-center shadow-2xl animate-fade-in">
            <h2 class="text-3xl font-bold mb-8 text-purple-500">Roleta de Verdades 🎡</h2>
            
            <div id="rouletteResult" class="min-h-[150px] flex items-center justify-center p-6 bg-white/10 rounded-2xl mb-8">
                <p class="text-xl italic ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}">Clique para girar a roleta e descobrir quem vai responder o que...</p>
            </div>

            <button onclick="spinRoulette()" class="px-10 py-5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full font-black text-2xl shadow-xl hover:scale-105 active:scale-95 transition-transform">
                <i class="ri-refresh-line mr-2"></i> GIRAR ROLETA
            </button>
            <br>
            <button onclick="showGameRoom()" class="mt-6 px-6 py-2 bg-gray-500/20 text-gray-500 rounded-lg font-bold">Sair</button>
        </div>
    `;
}

function spinRoulette() {
    if(socket) socket.emit('gameEvent', {roomCode: currentRoomCode, action: 'spinRoulette'});
}

function showRouletteResult(payload) {
    const resDiv = document.getElementById('rouletteResult');
    if(!resDiv) return;

    // Animacao de girar
    resDiv.innerHTML = `<i class="ri-loader-4-line text-6xl text-purple-500 animate-spin"></i>`;
    
    setTimeout(() => {
        const isMe = payload.target === currentUser.name;
        resDiv.innerHTML = `
            <div>
                <div class="text-lg mb-2 font-bold ${isMe ? 'text-red-500' : 'text-blue-500'}">${payload.target}, responda:</div>
                <div class="text-2xl font-black ${currentTheme === 'dark' ? 'text-white' : 'text-gray-800'}">${payload.question}</div>
            </div>
        `;
    }, 1500);
}

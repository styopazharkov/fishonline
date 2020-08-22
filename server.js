const app = require("express")();
const server = require('http').Server(app);
const bodyParser = require("body-parser");
const io = require('socket.io')(server);
const port = 3000;

let rooms = new Map();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

server.listen(process.env.PORT || port, () => {
    console.log(`Server is running on port ${(process.env.PORT || port)}.`);
});

//route to all css files
app.get('/css/:file', (req, res) =>{ 
    let file=req.params.file;
    res.sendFile(__dirname + '/public/css/'+file);
});

app.get('/css/fonts/:file', (req, res) =>{ 
    let file=req.params.file;
    res.sendFile(__dirname + '/public/css/fonts/'+file);
});

//route to all js files
app.get('/js/:file', (req, res) =>{ 
    let file=req.params.file;
    res.sendFile(__dirname + '/public/js/'+file);
});

//main page of the site
app.get('/', (req, res) =>{ 
    res.sendFile(__dirname + '/public/index.html');
});


app.get('/join', (req, res) =>{
    res.sendFile(__dirname + '/public/join.html');
});

app.get('/rules', (req, res) =>{
    res.sendFile(__dirname + '/public/rules.html');
});

app.get('/credits', (req, res) =>{
    res.sendFile(__dirname + '/public/credits.html');
});

app.get('/favicon.ico', (req, res)=>{
    res.sendFile(__dirname + '/public/img/favicon.ico');
});

app.get('/table', (req, res)=>{
    res.sendFile(__dirname + '/public/img/table.png');
});

app.get('/card/:card', (req, res)=>{
    let card=req.params.card;
    res.sendFile(__dirname + `/public/img/DeckOfCardsPNG/${card}`);
});

app.get('/:room', (req, res) =>{ 
    let room=req.params.room;
    if(rooms.has(room)){
        res.sendFile(__dirname + '/public/room.html');
    }else{
        //to prevent against outside people:
        console.log(`someone tried to access nonexisting room: ${room} `)
        res.redirect('/'); 
    };
});




// ############ INDEXIO
const indexio = io.of('/indexio');
indexio.on('connection', (socket) => {
    // console.log(`INDEXIO: user joined`);
    var id;
    var name;
    var room;

    socket.on('tellInfo', (data)=>{
        id = data.id;
        name = data.name;
        room = data.room;
        // console.log(`INDEXIO: user gave info: id: ${id}, name: ${name}, room: ${room}`);
    });

    socket.on('getID', ()=>{
        id = Math.floor((Math.random() * 100000000000)).toString();
        // console.log(`INDEXIO: user asked for new id: ${id}`);
        socket.emit('setID', id);
    });


    socket.on('createRoom', (data)=>{
        if((!data.name.match(/^[A-Za-z]+$/)) || (data.name.length>11) || (!data.name) || (!data.room.match(/^[A-Za-z]+$/)) || (data.room.length!==4)){ //server name & room verification
            console.log(`INDEXIO: [ERROR] invalid room: ${data.room} or name: ${data.name}`);
            return;
        }
        console.log(`INDEXIO: [ROOM CREATED]: ${data.room} by ${data.id}, name: ${data.name}`);
        let nameMap = new Map();
        nameMap.set(data.id, data.name);
        rooms.set(data.room, 
            {connected: new Set(), 
            nameMap: nameMap, 
            room: data.room, 
            host: data.id, 
            players:[data.id], 
            team1: [data.id], 
            team2: [], 
            spectators: [], 
            turn: 0, 
            cards: [[],[],[],[],[],[]],
            started: false,
            table: null,
            cotable: null,
            halfsuits: [0,1,2,3,4,5,6,7,8],
            score1: 0,
            won1: [],
            score2: 0,
            won2: [],
            pastMoves: []
            }
        );
    });

    socket.on('disconnect', () => {
        // console.log(`INDEXIO: user ${id}, ${name}, ${room} disconnected. ${rooms.size}`);
    });
})

// ############ JOINIO
const joinio = io.of('/joinio');
joinio.on('connection', (socket) => {
    // console.log(`JOINIO: user joined`);
    var id;
    var name;
    var room;

    socket.on('tellInfo', (data)=>{
        id = data.id;
        name = data.name;
        room = data.room;
        // console.log(`JOINIO: user gave info: id: ${id}, name: ${name}, room: ${room}`);
    });

    socket.on('requestJoin', (data)=>{
        // insert to let user know that this isnt a room
        if((!data.name.match(/^[A-Za-z]+$/)) || (data.name.length>11) || (!data.name) || (!data.room.match(/^[A-Za-z]+$/)) || (data.room.length!==4)){ //server name & room verification
            console.log(`JOINIO: [ERROR] invalid room: ${data.room} or name: ${data.name}`);
            return;
        }

        if(rooms.has(data.room)){
            console.log(`JOINIO: [ROOM APPROVED]: ${data.room} to ${data.id, data.name}`);
            room = data.room
            let game=rooms.get(room);
            if(game.players.includes(data.id)){
                console.log(`ERROR: ${data.id} joined but was was already in the room`)
            }else{
                game.players.push(data.id);
                if(game.team1.length<3){
                    game.team1.push(data.id);
                }else if(game.team2.length<3){
                    game.team2.push(data.id);
                }else{
                    game.spectators.push(data.id)
                };
            }
            socket.emit('requestAns', true); //make the data an object
        }else{
            console.log(`JOINIO: [ROOM DENIED] ${data.room} to ${data.id, data.name}`);
            socket.emit('requestAns', false); //make the data an object
        };
    });

    socket.on('disconnect', () => {
        // console.log(`JOINIO: user ${id}, ${name}, ${room}  disconnected. ${rooms.size}, `);
    });
})

// ############ ROOMIO
const roomio = io.of('/roomio');
roomio.on('connection', (socket) => {
    // console.log(`ROOMIO:  user joined`);
    var id;
    var name;
    var room;

    socket.on('tellInfoAndRequest', (data)=>{
        id = data.id;
        name = data.name;
        room = data.room;
        console.log(`${room}: a user gave info: id: ${id}, name: ${name}`);
        if((!name.match(/^[A-Za-z]+$/)) || (name.length>11) || (!name) || (!room.match(/^[A-Za-z]+$/)) || (room.length!==4)){ //server name & room verification
            console.log(`ROOMIO: [ERROR] invalid room: ${room} or name: ${name}`);
            return;
        }

        if(rooms.has(room)){
            let game=rooms.get(room);
            if(game.players.includes(id)){
                socket.join(room);

                game.connected.add(id);
                game.nameMap.set(data.id, data.name);
                if (game.host===id){
                    console.log(`${room}:  user id: ${id}, name: ${name} admitted as host`);
                    socket.emit('requestAns', {ans: true});
                }else{
                    console.log(`${room}: user id: ${id}, name: ${name} admitted`);
                    socket.emit('requestAns', {ans: true});
                };

                //socket.io cant emit maps so we convert it to a string and then back
                let transitMapString = JSON.stringify(Array.from(game.nameMap));
                roomio.in(room).emit('updatePlayers', {players: game.players, team1:game.team1, team2: game.team2, spectators: game.spectators, host: game.host, transitMapString: transitMapString, started: game.started, spectatorLen: game.spectators.length})

                //if game has started, emit updatecards
            }else{
                console.log(`${room}: ${id}, ${name} tried accessing a game they are not part of`);
                socket.emit('requestAns', {ans: false, msg: `${id} not in players: ${game.players}`});
            };
        }else{
            console.log(`${room}: ${id}, ${name} tried accessing nonexisting game`);
            socket.emit('requestAns', {ans: false, msg: "no such game"});
        };
    });

    socket.on('shuffle', data=>{ //shuffles the teams
        console.log(`${room} [SHUFFLE] requested by ${data.id}`)
        let game = rooms.get(data.room);
        if(game.host===id && id===data.id && game.started===false){
            let _team1=[];
            let _team2=[];
            let _playing=(game.team1).concat(game.team2);
            while((_team1.length<3 || _team2.length<3)&&_playing.length>0){
                let coinFlip=Math.floor((Math.random() * 2));
                if(coinFlip===0){
                    if(_team1.length<3){
                        let player=_playing.splice(0,1)[0];
                        _team1.push(player)
                    }
                }else{
                    if(_team2.length<3){
                        let player=_playing.splice(0,1)[0];
                        _team2.push(player)
                    }
                }
            }
            game.team1=_team1;
            game.team2=_team2;

            let transitMapString = JSON.stringify(Array.from(game.nameMap));
                roomio.in(room).emit('updatePlayers', {players: game.players, team1:game.team1, team2: game.team2, spectators: game.spectators, host: game.host, transitMapString: transitMapString, started: game.started, spectatorLen: game.spectators.length})

        }
    })
    socket.on('startGame',(data) =>{
        console.log(`${room}: [START GAME] requested by ${data.id}`)
        let game = rooms.get(data.room);
        //verification of host and player number
        if(game.host===id && id===data.id && game.players.length>=6 && game.started===false){
            //make sure that every player is connected, maybe just send back to lobby if game is stopped and not enough players

            //make table and cotable
            game.started=true;
            let table = new Map(), cotable = new Map();
            let firstTeam=Math.floor((Math.random() * 2)); //variable decides if team1 is first
            let secondTeam=(firstTeam+1)%2; //opposite of firstteam
            let numbers=[0,2,4];
            let counter=0;
            while(numbers.length>0){ //makes table and cotable for team1
                let spot=numbers.splice(Math.floor(Math.random() * numbers.length),1)[0]+firstTeam; //selects random seat
                table.set(spot, game.team1[counter]);
                cotable.set(game.team1[counter], spot);
                counter++;
            };
            numbers=[0,2,4];
            counter=0;
            while(numbers.length>0){ //makes table and cotable for team2
                let spot=numbers.splice(Math.floor(Math.random() * numbers.length),1)[0]+secondTeam; //selects random seat
                table.set(spot, game.team2[counter]);
                cotable.set(game.team2[counter], spot);
                counter++;
            };
            game.table=table;
            game.cotable=cotable;

            //deal cards
            let gamecards=[]; 
            for (let i = 0; i < 9; i++){
                for(let j = 0; j < 6; j++){
                    gamecards.push({halfsuit: i, value: j}); //makes deck
                }
            }
            counter=0;
            while(gamecards.length>0){
                let randomCard=gamecards.splice(Math.floor(Math.random() * gamecards.length),1)[0]; //select random card 
                game.cards[counter].push(randomCard); // deals the cards in a circle
                counter = (counter+1)%6;
            }
            // console.log(`ROOMIO: table made in room ${room}: ${JSON.stringify(game.table)}, cards dealt: ${JSON.stringify(game.cards)}`);

            //tell players to ask for their cards
            roomio.in(room).emit('gameStarted', {players: game.players}); //table should be converted before emiting because socketio cant emit maps
        }else{
            //tell host why game start failed
            console.log(`${room}: ERROR: game start failed: not host or not enough players host: ${game.host}, id: ${id}, data.id: ${data.id}, numplayers: ${game.players.length}`)
        }
    });

    socket.on('switchCards', data=>{
        let game=rooms.get(room);
        if(id===data.id){
            let turn=game.cotable.get(id)
            let ind1=0, ind2=0;
            let cards = game.cards[turn]
            cards.forEach(item=>{
                if(item.value===data.card1.value && item.halfsuit===data.card1.halfsuit){
                    ind1=cards.indexOf(item);
                }
                if(item.value===data.card2.value && item.halfsuit===data.card2.halfsuit){
                    ind2=cards.indexOf(item);
                }
            })
            let temp = cards[ind2];
            cards[ind2]=cards[ind1];
            cards[ind1]=temp;

            socket.emit('updateCardsOnly', {cards: cards});
        }else{
            console.log(`${room}: [ERROR] switch requested not by owner`)
        }
    });

    socket.on('getCards', (data) => {
        if(data.id===id && data.room===room){
                //need to account for spectators
            let game=rooms.get(room);
            let update;
            let turnid = game.table.get(game.turn);

            if(game.team1.includes(id) || game.team2.includes(id)){
                let counter=0;
                while(game.cards[game.turn].length===0 && counter<3){//passes move on to next player
                    // console.log(`TEST: ${game.turn} passing move on`)
                    game.turn=(game.turn+2)%6;
                    counter++; //if counter reaches 3, the team has no cards so server should emit 'declare phase' with no moves.
                }
    
                let fakeTable=[]; //information to draw table on screen: name and number of cards
                [0,1,2,3,4,5].forEach(elem => {
                    let temp = (game.cotable.get(id)+elem)%6;
                    fakeTable.push(game.nameMap.get(game.table.get(temp)) + ': ' + game.cards[temp].length.toString());
                });
    
                if(id===turnid){
    
                    //makes possPeople to ask and possCards to ask for
                    let possPeople=[]; //people you can ask
                    let enemyTeam = (game.cotable.get(id)+1)%2;
                    [enemyTeam, enemyTeam+2, enemyTeam+4].forEach(elem=>{
                        if(game.cards[elem].length>0) possPeople.push(game.table.get(elem));
                    });
    
                    let possCards=[]; //cards you can ask for
                    let cards=game.cards[game.cotable.get(id)];
                    let possHalfsuits=[];
                    cards.forEach(elem=>{
                        if (!possHalfsuits.includes(elem.halfsuit)) possHalfsuits.push(elem.halfsuit);
                    });
                    possHalfsuits.forEach(elem=>{
                        [0,1,2,3,4,5].forEach(val=>{
                            possCards.push({halfsuit: elem, value: val});
                        })
                    })
    
                    let friendTeam = (game.cotable.get(id))%2;
                    let friends=[];
                    [friendTeam, friendTeam+2, friendTeam+4].forEach((item)=>{
                       friends.push(game.table.get(item))
                    });
    
                    update={cards:game.cards[game.cotable.get(id)], turnid: turnid, possPeople: possPeople, possCards: possCards, halfsuits: game.halfsuits, team: friends, fakeTable:fakeTable, won1:game.won1, won2: game.won2, spectatorLen: game.spectators.length, host:game.host}
                    console.log(`${room}: user ${id}, ${name} has requested cards on their turn`);
                }else{
                    let friendTeam = (game.cotable.get(id))%2;
                    let friends=[];
                    [friendTeam, friendTeam+2, friendTeam+4].forEach((item)=>{
                       friends.push(game.table.get(item));
                    });
                    update={cards:game.cards[game.cotable.get(id)], turnid: turnid, halfsuits: game.halfsuits, team: friends, fakeTable:fakeTable, won1: game.won1, won2: game.won2, spectatorLen: game.spectators.length, host: game.host}
                    console.log(`${room}: user ${id}, ${name} has requested cards`);
                }
            }else{
                let fakeTable=[]; //if request is from a spectator
                [0,1,2,3,4,5].forEach(elem => {
                    fakeTable.push(game.nameMap.get(game.table.get(elem)) + ': ' + game.cards[elem].length.toString());
                });
                update={cards:[], turnid: turnid, fakeTable:fakeTable, won1: game.won1, won2: game.won2, spectatorLen: game.spectators.length, host: game.host, spectator: true}
                console.log(`${room}: user ${id}, ${name} (spectator) has requested cards`);
            }
            
            socket.emit('updateCards', update); //should also update the turn and possmoves and table
        }
    });

    socket.on('makeMove', (data)=>{
        if(data.id===id){
            let game=rooms.get(room);
            let targetCards=game.cards[game.cotable.get(data.target)];
            console.log(`${JSON.stringify(targetCards)}, ${JSON.stringify(data.card)}`)

            let match=false; //need this because objects cant be compared with ===
            let targetCard;
            targetCards.forEach(item => {
                if(item.halfsuit===data.card.halfsuit && item.value===data.card.value){
                    match = true;
                    targetCard=item;
                } 
            })

            if(match){
                console.log(`${room}: ${id} asked ${data.target} for ${JSON.stringify(data.card)} and got it`);
                game.pastMoves.push({mover: id, target: data.target, card:data.card, success:true});
                game.cards[game.cotable.get(id)].push(data.card);// adds card to players hand
                targetCards.splice(targetCards.indexOf(targetCard),1); //removes card from targets hand
                roomio.in(room).emit('moveMade', game.pastMoves.slice(-2));
            }else{
                console.log(`${room}: ${id} asked ${data.target} for ${JSON.stringify(data.card)} but didn't get it`);
                game.pastMoves.push({mover: id, target: data.target, card:data.card, success:false});
                game.turn=game.cotable.get(data.target);
                roomio.in(room).emit('moveMade', game.pastMoves.slice(-2));
            }
        }else{
            console.log(`${room}: [MOVE REQUEST ERROR]: IDs do not match`);
        }
    });

    socket.on('declare', (data)=>{
        if(data.id===id){
            let game=rooms.get(room);
            let success=true; //is this a successful declaration 
            [0,1,2,3,4,5].forEach((item)=>{
                let targetCards=game.cards[game.cotable.get(data.cardHolders[item])]
                let match=false;
                targetCards.forEach(itm=>{
                    if(itm.halfsuit===data.halfsuit && itm.value===item) match = true;
                })
                if(!match){
                    success=false;
                } 
            })

            if((game.team1.includes(id)&&success) || (game.team2.includes(id)&&!success)){
                game.score1++;
                game.won1.push(data.halfsuit);
            } else {
                game.score2++;
                game.won2.push(data.halfsuit);
            }

            console.log(`${room}: ${id} unsuccessfully declared ${data.halfsuit}`);
            for(let i=0; i < 6; i++){
                let temp=game.cards[i];
                game.cards[i]=temp.filter((item)=>{return item.halfsuit!==data.halfsuit;});
            }
            game.halfsuits.splice(game.halfsuits.indexOf(data.halfsuit), 1);

            
            if(game.halfsuits.length===0){ //if game is over
                let winners;
                let score;
                if(game.score1>game.score2){
                    winners=game.team1;
                    score=[game.score1, game.score2];
                    console.log(`${room}: Game Over. Team 1 won`)
                }else{
                    winners=game.team2;
                    score=[game.score2, game.score1];
                    console.log(`${room}: Game Over. Team 2 won`)
                }
                roomio.in(room).emit('gameOver', {winners: winners, score: score}); //add winner, scores, etc.
                rooms.set(room, 
                    {connected: game.connected, 
                    nameMap: game.nameMap, 
                    room: room, 
                    host: game.host, 
                    players: game.players, 
                    team1: game.team1, 
                    team2: game.team2, 
                    spectators: game.spectators, 
                    turn: 0, 
                    cards: [[],[],[],[],[],[]],
                    started: false,
                    table: null,
                    cotable: null,
                    halfsuits: [0,1,2,3,4,5,6,7,8],
                    score1: 0,
                    won1: [],
                    score2: 0,
                    won2: [],
                    pastMoves: []
                    }
                );

                game=rooms.get(room)
                let transitMapString = JSON.stringify(Array.from(game.nameMap));
                roomio.in(room).emit('updatePlayers', {players: game.players, team1:game.team1, team2: game.team2, spectators: game.spectators, host: game.host, transitMapString: transitMapString, started: game.started, spectatorLen: game.spectators.length})

            }else{//if this isnt the end of the game
                roomio.in(room).emit('declared', {declarer: id, halfsuit: data.halfsuit, success: success});
            }
        }else{
            console.log(`ROOMIO: IDs do not match`);
        }
    });
    socket.on('disconnect', () => {
        console.log(`${room}: user ${id}, ${name} disconnected from room`);
        if(rooms.has(room)){
            let game=rooms.get(room);
            game.connected.delete(id);
            setTimeout(()=>{
                //makes it so that people can reload without losing progress. they have 2 seconds 
                if(game.connected.has(id)){ //if the person came back in time
                    console.log(`${room}: ${id}, ${name} came back after a short break`);
                } else if(!game.started){ //if game hasnt started
                    if(game.host===id){
                        if(game.players.length>1){
                            game.players.splice(game.players.indexOf(id),1);
                            if (game.team1.includes(id)) game.team1.splice(game.team1.indexOf(id),1);
                            if (game.team2.includes(id)) game.team2.splice(game.team2.indexOf(id),1);
                            if (game.spectators.includes(id)) game.spectators.splice(game.spectators.indexOf(id),1);
                            game.host=game.players[0]
                            let transitMapString = JSON.stringify(Array.from(game.nameMap));
                            roomio.in(room).emit('updatePlayers', {players: game.players, team1:game.team1, team2: game.team2, spectators: game.spectators, host: game.host, transitMapString: transitMapString, started: game.started, spectatorLen: game.spectators.length})
                            console.log(`${room}: ${id}, ${name} (the host) actually left before the game started, ${game.host} is the new host`);
                        }else{
                            rooms.delete(room);
                            console.log(`${room}: ${id}, ${name} (the host) actually left and was the last one, room ${room} deleted`);
                        };
                    } else{
                        game.players.splice(game.players.indexOf(id),1);
                        game.nameMap.delete(id);
                        if (game.team1.includes(id)) game.team1.splice(game.team1.indexOf(id),1);
                        if (game.team2.includes(id)) game.team2.splice(game.team2.indexOf(id),1);
                        if (game.spectators.includes(id)) game.spectators.splice(game.spectators.indexOf(id),1);
                        let transitMapString = JSON.stringify(Array.from(game.nameMap));
                        roomio.in(room).emit('updatePlayers', {players: game.players, team1:game.team1, team2: game.team2, spectators: game.spectators, host: game.host, transitMapString: transitMapString, started: game.started, spectatorLen: game.spectators.length})
                        console.log(`${room}: ${id}, ${name} actually left before the game started`);
                    }
                }else{ //if game has started
                    //restart the game and wait for players. move any spectators down to player. let people know who left. check for host
                    //if a player leaves and comes back, he becomes a spectator. fix that.
                    if (game.spectators.includes(id)){
                        game.players.splice(game.players.indexOf(id),1);
                        game.spectators.splice(game.spectators.indexOf(id),1);
                        roomio.in(room).emit('updatePlayers', {players: game.players, team1:game.team1, team2: game.team2, spectators: game.spectators, host: game.host, transitMapString: transitMapString, started: game.started, spectatorLen: game.spectators.length})
                        console.log(`${room}: ${id}, ${name} (a spectator) actually left during the game`);
                    } else if(game.players.includes(id)){
                        if(game.spectators.length>0){
                            game.players.splice(game.players.indexOf(id),1);
                            let replacement = game.spectators.splice(0,1)[0];
                            if(game.team1.includes(id)){
                                game.team1[game.team1.indexOf(id)]=replacement;
                            }else if (game.team2.includes(id)){
                                game.team2[game.team2.indexOf(id)]=replacement;
                            }
                            let transitMapString = JSON.stringify(Array.from(game.nameMap));
                            let spot = game.cotable.get(id);
                            game.table.set(spot, replacement);
                            game.cotable.set(replacement, spot);
                            game.cotable.delete(id)
                            roomio.in(room).emit('updatePlayers', {players: game.players, team1:game.team1, team2: game.team2, spectators: game.spectators, host: game.host, transitMapString: transitMapString, started: game.started, spectatorLen: game.spectators.length})
                            if(id==game.host) game.host=game.players[0];
                            roomio.in(room).emit('playerReplaced', {id: id, replacement: replacement});
                            console.log(`${room}: ${id}, ${name} (a player) actually left during the game, replaced by ${replacement} spectator replacement message emitted*`);
                        }else{//if someone left during the game and there are no spectators to replace them
                            if(game.host===id){//host left the room during game with no replacements
                                if(game.players.length>1){//host is not the last one left
                                    game.players.splice(game.players.indexOf(id),1);
                                    if (game.team1.includes(id)) game.team1.splice(game.team1.indexOf(id),1);
                                    if (game.team2.includes(id)) game.team2.splice(game.team2.indexOf(id),1);
                                    game.host=game.players[0]
                                    console.log(`${room}: ${id}, ${name} (the host) actually left during the game, no spectator replacements, new host: ${game.host}, abandon message emitted`);
                                }else{//host is the last one left
                                    rooms.delete(room);
                                    console.log(`${room}: [ERROR] ${id}, ${name} (the host) actually left during the game and was the last one, room deleted`);
                                    return; //so abandon message isnt deleted
                                };
                            }else{//non-host left the room with no replacements
                                game.players.splice(game.players.indexOf(id),1);
                                if (game.team1.includes(id)) game.team1.splice(game.team1.indexOf(id),1);
                                if (game.team2.includes(id)) game.team2.splice(game.team2.indexOf(id),1);
                                console.log(`${room}: ${id}, ${name} (a player) actually left during the game, no spectator replacements, abandon message emitted`);
                            }

                            roomio.in(room).emit('gameAbandoned', {id: id}); //add winner, scores, etc.
                            rooms.set(room, 
                                {connected: game.connected, 
                                nameMap: game.nameMap, 
                                room: room, 
                                host: game.host, 
                                players: game.players, 
                                team1: game.team1, 
                                team2: game.team2, 
                                spectators: game.spectators, 
                                turn: 0, 
                                cards: [[],[],[],[],[],[]],
                                started: false,
                                table: null,
                                cotable: null,
                                halfsuits: [0,1,2,3,4,5,6,7,8],
                                score1: 0,
                                won1: [],
                                score2: 0,
                                won2: [],
                                pastMoves: []
                                }
                            );

                            game=rooms.get(room)
                            let transitMapString = JSON.stringify(Array.from(game.nameMap));
                            roomio.in(room).emit('updatePlayers', {players: game.players, team1:game.team1, team2: game.team2, spectators: game.spectators, host: game.host, transitMapString: transitMapString, started: game.started, spectatorLen: game.spectators.length})
                        }
                    }
                };
            }, 3000); //2 second timeout
        };
    });
})

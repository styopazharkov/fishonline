const app = require("express")();
const server = require('http').Server(app);
const bodyParser = require("body-parser");
const io = require('socket.io')(server);
const port = 3000;

let rooms = new Map();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

server.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
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
    console.log(`INDEXIO: user joined`);
    var id;
    var name;
    var room;

    socket.on('tellInfo', (data)=>{
        id = data.id;
        name = data.name;
        room = data.room;
        console.log(`INDEXIO: user gave info: id: ${id}, name: ${name}, room: ${room}`);
    });

    socket.on('getID', ()=>{
        id = Math.floor((Math.random() * 100000000000)).toString();
        console.log(`INDEXIO: user asked for new id: ${id}`);
        socket.emit('setID', id);
    });


    socket.on('createRoom', (data)=>{
        console.log(`INDEXIO: room ${data.room} created by ${data.id}, name: ${data.name}`);
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
            turn: 1, 
            cards: null,
            started: false,
            table: null,
            score1: 0,
            score2: 0
            }
        );
    });

    socket.on('disconnect', () => {
        console.log(`INDEXIO: user ${id}, ${name}, ${room} disconnected. ${rooms.size}`);
    });
})

// ############ JOINIO
const joinio = io.of('/joinio');
joinio.on('connection', (socket) => {
    console.log(`JOINIO: user joined`);
    var id;
    var name;
    var room;

    socket.on('tellInfo', (data)=>{
        id = data.id;
        name = data.name;
        room = data.room;
        console.log(`JOINIO: user gave info: id: ${id}, name: ${name}, room: ${room}`);
    });

    socket.on('requestJoin', (data)=>{
        // insert to let user know that this isnt a room
        if(rooms.has(data.room)){
            console.log(`JOINIO: room ${data.room} approved to ${data.id, data.name}`);
            room = data.room
            let game=rooms.get(room);
            game.players.push(data.id);
            if(game.team1.length<3){
                game.team1.push(data.id);
            }else if(game.team2.length<3){
                game.team2.push(data.id);
            }else{
                game.spectators.push(data.id)
            };
            socket.emit('requestAns', true); //make the data an object
        }else{
            console.log(`JOINIO: room ${data.room} denied to ${data.id, data.name}`);
            socket.emit('requestAns', false); //make the data an object
        };
    });

    socket.on('disconnect', () => {
        console.log(`JOINIO: user ${id}, ${name}, ${room}  disconnected. ${rooms.size}, `);
    });
})

// ############ ROOMIO
const roomio = io.of('/roomio');
roomio.on('connection', (socket) => {
    console.log(`ROOMIO:  user joined`);
    var id;
    var name;
    var room;

    socket.on('tellInfoAndRequest', (data)=>{
        id = data.id;
        name = data.name;
        room = data.room;
        console.log(`ROOMIO:  user gave info: id: ${id}, name: ${name}, room: ${room}`);

        if(rooms.has(room)){
            let game=rooms.get(room);
            if(game.players.includes(id)){
                socket.join(room);

                game.connected.add(id);
                game.nameMap.set(data.id, data.name);
                if (game.host===id){
                    console.log(`ROOMIO:  user id: ${id}, name: ${name} admitted to room: ${room} as host`);
                    socket.emit('requestAns', {ans: true});
                }else{
                    console.log(`ROOMIO:  user id: ${id}, name: ${name} admitted to room: ${room}`);
                    socket.emit('requestAns', {ans: true});
                };

                //socket.io cant emit maps so we convert it to a string and then back
                let transitMapString = JSON.stringify(Array.from(game.nameMap));
                roomio.in(room).emit('updatePlayers', {players: game.players, team1:game.team1, team2: game.team2, spectators: game.spectators, host: game.host, transitMapString: transitMapString})
            }else{
                socket.emit('requestAns', {ans: false, msg: `${id} not in players: ${game.players}`});
            };
        }else{
            socket.emit('requestAns', {ans: false, msg: "no such game"});
        };
    });

    socket.on('startGame',(data) =>{
        console.log(`start game requested by ${data.id} in room ${data.room}`)
        let game = rooms.get(data.room);
        if(game.host===data.id && game.players.length>=6){
            //make sure that every player is connected
            //make table
            let table = new Map();

            //deal cards

            //send out update
        }else{
            //tell host why game start failed
            console.log(`game start failed: not host or not enough players`)
        }
    });

    socket.on('disconnect', () => {
        if(rooms.has(room)){
            let game=rooms.get(room);
            game.connected.delete(id);
            setTimeout(()=>{
                //makes it so that people can reload without losing progress. they have 2 seconds
                if(game.connected.has(id)){
                    console.log(`ROOMIO: ${id} came back`);
                } else{
                    if(game.host===id){
                        if(game.players.length>0){
                            game.players.splice(game.players.indexOf(id),1);
                            if (game.team1.includes(id)) game.team1.splice(game.team1.indexOf(id),1);
                            if (game.team2.includes(id)) game.team2.splice(game.team2.indexOf(id),1);
                            if (game.spectators.includes(id)) game.spectators.splice(game.spectators.indexOf(id),1);
                            game.host=game.players[0]
                            console.log(`ROOMIO: ${id} (the host) actually left, ${game.host} is the new host`);
                            let transitMapString = JSON.stringify(Array.from(game.nameMap));
                            roomio.in(room).emit('updatePlayers', {players: game.players, team1:game.team1, team2: game.team2, spectators: game.spectators, host: game.host, transitMapString: transitMapString})
                        }else{
                            rooms.delete(room);
                            console.log(`ROOMIO: ${id} (the host) actually left, room ${room} deleted`);
                        };
                    } else{
                        game.players.splice(game.players.indexOf(id),1);
                        console.log(`ROOMIO: ${id} actually left`);
                        game.nameMap.delete(id);
                        if (game.team1.includes(id)) game.team1.splice(game.team1.indexOf(id),1);
                        if (game.team2.includes(id)) game.team2.splice(game.team2.indexOf(id),1);
                        if (game.spectators.includes(id)) game.spectators.splice(game.spectators.indexOf(id),1);
                        let transitMapString = JSON.stringify(Array.from(game.nameMap));
                        roomio.in(room).emit('updatePlayers', {players: game.players, team1:game.team1, team2: game.team2, spectators: game.spectators, host: game.host, transitMapString: transitMapString})
                    }
                };
            }, 1000);
        };
        console.log(`ROOMIO: user ${id} disconnected from room ${rooms.size}`);
    });
})


//TODO: make console logs better
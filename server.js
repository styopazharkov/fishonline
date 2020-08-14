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
        rooms.set(data.room, {connected: new Set(), nameMap: nameMap, room: data.room, host: data.id, players:[data.id], team1: [data.id], team2: [], spectators: [], turn: null, cards: null});
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
            let game = rooms.get(data.room);
            game.players.push(data.id);
            game.team1.push(data.id);
            game.nameMap.set(data.id, data.name)
            room = data.room
            socket.emit('requestAns', true);
        }else{
            console.log(`JOINIO: room ${data.room} denied to ${data.id, data.name}`);
            socket.emit('requestAns', false);
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
                if (game.host===id){
                    console.log(`ROOMIO:  user id: ${id}, name: ${name} admitted to room: ${room} as host`);
                    socket.emit('requestAns', {ans: true, host: true});
                    //socket.io cant emit maps so we convert it to a string and then back
                    let transitMapString = JSON.stringify(Array.from(game.nameMap));
                    roomio.in(room).emit('updatePlayers', {players: game.players, host: game.host, transitMapString: transitMapString})
                }else{
                    console.log(`ROOMIO:  user id: ${id}, name: ${name} admitted to room: ${room}`);
                    socket.emit('requestAns', {ans: true, host: false});
                    //socket.io cant emit maps so we convert it to a string and then back
                    let transitMapString = JSON.stringify(Array.from(game.nameMap));
                    roomio.in(room).emit('updatePlayers', {players: game.players, host: game.host, transitMapString: transitMapString})
                }
            }else{
                socket.emit('requestAns', {ans: false, msg: `${id} not in players: ${game.players}`});
            };
        }else{
            socket.emit('requestAns', {ans: false, msg: "no such game"});
        };
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
                        //change host
                        //if no one to change to:
                        rooms.delete(room);
                        console.log(`ROOMIO: ${id} actually left`);
                    }
                    // tell people that someone left
                };
            }, 2000);
        };
        console.log(`ROOMIO: user ${id} disconnected from room ${rooms.size}`);
    });
})
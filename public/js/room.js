let room = sessionStorage.getItem('room');
let id = sessionStorage.getItem('id');
let name=sessionStorage.getItem('name');
let host;
//writes to page
document.querySelector("h2").innerHTML=( room );
document.querySelector("h3").innerHTML=(`id: ${id}, name: ${name}`);

const socket = io('/roomio');

socket.on('connect', ()=>{
    if(!id || !name || !room){
        sessionStorage.clear();
        location.href = '/';
    }else{
        console.log(`ROOM: connected to server from room with id: ${id}, name: ${name} `);
        socket.emit('tellInfoAndRequest', {id: id, name: name, room: room});

        socket.on('requestAns', (data)=>{
            if(!data.ans){
                console.log(`ROOM: request to join ${room} denied: ${data.msg}`);
                sessionStorage.clear();
                location.href ='/';
            }else{
                console.log(`ROOM: request to join ${room} approved`);
            };
        });
    };
    
});
socket.on('updatePlayers', (data)=>{
    //socket.io cant emit maps so we convert it to a string and then back
    host=data.host;
    let nameMap = new Map(JSON.parse(data.transitMapString));
    let str=`host: ${data.host}  ${nameMap.get(data.host)}\n`;
    str+='players: '+JSON.stringify(data.players);
    str+='<br> team1: '+JSON.stringify(data.team1); // make this neater
    str+='<br> team2: '+JSON.stringify(data.team2);
    str+='<br> spectators: '+JSON.stringify(data.spectators);
    $(".players").html(str);

    if(data.players.length>=6 && host===id){
        $(".startButton").removeAttr('hidden');
        $(".startButton").removeAttr('disabled');
    }else if(!$(".startButton").attr('disabled')){
        $(".startButton").attr('disabled', true);
        $(".startButton").attr('hidden', true);
    };
    
});

socket.on('gameStarted', (data)=>{
    if(!$(".startButton").attr('disabled')){
        $(".startButton").attr('disabled', true);
        $(".startButton").attr('hidden', true);
    };
    //draw table
    $(".table").html('<br> table:'+JSON.stringify(data.table)); //socket cant emit maps
    if(data.players.includes(id)){
        socket.emit('getCards', {room: room, id:id})
    }
});

socket.on('updateCards', (data)=>{
    $(".cards").html('<br> cards:'+JSON.stringify(data.cards));
});

$('.startButton').click(() =>{
    console.log(`ROOM: game started`)
    socket.emit('startGame', {id: id, room: room})
});
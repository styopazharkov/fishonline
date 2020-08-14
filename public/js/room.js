let room = sessionStorage.getItem('room');
let id = sessionStorage.getItem('id');
let name=sessionStorage.getItem('name');

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
                // location.href ='/';
            }else{
                console.log(`ROOM: request to join ${room} approved`);
                socket.on('updatePlayers', (data)=>{
                    //socket.io cant emit maps so we convert it to a string and then back
                    nameMap = new Map(JSON.parse(data.transitMapString));
                    let str=`host: ${data.host}  ${nameMap.get(data.host)}\n`;
                    data.players.forEach(function (item, index) {
                        str+=`<p> player ${index}: ${item} ${nameMap.get(item)},</p>`;
                    });
                    document.querySelector("div").innerHTML=str;
                    
                });
            };
        });
    };
    
});
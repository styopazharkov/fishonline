//index.js
        

let id = sessionStorage.getItem('id');
let name;
let room;
sessionStorage.removeItem("room");
sessionStorage.removeItem("name");

const socket = io('/indexio');

socket.on('connect', ()=>{
    console.log(`INDEX: connected to server with id: ${id}`);
    if(id){
        socket.emit('tellInfo', {id: id});
    }else{
        socket.emit('getID');
    };
});

socket.on('setID', (id)=>{
    console.log(`INDEX: set id to ${id}`);
    sessionStorage.setItem('id', id);
    socket.emit('tellInfo', {id: id});
});

$('.join').click(() =>{
    let name = $('.name').val();
    console.log(`INDEX: setting name to ${name}`);
    let id=sessionStorage.getItem('id');
    sessionStorage.setItem("name", name);
    socket.emit('tellInfo', {name: name, id: id});
    location.href = '/join';
});

$('.create').click(() =>{
    let name = $('.name').val();
    console.log(`INDEX: setting name to ${name}`);
    let id=sessionStorage.getItem('id');
    sessionStorage.setItem("name", name);

    let room  = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 4; i++ ) {
        room += characters.charAt(Math.floor(Math.random() * characters.length));
    };

    socket.emit('tellInfo', {name: name, id: id, room: room});
    console.log(`INDEX: creating room ${room}`);
    sessionStorage.setItem("room", room);
    if(room && name && id){
        socket.emit('createRoom', {name: name, id: id, room: room});
        location.href = '/'+room;
    }else{
        location.href = '/';
    }

});
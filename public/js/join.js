
let id = sessionStorage.getItem('id');
let name=sessionStorage.getItem('name'); 

//writes welcome user at the top
$(".welcome").html("Welcome, "+ name+"!");

const socket = io('/joinio');

socket.on('connect', ()=>{
    socket.emit('tellInfo', {id: id, name: name});
    if(!id || !name){
        sessionStorage.clear();
        location.href = '/';
    }else{
        console.log(`JOIN: connected to server with id: ${id} and name ${name}`);
    };
    
});

$('.join').click(() =>{ //check that room chars are valid and not empty
    let room = $('.room').val().toUpperCase();
    console.log(`JOIN: requesting to enter ${room}`);
    let id=sessionStorage.getItem('id');
    let name=sessionStorage.getItem('name');
    socket.emit('requestJoin', {name: name, id: id, room: room});
    socket.on('requestAns', (ans)=>{
        if(ans){
            sessionStorage.setItem('room', room);
            location.href ='/'+room;
        }else{
            console.log(`JOIN: request to join ${room} denied`);
        };
    });
});

    
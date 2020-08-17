let room = sessionStorage.getItem('room');
let id = sessionStorage.getItem('id');
let name=sessionStorage.getItem('name');
let host;
//writes to page
$("h2").html( room ); //ugly
$("h3").html(`id: ${id}, name: ${name}`); //ugly

//buttons: 
let startButton = $("<button>", { //button to start game
    text: 'Start Game',
    class: 'startButton',
    click: () => {
        console.log(`ROOM: game started`)
        socket.emit('startGame', {id: id, room: room})
    }
})

let makePossPeopleDropdown = (possPeople)=>{ //dropdown to select person to ask. ugly
    let possPeopleDropdown=$('<select>',{
        class: 'possPeopleDropdown'
    })
    possPeople.forEach((item)=>{
        let poss=$('<option>', {
            value: item,
            text: item
        });
        possPeopleDropdown.append(poss);
    })
    return possPeopleDropdown;
}

let makePossCardsDropdown = (possCards)=>{ //dropdown to select card to ask for. ugly
    let possCardsDropdown=$('<select>',{
        class: 'possCardsDropdown'
    })
    possCards.forEach((item)=>{
        let poss=$('<option>', {
            text: JSON.stringify(item),
            value: item.halfsuit.toString()+item.value.toString()
        });
        possCardsDropdown.append(poss);
    });
    return possCardsDropdown;
}

let makeMoveForm = (possPeople, possCards) => { //actually a div so i should rename
    let moveForm = $('<div>', {
        class: 'moveForm',
    });
    moveForm.append(makePossPeopleDropdown(possPeople));
    moveForm.append(makePossCardsDropdown(possCards));
    let submitButton = $('<button>',{
        text: 'Make Move',
        click: ()=>{
            socket.emit('makeMove', {id: id, target: $('.possPeopleDropdown').val(), card: {halfsuit: Number($('.possCardsDropdown').val()[0]), value: Number($('.possCardsDropdown').val()[1])}})
        }
    });
    moveForm.append(submitButton);
    return moveForm
}

let makeDeclareDropdown = (halfsuits)=>{ //dropdown to select halfsuit to declare. ugly
    let declareDropdown=$('<select>',{
        class: 'declareDropdown'
    })
    halfsuits.forEach((item)=>{
        let poss=$('<option>', {
            text: JSON.stringify(item),
            value: item
        });
        declareDropdown.append(poss);
    });
    return declareDropdown;
}

let makeCardDeclareDropdown = (value, team)=>{
    let cardDeclareDropdown=$('<select>',{
        class: 'cardDeclareDropdown'+JSON.stringify(value), //should show a picture instead
    })
    team.forEach((item)=>{
        let poss=$('<option>', {
            text: JSON.stringify(item),
            value: item
        });
        cardDeclareDropdown.append(poss);
    });
    return cardDeclareDropdown;
}

let makeDeclareDiv = (halfsuits, team) =>{
    let declareDiv=$('<div>', {
        class: 'declareDiv'
    })
    declareDiv.append(makeDeclareDropdown(halfsuits));
    let declareButton = $('<button>',{
        text: 'Declare',
        click: ()=>{
            let halfsuit=Number($('.declareDropdown').val());
            let cardHolders=[];
            [0,1,2,3,4,5].forEach((item)=>{
                cardHolders.push($('.cardDeclareDropdown'+JSON.stringify(item)).val());
            })
            console.log(`TEST: halfsuit: ${halfsuit}, cardHolders: ${cardHolders}`)
            socket.emit('declare', {id: id, halfsuit: halfsuit, cardHolders: cardHolders});
        }
    });
    declareDiv.append(declareButton);
    [0,1,2,3,4,5].forEach((item)=>{
        declareDiv.append(makeCardDeclareDropdown(item, team));
    });
    return declareDiv;
}

//socketing
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

    if(data.players.length>=6 && host===id){ //only if game has started
        $('.startButtonDiv').append(startButton);
    }else if($(".startButton")){
        $(".startButton").remove();
    };
    
});

socket.on('gameStarted', (data)=>{
    if($(".startButton")){
        $(".startButton").remove();
    };
    //draw table
    $(".table").html('<br> table:'+JSON.stringify(data.table)); //socket cant emit maps
    if(data.players.includes(id)){
        socket.emit('getCards', {room: room, id:id})
    }

});

socket.on('updateCards', (data)=>{ //if page is reloaded, this wont show. need to fix
    $(".cards").html('<br> cards:'+JSON.stringify(data.cards));
    console.log(`data: ${data.turnid}, id: ${id}`);
    if ($('.moveForm')){
        $('.moveForm').remove();
    }
    if(data.turnid===id){
        console.log(`ROOM: making move form`);
        $('.moveFormDiv').append(makeMoveForm(data.possPeople, data.possCards));
    }

    if ($('.declareDiv')){
        $('.declareDiv').remove();
    }
    console.log(`TEST: ${data.halfsuits}`)
    $(".declareDivDiv").append(makeDeclareDiv(data.halfsuits, data.team))

});

socket.on('moveMade',(data)=>{
    if (data.success){
        $('.pastMove').html(`${data.mover} took ${JSON.stringify(data.card)} from ${data.target}`);
    } else{
        $('.pastMove').html(`${data.mover} didn't take ${JSON.stringify(data.card)} from ${data.target}`);
    }
    socket.emit('getCards', {room: room, id:id});
});

socket.on('declared',(data)=>{
    if (data.success){
        $('.pastMove').html(`${data.declarer} successfully declared ${data.halfsuit}`);
    } else{
        $('.pastMove').html(`${data.declarer} unsuccessfully declared ${data.halfsuit}`);
    }
    socket.emit('getCards', {room: room, id:id});
});


let room = sessionStorage.getItem('room');
let id = sessionStorage.getItem('id');
let name=sessionStorage.getItem('name');
let host;

//map functions:
let cardMapFun = (card)=>{ //function maps card to card name. eg: {halfsuit: 3, value: 4} => '6D'
    let d1;
    let d2;
    switch (card.halfsuit%5){
        case 0:
            d2='S';
            break;
        case 1:
            d2='H';
            break;
        case 2:
            d2='C';
            break;
        case 3:
            d2='D';
    }
    if(card.halfsuit<=3){
        d1=(card.value+2).toString();
    } else if (card.halfsuit>=5){
        switch (card.value){
            case 0:
                d1='9';
                break;
            case 1:
                d1='10';
                break;
            case 2:
                d1='J';
                break;
            case 3:
                d1='Q';
                break;
            case 4:
                d1='K';
                break;
            case 5:
                d1='A';
        }
    } else if (card.halfsuit===4){
        switch (card.value){
            case 0:
                d1='8';
                d2='S'
                break;
            case 1:
                d1='8';
                d2='H';
                break;
            case 2:
                d1='8';
                d2='C';
                break;
            case 3:
                d1='8';
                d2='D';
                break;
            case 4:
                d1='X';
                d2='B';
                break;
            case 5:
                d1='X';
                d2='R';
        }
    }
    return d1+d2;
};

let halfsuitMapFun = (halfsuit)=>{//maps halfsuit to halfuit name. eg: 6 => UH
    switch (halfsuit){
        case 0:
            return 'LS';
        case 1:
            return 'LH';
        case 2:
            return 'LC';
        case 3:
            return 'LD';
        case 4:
            return '8s';
        case 5:
            return 'US';
        case 6:
            return 'UH';
        case 7:
            return 'UC';
        case 8:
            return 'UD';
    }
};

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
            text: cardMapFun(item),
            value: item.halfsuit.toString()+item.value.toString()
        });
        possCardsDropdown.append(poss);
    });
    return possCardsDropdown;
}

let makeMoveDiv = (possPeople, possCards) => {
    let moveDiv = $('<div>', {
        class: 'moveDiv',
    });
    moveDiv.append(makePossPeopleDropdown(possPeople));
    moveDiv.append(makePossCardsDropdown(possCards));
    let submitButton = $('<button>',{
        text: 'Make Move',
        click: ()=>{
            socket.emit('makeMove', {id: id, target: $('.possPeopleDropdown').val(), card: {halfsuit: Number($('.possCardsDropdown').val()[0]), value: Number($('.possCardsDropdown').val()[1])}})
        }
    });
    moveDiv.append(submitButton);
    return moveDiv
}

let makeCard = (card)=>{
    let img = $('<img>', {
        src: "/card/"+cardMapFun(card)+".png",
        alt: cardMapFun(card),
        height: '90%'
    });
    return img;
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
    //all of this only if game hasnt started. if it has started, remove grid1, unhide grid2 (?), ask for cards
    if(!data.started){
        $(".gridB").hide();
        $(".roomA").html(`Room Code: ${room}`);
        $("title").html(`Fish Online - ${name}`);
        host=data.host;
        let nameMap = new Map(JSON.parse(data.transitMapString));

        $('.host').html(`Host: ${nameMap.get(data.host)}`) //host box

        $('.members1Div').empty();
        data.team1.forEach(item=>{
            let playerboxDiv=$('<div>', {
                class: 'playerBoxDiv'
            })
            let playerbox=$('<div>', {
                class: 'playerBox'
            })
            playerbox.append(`<p>${nameMap.get(item)}</p>`);
            playerboxDiv.append(playerbox)
            $('.members1Div').append(playerboxDiv); //team1 box
        });

        $('.members2Div').empty();
        data.team2.forEach(item=>{
            let playerboxDiv=$('<div>', {
                class: 'playerBoxDiv'
            })
            let playerbox=$('<div>', {
                class: 'playerBox'
            })
            playerbox.append(`<p>${nameMap.get(item)}</p>`);
            playerboxDiv.append(playerbox)
            $('.members2Div').append(playerboxDiv); //team2 box
        });

        $('.spectators').empty(); //like playerbox but spectatorbox
        data.spectators.forEach(item=>{
            $('.spectators').append(`<li>${nameMap.get(item)}</li>`) //spectators box
        });

        if(data.players.length>=6){
            if(host===id){
                $('.startButtonDiv').append(startButton);
            } else {
                $('.startButtonDiv').append('waiting for host to start game');
            }
        }else{
            $(".startButtonDiv").empty();
        };
    } else { //game has started
        if(data.players.includes(id)){
            $('.gridA').hide();
            $(".gridB").show();
            socket.emit('getCards', {room: room, id:id})
        }
    }
});

socket.on('gameStarted', (data)=>{
    $(".gridA").hide();
    $('.gridB').show();
    //draw table
    $(".table").html('<br> table:'+JSON.stringify(data.table)); //socket cant emit maps
    if(data.players.includes(id)){
        socket.emit('getCards', {room: room, id:id})
    }

});

socket.on('updateCards', (data)=>{ //if page is reloaded, this wont show. need to fix

    $('.roomB').html(`${room}`)

    $('.cardsDiv').empty();
    data.cards.forEach(item=>{
        $('.cardsDiv').append(makeCard(item));
    })

    $('.turnDiv').empty();
    if(data.turnid===id){
        console.log(`TEST: making move div`);
        //translate people to names
        $('.turnDiv').append(makeMoveDiv(data.possPeople, data.cards));
        //add notification of whose turn it is
    }

    $('.declareDivDiv').empty();
    //translate people and halfsuits
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


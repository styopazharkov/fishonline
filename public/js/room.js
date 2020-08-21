
let room = sessionStorage.getItem('room');
let id = sessionStorage.getItem('id');
let name=sessionStorage.getItem('name');
let host;
let nameMap;

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
            return 'Low Spades';
        case 1:
            return 'Low Hearts';
        case 2:
            return 'Low Clubs';
        case 3:
            return 'Low Diamonds';
        case 4:
            return '8s & Jokers';
        case 5:
            return 'High Spades';
        case 6:
            return 'High Hearts';
        case 7:
            return 'High Clubs';
        case 8:
            return 'High Diamonds';
    }
};

//buttons: 
let startButton = () => { return $("<button>", { //button to start game
    text: 'Start Game',
    class: 'startButton',
    click: () => {
        console.log(`ROOM: game started`)
        socket.emit('startGame', {id: id, room: room})
    }
});}

let makePossPeopleDropdown = (possPeople)=>{ //dropdown to select person to ask. ugly
    let possPeopleDropdown=$('<select>',{
        class: 'possPeopleDropdown'
    })
    let d=$('<option>', {
        value: 'none',
        text: 'Player:'
    });
    possPeopleDropdown.append(d);
    possPeople.forEach((item)=>{
        let poss=$('<option>', {
            value: item,
            text: nameMap.get(item)
        });
        possPeopleDropdown.append(poss);
    })
    return possPeopleDropdown;
}

let makePossCardsDropdown = (possCards)=>{ //dropdown to select card to ask for. ugly
    let possCardsDropdown=$('<select>',{
        class: 'possCardsDropdown'
    })
    let d=$('<option>', {
        text: 'Card:',
        value: 'none'
    });
    possCardsDropdown.append(d);
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
        class: 'makeMoveButton',
        click: ()=>{
            let target=$('.possPeopleDropdown').val()
            let card=$('.possCardsDropdown').val()
            if(target==='none' || card === 'none'){
                console.log(`invalid option ${target}, ${card}`)
                return;
            }
            //make sure that player actually selected
            socket.emit('makeMove', {id: id, target: target, card: {halfsuit: Number(card[0]), value: Number(card[1])}})
        }
    });
    moveDiv.append(submitButton);
    return moveDiv
}

let makeCard = (card, size)=>{
    let img = $('<img>', {
        class: 'card',
        src: "/card/"+cardMapFun(card)+".png",
        alt: cardMapFun(card),
        height: size
    });
    return img;
}

let makeDeclareDropdown = (halfsuits)=>{ //dropdown to select halfsuit to declare. ugly
    let declareDropdown=$('<select>',{
        class: 'declareDropdown',
        change: ()=>{
            console.log('change');
            let halfsuit=$('.declareDropdown').val();
            console.log(halfsuit);
            for(let i=0; i<6; i++){
                if (halfsuit!=='none'){
                    $('.defaultCardDeclare'+JSON.stringify(i)).html(`Has ${cardMapFun({halfsuit: Number(halfsuit), value: i})}:`);
                }else{
                    $('.defaultCardDeclare'+JSON.stringify(i)).html('Carholder');
                }
            }
        }
    });
    let d=$('<option>', {
        text: 'Halfsuit',
        value: 'none'
    });
    declareDropdown.append(d);
    halfsuits.forEach((item)=>{
        let poss=$('<option>', {
            text: halfsuitMapFun(item),
            value: item
        });
        declareDropdown.append(poss);
    });
    return declareDropdown;
}

let makeCardDeclareDropdown = (value, team)=>{
    let cardDeclareDropdown=$('<select>',{
        class: 'cardDeclareDropdown cardDeclareDropdown'+JSON.stringify(value), //should show a picture instead
    })
    let d=$('<option>', {
        class: 'defaultCardDeclare'+JSON.stringify(value),
        text: 'CardHolder', //convert to card name
        value: 'none'
    });
    cardDeclareDropdown.append(d);
    team.forEach((item)=>{
        let poss=$('<option>', {
            text: nameMap.get(item), 
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
        class: 'declareButton',
        click: ()=>{
            let invalid=false //makes sure all inputs are good
            let halfsuit=$('.declareDropdown').val();
            if(halfsuit==='none')invalid=true;
            let cardHolders=[];
            [0,1,2,3,4,5].forEach((item)=>{
                let temp=$('.cardDeclareDropdown'+JSON.stringify(item)).val()
                if (temp==='none') invalid=true;
                cardHolders.push(temp);
            })
            if(invalid) return;
            console.log(`TEST: halfsuit: ${halfsuit}, cardHolders: ${cardHolders}`)
            socket.emit('declare', {id: id, halfsuit: Number(halfsuit), cardHolders: cardHolders});
        }
    });
    [0,1,2,3,4,5].forEach((item)=>{
        declareDiv.append(makeCardDeclareDropdown(item, team));
    });
    declareDiv.append(declareButton);
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
    console.log(data.players)
    //socket.io cant emit maps so we convert it to a string and then back
    //all of this only if game hasnt started. if it has started, remove grid1, unhide grid2 (?), ask for cards
    if(!data.started){
        $('.gridA').show();
        $(".gridB").hide();
        $(".roomA").html(`Room Code: ${room}`);
        $("title").html(`Fish Online - ${name}`);
        host=data.host;
        nameMap = new Map(JSON.parse(data.transitMapString));

        $('.hostA').html(`Host: ${nameMap.get(data.host)}`) //host box

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
        $(".startButtonDiv").empty();
        if(data.players.length>=6){
            if(host===id){
                $('.startButtonDiv').append(startButton());
            } else {
                $('.startButtonDiv').append('waiting for host to start game');
            }
        }
    } else { //game has started
        //draw table:
        let tableImg= $('<img>',{
            src: "/table",
            alt: "image of table for fish online",
            width: '90%'
        })
        $('.table').append(tableImg);

        $('.team1scoreDiv h5').html('Team 1 points:');
        $('.team2scoreDiv h5').html('Team 2 points:');
        $('.logDiv h4').html('Past Moves:');

        if(data.players.includes(id)){
            console.log('asking for cards here')
            $("title").html(`Fish Online - ${name}`);
            nameMap = new Map(JSON.parse(data.transitMapString));
            console.log(`user joined while game is started`)
            $('.gridA').hide();
            $(".gridB").show();
            socket.emit('getCards', {room: room, id:id})
            $('.hostB').html(`Host: ${nameMap.get(data.host)}`)
        }
    }
});

socket.on('gameStarted', (data)=>{
    $(".gridA").hide();
    $('.gridB').show();
    if(data.players.includes(id)){
        socket.emit('getCards', {room: room, id:id})
    }

});

socket.on('updateCards', (data)=>{ //if page is reloaded, this wont show. need to fix

    $('.roomB').html(`${room}`)

    $('.hostB').html(`Host: ${nameMap.get(data.host)}`)

    $('.cardsDiv').empty();
    if(data.cards.length>14){
        data.cards.forEach(item=>{
            $('.cardsDiv').append(makeCard(item, '50%'));
        })
    }else if(data.cards.length>11){
        data.cards.forEach(item=>{
            $('.cardsDiv').append(makeCard(item, '70%'));
        })
    }else{
        data.cards.forEach(item=>{
            $('.cardsDiv').append(makeCard(item, '85%'));
        })
    }

    for(let i=0; i<6; i++){
        $('.name'+i.toString()).html(data.fakeTable[i]);
    }

    console.log(data.won1)
    $('.team1score').empty();
    data.won1.forEach(elem => {
        $('.team1score').append(`<p>${halfsuitMapFun(elem)}</p>`);
    });

    $('.team2score').empty();
    data.won2.forEach(elem => {
        $('.team2score').append(`<p>${halfsuitMapFun(elem)}</p>`);
    });

    $('.spectatorsDivB').empty();
    $('.spectatorsDivB').append(`${data.spectatorLen} spectators watching`)

    $('.turnDiv').empty();
    if(data.turnid===id){
        $('.turnDiv').append(makeMoveDiv(data.possPeople, data.possCards));
    } else {
        $('.turnDiv').append(`<p>Waiting on ${nameMap.get(data.turnid)} to move...</p>`)
    }

    if(!data.spectator){
        $('.declareDivDiv').empty();
        $(".declareDivDiv").append(makeDeclareDiv(data.halfsuits, data.team))
    }
});

socket.on('moveMade',(data)=>{
    $('.logDiv').empty()
    $('.logDiv').append('<h4>Past moves:</h4>')
    data.forEach(elem => {
        if (elem.success){
            $('.logDiv').append(`<p> ${nameMap.get(elem.mover)} took ${cardMapFun(elem.card)} from ${nameMap.get(elem.target)} <p>`);
        } else{
            $('.logDiv').append(`<p> ${nameMap.get(elem.mover)} didn't take ${cardMapFun(elem.card)} from ${nameMap.get(elem.target)} <p>`);
        }
    });
    
    socket.emit('getCards', {room: room, id:id});
});

socket.on('declared',(data)=>{
    if (data.success){
        $('.logDiv').append(`<p>${nameMap.get(data.declarer)} successfully declared ${halfsuitMapFun(data.halfsuit)}</p>`);
    } else{
        $('.logDiv').append(`<p>${nameMap.get(data.declarer)} unsuccessfully declared ${halfsuitMapFun(data.halfsuit)}</p>`);
    }
    socket.emit('getCards', {room: room, id:id});
});

socket.on('gameOver', data=>{
    swal(`Game Over`,`${nameMap.get(data.winners[0])}, ${nameMap.get(data.winners[1])}, and ${nameMap.get(data.winners[2])} won the game ${data.score[0]} to ${data.score[1]}!`);
});

socket.on('gameAbandoned', data=>{
    swal(`Game Abandoned`,`${nameMap.get(data.id)} left during the game!`, 'warning');
});

socket.on('playerReplaced', data=>{
    swal(`Game Abandoned`,`${nameMap.get(data.id)} left during the game and will be replaced by ${nameMap.get(data.replacement)}.`, 'info');
});

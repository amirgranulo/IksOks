var pool = require('../utils/db')

module.exports  = (io) => {
    let users = [];
    const rooms = new Map();
    io.on('connection',  socket => {
        console.log( "A user connected", socket.id );




        socket.on("login",(username) => {
            users.push({
                userID : socket.id,
                username : username
            })
            console.info(socket.id);
            socket.username = username;
            console.info(username + ' is now online')
        })
        socket.on("disconnect",() => {
            console.info(socket.id + "has disconnected")
            console.info(users[socket.id] +' disconnected')
            socket.emit("leaveRoom")

            delete users[socket.id]


        })

        socket.on("leaveRoom",() => {
            if (rooms[socket.username]) {
                io.in(socket.username).socketsLeave(socket.username); // if owner leaves -> kick everyone
                rooms.delete(socket.current_room)
                socket.current_room = "";

            }
            else {
                io.to(socket.current_room).emit("roomChange",{leftRoom : socket.username})
                const updatedPlayers = rooms.get(socket.current_room).players
                updatedPlayers.pop()
                rooms.set(socket.current_room, {players : updatedPlayers})
                socket.leave(socket.current_room);
                socket.current_room = "";

            }

        })

        socket.on("createRoom", () => {
            console.info(socket.username + ' is creating a game')
            rooms.set(socket.username,{players : [socket.username]})
            console.info(rooms)
            socket.join(socket.username);
            socket.current_room = socket.username;

        })
        socket.on("getRooms", () => {
            let room_names = [];
            if (rooms.size > 0 ) {
                for (let [key, value] of rooms) {

                    if (value.players.length === 1) {
                        console.log(value.players)
                        room_names.push(key) } // length 1 means owner is waiting for the other player

                }
            }
            io.emit("showRooms", room_names);

        })

        socket.on("joinRoom",(room) => {
            socket.join(room) // actually join the room
            const players =  rooms.get(room).players
            players.push(socket.username) // update players in Map of rooms
            rooms.set(room,{players : players});
            socket.current_room = room;
            console.log(socket.username+ "joined the room")
            io.to(room).emit("roomChange", {players :players})
        })

        socket.on("playerReady",() => {
            const room = rooms.get(socket.current_room);
            if (room.ready) {
                if (socket.current_room === socket.username) {
                    socket.sign = "X"
                }
                else {
                    socket.sign = "O"
                }
                setTimeout(() => {
                    io.to(socket.current_room).emit("starting");
                        const first_to_play = rooms.get(socket.current_room).players[Math.round(Math.random())];
                        // randomly decides who plays first

                        io.to(socket.current_room).emit("turn",{player : first_to_play , board : Array(9).fill('-'), sign : 'X'})

                },500)

            }
            else {
                room["ready"] = true;
                rooms.set(socket.current_room, room)
                io.to(socket.current_room).emit("roomChange",{ready : socket.username})

            }
        })

        socket.on("changeTurn",(current_player,board,current_sign) => { // checks for winners before switching turn
            let winner = false;
            let player = "";
            let sign = "0";
            const winCombinations = [
                [0, 1, 2],
                [3, 4, 5],
                [6, 7, 8],
                [0, 3, 6],
                [1, 4, 7],
                [2, 5, 8],
                [0, 4, 8],
                [2, 4, 6],
            ];
            const other_player = rooms.get(socket.current_room).players.find(pl => pl !==  current_player)

            for (let i = 0; i < winCombinations.length; i++) { // checks every combination
                    const [a, b, c] = winCombinations[i];
                    if (board[a] === board[b] && board[b] === board[c] && board[a] !== "-") {
                        winner = true;
                        io.to(socket.current_room).emit("gameOver", current_player);
                        pool.query(`INSERT INTO MATCH_HISTORY (PLAYER1, PLAYER2, GAME_RESULT)
                            VALUES ((SELECT ID FROM USERS WHERE USERNAME = $1),
                            (SELECT ID FROM USERS WHERE USERNAME = $2),1)`,[current_player,other_player])
                        break
                    }
                }
                if (board.filter((x) => x === "-").length === 0) { // if no blank cells and no winners -> its a draw
                    io.to(socket.current_room).emit("gameOver", "")
                    pool.query(`INSERT INTO MATCH_HISTORY (PLAYER1, PLAYER2, GAME_RESULT)
                            VALUES ((SELECT ID FROM USERS WHERE USERNAME = $1),
                            (SELECT ID FROM USERS WHERE USERNAME = $2),0)`,[current_player,other_player])

                }
                else if (!winner) {
                     player = rooms.get(socket.current_room).players.find(player => player !== current_player)
                    if (current_sign === 'O') {
                        sign = 'X'
                    }
                    else {
                        sign = "O";
                    }


                }
                io.to(socket.current_room).emit("turn",{player : player, board : board, sign : sign})

        })
        socket.on("offerRematch",(player) => {

            let other_player = rooms.get(socket.current_room).players.find(pl => pl !== player)
            if (other_player) {
                const other_playerID = users.find(user => user.username === other_player).userID
                io.to(other_playerID).emit("rematchOffered",player)
            }


        })

        socket.on("acceptRematch",(player) => {
            let other_player = rooms.get(socket.current_room).players.find(pl => pl !== player)
            if (other_player) {
                const other_playerID = users.find(user => user.username === other_player).userID
                io.to(other_playerID).emit("rematchAnswer","accepted")
            }
        })




    })
}
var express = require('express');
var router = express.Router();
var auth = require('../utils/authorization')
const pool = require("../utils/db");


router.post('/',(req,res) => {


    pool.query(`SELECT U2.USERNAME AS USERNAME1,U3.USERNAME AS USERNAME2 ,PLAYER1,PLAYER2 ,GAME_RESULT FROM USERS AS U
    INNER JOIN MATCH_HISTORY AS MH ON  U.ID = MH.PLAYER1 OR U.ID = MH.PLAYER2
    RIGHT JOIN USERS U2 ON MH.PLAYER1 = U2.ID
    RIGHT JOIN USERS U3 ON MH.PLAYER2 = U3.ID
    WHERE U.USERNAME=$1`,[req.body.username],(err,result) => {
        let game_history;
        if (err) {
            console.info(err)
            return res.sendStatus(400);
        } else {
            game_history = result.rows
            let games_won = 0;
            let games_drawn = 0;
            let games_lost = 0;
            for (let i = 0 ; i < game_history.length; i++) {
                console.info(result.rows[i])
                if (result.rows[i].game_result === 0) {
                    games_drawn++;
                }
                else if (result.rows[i].username1 === req.body.username) {
                    games_won++;
                }
                else games_lost++;
            }
            console.info(games_won)
            console.info(games_drawn)
            console.info(games_lost)

            return res.send([game_history,games_won,games_drawn,games_lost])
        }
    })

})


router.get("/all",(req,res) => {
    pool.query('SELECT ID,USERNAME FROM USERS',(err,result) => {
        let users_results = [];
        if (err) {
            console.info(err)
            return res.sendStatus(400);
        } else {
          const  users = result.rows
            pool.query('SELECT * FROM MATCH_HISTORY',(err,result) => {
                if (err) {
                    console.info(err);
                    return res.sendStatus(400);
                }
                const game_history = result.rows;
                for (let i = 0; i < users.length ; i++) {
                    let games_played = 0;
                    let games_won = 0;
                    let games_drawn = 0;
                    let games_lost = 0;

                    for (let j = 0; j < game_history.length; j++) {
                        if (game_history[j].player1 === users[i].id || game_history[j].player2 === users[i].id ) {
                            games_played++;
                            if (game_history[j].game_result === 0) {
                                games_drawn++;
                            }
                            else if (game_history[j].player1 === users[i].id && game_history[j].game_result === 1) {
                                games_won++;
                            } else games_lost++;
                        }


                    }
                    if (games_played > 0 ) {
                        const win_rate = ((2 * games_won + games_drawn) / (2 * games_played) * 100).toFixed(2)
                        users_results.push({
                            "username": users[i].username, "games_played": games_played, "games_won": games_won,
                            "games_drawn": games_drawn, "games_lost": games_lost, "win_rate": win_rate
                        })
                    }

                }
                users_results.sort((a,b) => ( a.win_rate > b.win_rate ) ? -1 :  ((b.win_rate > a.win_rate) ? 1 : 0))
                return res.send(users_results);
            })
        }

    })
})

module.exports = router;

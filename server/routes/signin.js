var express = require('express');
var router = express.Router();
var pool = require('../utils/db')
var bcrypt = require('bcrypt')
var auth = require('../utils/authorization')
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken')




/* GET home page. */
router.get('/',  function(req, res, next) {
    res.render('index', { title: 'Express' });
});


router.post('/register',[check("email").isEmail().withMessage("Email has to have a valid format"),
    check("password").isLength({min:6,max:24}).withMessage("Password must be at least six characters"),
    check("username").isLength({min:3}).withMessage("Username must have at least 3 characters")],
    async function (req,res,next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
           return res.send(errors)
        }
        const salt = await bcrypt.genSalt(10);

        const hashPw = await bcrypt.hash(req.body.password,salt)
        pool.query(`SELECT * FROM USERS WHERE USERNAME = $1 OR EMAIL = $2`,[req.body.username,req.body.email],(err,result) => {


            if (result.rows.length !== 0) { // username is taken
                return res.send({errors: [{msg: "That username or email already exists."}]})

            }
            else {
                pool.query(`INSERT INTO USERS (USERNAME,PASSWORD,EMAIL) VALUES ($1,$2,$3)`,
                    [req.body.username,hashPw,req.body.email],(err,result) => {
                        if (err) {
                            console.info(err);
                            return res.sendStatus(400)
                        }
                        return res.send({registered : true});
                    })

            }
        })

    });


router.post('/login',[check("password").isLength({min:6,max:24}).withMessage("Password must be at least six characters"),
    check("username").isLength({min:3}).withMessage("Username must have at least 3 characters")],async  function (req,res,next)  {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.send(errors)
    }
    let password = '';
    pool.query(`SELECT PASSWORD FROM USERS WHERE USERNAME = $1`,[req.body.username],(err,result) => {
        if (err) {
            console.info(err)
            return res.sendStatus(400);
        }

        if (result.rows.length === 0) {
            return res.send({errors:[{msg:"That username doesnt exist."}]})
        }
        else {
            password = result.rows[0].password;
            bcrypt.compare(req.body.password, password).then(verified => {
                if (verified) {
                    const user = {
                        username : req.body.username
                    }
                    const accessToken = auth.generateAccessToken(user)
                    const refreshToken = jwt.sign(user,process.env.REFRESH_TOKEN_SECRET)
                    refreshTokens.push(refreshToken);
                    return res.json({accessToken : accessToken,refreshToken : refreshToken})

                } else {
                    return res.send({errors: [{msg: "Incorrect password."}]})
                }
            })


        }
    })


})

router.get('/auth',auth.authenticateToken,(req,res) => {
    return res.sendStatus(200);
})

let refreshTokens = []

router.post('/token',(req,res) => {
    const refreshToken = req.body.token;
    if (refreshToken === null) {return res.sendStatus(401)}
    if (!refreshTokens.includes(refreshToken)) {return res.sendStatus(403)}
    jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET,(err,user) => {
        console.log(err);
        if (err) {return res.sendStatus(403)}
        const accessToken = auth.generateAccessToken({username : user.username})
        return res.json({accessToken : accessToken})
    })
})

router.delete('/logout',(req,res) => {
    refreshTokens = refreshTokens.filter(token => token !== req.body.token)
    res.sendStatus(204)
})





module.exports = router;

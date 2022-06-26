var express = require('express');
var router = express.Router();
var auth = require('../utils/authorization')
/* GET home page. */
router.get('/',auth.authenticateToken ,function(req, res, next) {
  console.info(req.user.username);
  res.render('index', { title: 'Expaaress' });
});

module.exports = router;

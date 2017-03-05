//
// Implementation using HTTP Bearer strategy and jsonwebtoken
//
var express        = require('express'),
    jwt            = require('jsonwebtoken'),
    passport       = require('passport'),
    bodyParser     = require('body-parser'),
    LocalStrategy  = require('passport-local').Strategy,
    BearerStrategy = require('passport-http-bearer').Strategy;

var secret = 'super secret',
    users = [
      {id: 0, username: 'test', password: 'test'}
    ];

passport.use(new LocalStrategy(function(username, password, cb) {
  var user = users.filter(function(u) {
    return u.username === username && u.password === password
  });
  if (user.length === 1) {
    return cb(null, user[0]);
  } else {
    return cb(null, false);
  }
}));

passport.use(new BearerStrategy(function (token, cb) {
  jwt.verify(token, secret, function(err, decoded) {
    if (err) return cb(err);
    var user = users[decoded.id];
    return cb(null, user ? user : false);
  });
}));

var app = express();
app.use(bodyParser.json());
app.use(passport.initialize());

// First login to receive a token
app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ status: 'error', code: 'unauthorized' });
    } else {
      return res.json({ token: jwt.sign({id: user.id}, secret) });
    }
  })(req, res, next);
});

// All routes from this point on need to authenticate with bearer:
// Authorization: Bearer <token here>
app.all('*', function(req, res, next) {
  passport.authenticate('bearer', function(err, user, info) {
    if (err) return next(err);
    if (user) {
      req.user = user;
      return next();
    } else {
      return res.status(401).json({ status: 'error', code: 'unauthorized' });
    }
  })(req, res, next);
});

app.get('/message', function(req, res) {
  return res.json({
    status: 'ok',
    message: 'Congratulations ' + req.user.username + '. You have a token.'
  });
});

// Error handler middleware
app.use(function(err, req, res, next) {
  console.error(err);
  return res.status(500).json({ status: 'error', code: 'unauthorized' });
});

app.listen(3000);

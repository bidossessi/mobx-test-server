//
// Implementation using HTTP Bearer strategy and jsonwebtoken
//
var express        = require('express'),
    cors           = require('cors'),
    jwt            = require('jsonwebtoken'),
    _              = require('lodash'),
    passport       = require('passport'),
    bodyParser     = require('body-parser'),
    LocalStrategy  = require('passport-local').Strategy,
    BearerStrategy = require('passport-http-bearer').Strategy;

var PORT = process.env.PORT || 3001;
var todos = [];
var todoNextId = 1;
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
app.use(cors());
app.use(bodyParser.json());
app.use(passport.initialize());


// First login to receive a token
app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ status: 'error', code: 'unauthorized' });
    } else {
      return res.json({ token: jwt.sign({id: user.id, username: user.username}, secret) });
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

app.get('/', function (req, res) {
  res.send('Todo API Root');
});

app.get('/todos', function (req, res) {
  res.json(todos);
});

app.get('/todos/:id', function (req, res) {
  var todoId = parseInt(req.params.id);
  var matchedTodo = _.find(todos, function(o) { return o.id === todoId; });

  if (matchedTodo) {
    res.json(matchedTodo);
  }

  res.status(404).send();
});

app.post('/todos', function (req, res) {
  var body = _.pick(req.body, 'task', 'completed');

  if (!_.isBoolean(body.completed) || !_.isString(body.task) || body.task.trim().length === 0) {
    return res.status(422).send();
  }

  body.task = body.task.trim();

  body.id = todoNextId++;
  todos.push(body);

  res.json(body);
});

app.put('/todos/:id', function (req, res) {
  var todoId = parseInt(req.params.id);
  var matchedTodo = _.find(todos, function(o) { return o.id === todoId; });

  if (matchedTodo) {
      Object.assign(matchedTodo, req.body)
      res.json(matchedTodo).send();
    }

  res.status(404).send();
});

app.delete('/todos/:id', function (req, res) {
  var todoId = parseInt(req.params.id);
  var matchedTodo = _.find(todos, function(o) { return o.id === todoId; });

  if (matchedTodo) {
    todos.splice(todos.indexOf(matchedTodo), 1)
    res.status(202).send();
  }

  res.status(404).send();
});


// Error handler middleware
app.use(function(err, req, res, next) {
  console.error(err);
  return res.status(500).json({ status: 'error', code: 'server error' });
});

app.listen(PORT, function () {
  console.log('Express listening on port ' + PORT);
});

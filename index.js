const express = require('express')
const exphbs = require('express-handlebars')
const session = require('express-session')
const passport = require('passport')
const FacebookStrategy = require('passport-facebook').Strategy
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')
const mongoose = require('mongoose')
const Usuario = require('./models/usuario.model')

const ProductoServicio = require('./services/producto.service')
const UsuarioServicio = require('./services/usuario.service')

const app = express()
let productoServicio = new ProductoServicio()
const usuarioServicio = new UsuarioServicio()

app.use(session({
  secret: 'clavesecreta',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/ecommerce'}),
  cookie: {
    maxAge: 600000
  }
}))

app.use(passport.initialize());
app.use(passport.session());

app.engine('.hbs', exphbs({extname: '.hbs', defaultLayout: 'main.hbs'}))
app.set('view engine', '.hbs')

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(express.static('public'))


checkIsAuthenticated = (req, res, next) => {
  if(req.isAuthenticated()) {
    next()
  } else {
    res.render('login')
  }
}



passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser((id, done) => {
  Usuario.findById(id, function (err, user) {
    done(err, user);
  });
});



passport.use('facebook', new FacebookStrategy({
  clientID: '471231287445799', 
  clientSecret: 'c02e57ca527cdafee74bd96f931e65ea', 
  callbackURL: `http://localhost:3232/auth/facebook/callback`, 
  profileFields: ['id', 'displayName', 'email', 'picture'] },
  async ( accessToken, refreshToken, profile, cb) => { 
    try {
      let usuarioDB = await usuarioServicio.getUserByIdFacebook( profile.id )
      if(usuarioDB) {
        return cb(null, usuarioDB)
      } else {
        let newUser = await usuarioServicio.add( profile )
        return cb(null, newUser)
      }
    } catch ( err ) { console.log(err); return cb(err)}
  })
)


app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }))

app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login'}), (req, res) => {
  req.session.facebookId = req.user.facebookId
  res.redirect(`/perfil`)
})

app.get('/', (req, res) => {  
  if(req.session.usuario) {
    res.redirect(`/perfil`)
  } else {
    res.redirect('/login')
  }
})

app.get('/perfil', checkIsAuthenticated, async  (req, res) => {
  let perfil = await usuarioServicio.getUserByIdFacebook(req.session.facebookId)
  console.log(perfil)
  res.render('perfil', { perfil } )     
})

app.get('/login', (req, res) => {
  let usuarioExistente = JSON.parse(req.query.ue || false)
  let passwordIncorrecto = JSON.parse(req.query.pi || false)
  res.render('login', { usuarioExistente, passwordIncorrecto } )
})


app.get('/salir', (req, res) => {
  req.session.destroy( () => {
    res.redirect('/')
  })
})



app.listen(3232, () => {
  console.log('Escuchando el puerto 3232')
  mongoose.connect('mongodb://localhost:27017/ecommerce', {useNewUrlParser: true, useUnifiedTopology: true}, (err) => {
  if(err) console.log(err);
  
  console.log('Base de datos ONLINE');
});
})
app.on('error', (err) => { console.log(`Error de conexion: ${err}`)})
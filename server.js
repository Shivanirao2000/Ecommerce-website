// if (process.env.NODE_ENV !== 'production') {
//   require('dotenv').config()
// }
require('dotenv').config()

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripePublicKey = process.env.STRIPE_PUBLIC_KEY
// const stripeSecretKey = sk_test_oKCaLNqTDAS3tkcE8cC0jPDy00FlPcvZqd
// const stripePublicKey = pk_test_ZN01sAFhqxyOLZPxxVPbNuwf00KzG1X6yq
const express = require('express')
const app = express()
const fs = require('fs')
const stripe = require('stripe')(stripeSecretKey)
var bodyParser=require("body-parser");
var mongoose=require("mongoose");
var passport=require("passport");
var LocalStrategy=require("passport-local");
var passportLocalMongoose=require("passport-local-mongoose");
var methodOverride=require("method-override");
var User=require("./models/user");
var flash=require("connect-flash");
app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.static('public'))

mongoose.set('useUnifiedTopology', true);
// mongoose.connect(process.env.DATABASEURL, {
	mongoose.connect("mongodb+srv://shivani:shop@cluster0-gu0wf.mongodb.net/test?retryWrites=true&w=majority" , {
					
			useUnifiedTopology: true,
			useNewUrlParser: true,
			useCreateIndex: true
		}).then(()=>{
			console.log("Connected to db");
		}).catch(err=>{
			console.log("error:", err.message);
		});
app.use(bodyParser.urlencoded({extended:true}));
app.use(flash());
app.set("view engine", "ejs");
app.use(express.static(__dirname+"/public"));
app.use(methodOverride("_method"));
		
app.use(require("express-session")({
	secret: "shivani",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
	res.locals.currentUser=req.user;
	res.locals.error=req.flash("error");
	res.locals.success=req.flash("success");
	next();
});


app.get("/", function(req,res){
	res.render("landing.ejs")
});

app.get('/store', isLoggedIn, function(req, res) {
  fs.readFile('items.json', function(error, data) {
    if (error) {
      res.status(500).end()
    } else {
      res.render('store.ejs', {
        stripePublicKey: stripePublicKey,
        items: JSON.parse(data)
      })
    }
  })
})


app.get("/register", function(req,res){
	res.render("register.ejs");
});

app.post("/register", function(req,res){
	User.register(new User({username: req.body.username}), req.body.password, function(err, user){
		if(err){
			req.flash("error", err.message)
			return res.redirect("/register");
		}
		passport.authenticate("local")(req, res, function(){
			req.flash("success", "Welcome to Minx Clothing "+ user.username)
			res.redirect("/store");
		});
	});
});

app.get("/login", function(req,res){
	res.render("login.ejs");
});

app.post("/login", passport.authenticate("local",{
	successRedirect: "/store",
	failureRedirect: "/login"
}), function(req,res){
});

app.get("/logout", function(req,res){
	req.logout();
	req.flash("success", "Logged out")
	res.redirect("/");
});

app.post('/purchase', function(req, res) {
  fs.readFile('items.json', function(error, data) {
    if (error) {
      res.status(500).end()
    } else {
      const itemsJson = JSON.parse(data)
      const itemsArray = itemsJson.clothing.concat(itemsJson.footwear).concat(itemsJson.accessories)
      let total = 0
      req.body.items.forEach(function(item) {
        const itemJson = itemsArray.find(function(i) {
          return i.id == item.id
        })
        total = total + itemJson.price * item.quantity
      })

      stripe.charges.create({
        amount: total,
        source: req.body.stripeTokenId,
        currency: 'inr'
      }).then(function() {
        console.log('Charge Successful')
        res.json({ message: 'Successfully purchased items' })
      }).catch(function(error) {
        console.log('Charge Fail')
        console.log(error)
        res.status(500).end()
      })
    }
  })
})

function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		 return next();
  }
  req.flash("error", "Please login first!");
	res.redirect("/login");
}

app.listen(process.env.PORT || 3000,  () => {
  console.log("The server is live");
})
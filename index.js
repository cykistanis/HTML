const express = require('express');
const hbs = require('hbs');
const wax = require('wax-on');
const landingRoutes = require('./routes/landing');
const productRoutes = require('./routes/products');
const cloudinaryRoutes = require('./routes/cloudinary');
const userRoutes = require('./routes/users');
const shoppingCartRoutes = require('./routes/shoppingCart');
const session = require('express-session');
const flash = require('connect-flash');
const csrf = require('csurf')
const FileStore = require('session-file-store')(session);
require('dotenv').config();


let app = express();

app.set('view engine', 'hbs');

app.use(express.static('public'));

wax.on(hbs.handlebars);
wax.setLayoutPath("./views/layouts");

app.use(
    express.urlencoded({
        extended: false
    })
);








async function main() {

    app.use(({
        secret: process.env.SESSION_SECRET_KEY,
        store: new FileStore(),
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: true
    }))

    app.use(flash())
    app.use(csrf());

    app.use(function (err, req, res, next) {
        if (err && err.code == "EBADCSRFTOKEN") {
            req.flash('error_messages', 'The form has expired. Please try again');
            res.redirect('back');
        } else {
            next();
        }
    });


    app.use(function(req,res,next){
        res.locals.csrfToken = req.csrfToken();
        next();
    })
    
    

    //Register flash middleware
    app.use(function (req, res, next) {
        res.locals.success_messages = req.flash("success_messages");
        res.locals.error_messages = req.flash("error_messages");
        // res.locals.csrfToken = req.csrfToken();
        next();
    });

    app.use('/', landingRoutes);
    app.use('/products', productRoutes);
    app.use('/users', userRoutes);
    app.use('/cloudinary', cloudinaryRoutes);
    app.use('/shoppingCart', shoppingCartRoutes);

    // Share the user data with hbs files
    app.use(function (req, res, next) {
        res.locals.user = req.session.user;
        next();
    })
}
main();


app.listen(3000, () => {
    console.log("server has started")
});
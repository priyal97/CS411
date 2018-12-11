const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express()
const passport = require('passport'); // For google auth
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;  
var config = require('./config');
var googleProfile = {};
//Google calendar API
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

//Database configuration
const mongoose = require('mongoose');

let dev_db_url = 'Your MongoDB url on Mlabs';
let mongoDB = process.env.MONGODB_URI || dev_db_url;
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
//const auth = require('./auth');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');


/*new passport authorization code*/
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new GoogleStrategy({
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: config.CALLBACK_URL
},
function(accessToken, refreshToken, profile, cb) {
    googleProfile = {
        id: profile.id,
        displayName: profile.displayName
    };
    cb(null, profile);
    }
));

app.use(passport.initialize());
app.use(passport.session());
//auth(passport);
//app.use(passport.initialize());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')
/*
app.use(cookieSession({
    name: 'session',
    keys: ['123']
}));*/
app.use(cookieParser());

/*Weather API*/
const apiKey = '*******************************';// apikey for weather api
app.get('/weather', function (req, res) {
//  console.log(googleProfile["displayName"]);
  res.render('index', {weather: null, error: null, user:googleProfile["displayName"] });
})

User=require("./models/user.js")
app.post('/weather', function (req, res) {
  //Caching mechanism 
  //Checking if the weather information is already in the database 
  User.findOne({city: req.body.city}, function (err, user) {
        if (err) return next(err);
        else if (user==null){ 
            let city = req.body.city;
            let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=imperial&appid=${apiKey}`

          request(url, function (err, response, body) {
            if(err){
              res.render('index', {weather: null, error: 'Error, please try again'});
            } else {
              let weather = JSON.parse(body)
              if(weather.main == undefined){
                res.render('index', {weather: null, error: 'Error, please try again', user:googleProfile["displayName"] });
              } else {
                let weatherText = `It's ${weather.main.temp} degrees in ${weather.name}!`;
                //adding the user information to the database
                  let user1 = new User(
                      {
                          name: JSON.stringify(googleProfile),
                          city: req.body.city,
                          weather: weatherText
                      }
                  );
                  user1.save(function (err) {
                      if (err) {
                          return next(err);
                      }
                  })
                res.render('index', {weather: weatherText, error: null, user:googleProfile["displayName"] });
              }
            }
          });
        }
        else{
          weatherText=user["weather"];
          res.render('index', {weather: weatherText, error: null, user:googleProfile["displayName"] });
        }
    })
})

/*News API*/
const NewsAPI = require('newsapi');
const newsapi = new NewsAPI('*************************');
// To query /v2/top-headlines
// All options passed to topHeadlines are optional, but you need to include at least one of them
app.post('/news', function (req, res) {
  
  let url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=*************************`
  let allResults = [];
  request(url, function (err, response, body) {
    if(err){
      res.render('index', {news: null, error: 'Error, please try again'});
    } else {
      let news = JSON.parse(body)
      let art = news.articles;
//      allResults.push(news);
 //     console.log(allResults[0]);
        res.render('news', {data: art});
      }
  });
});

/*Google calendar API*/
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Calendar API.
  authorize(JSON.parse(content), listEvents);
});
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);
// Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}
/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
  const calendar = google.calendar({version: 'v3', auth});
  calendar.events.list({
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const events = res.data.items;
    if (events.length) {
      console.log('Upcoming 10 events:');
      events.map((event, i) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`${start} - ${event.summary}`);
      });
    } else {
      console.log('No upcoming events found.');
    }
  });
}




//app routes
app.get('/', function(req,res) {
    res.render('signin.ejs', {  user: req.user });
});

/*
app.get('/logged', function(req,res) {
    res.render('logged.ejs', { user: JSON.stringify(googleProfile)});
});*/

//PASSPORT routes
app.get('/auth/google',
    passport.authenticate('google', {
        scope: ['profile', 'email']
}));

app.get('/auth/google/callback',
    passport.authenticate('google', {
        successRedirect: '/weather',
        failureRedirect: '/'
}));

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const methodOverride = require("method-override");
const path = require("path");

const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");

// Helper functions
const {
  addHttp,
  generateRandomString,
  isExistingUser,
  authenticateUser,
  urlsForUser,
  userOwnsURL
} = require("./helpers");

const bcrypt = require("bcrypt");
const app = express();
const PORT = 8080; // default port 8080

// Databases in memory --> will be stored in a real database later!
const urlDatabase = {
  "b2xVn2": {
    userID: "aUA4CE",
    longURL: "http://www.lighthouselabs.ca"
  },
  "sgq3y6": {
    userID: "aUA4CE",
    longURL: "http://www.reddit.com"
  },
  "9sm5xK": {
    userID: "ccLPCa",
    longURL: "http://www.google.com"
  }
};
const users = {
  "aUA4CE": {
    id: "aUA4CE",
    email: "user1@example.com",
    password: "$2b$10$Ohnf9u6HTv13.FnN5DPDs.xetN927Id./C90YXXOgREKq/hIQesiq"
  },
  ccLPCa: {
    id: "ccLPCa",
    email: "user2@example.com",
    password: "$2b$10$yI6TVKpNSgqGK3eaAPZDu.2YIewoUuFs82bYLiYwfCUuam6cLZIHy"
  }
};

// Set the view engine to EJS
app.set("view engine", "ejs");

// MIDDLEWARE //////////////////////////////////////

// Convert the request body from a Buffer into a readable string (req.body)
app.use(bodyParser.urlencoded({extended: true}));
// Parse cookies
app.use(cookieSession({
  name: "session",
  keys: ["userID"],
  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));
// Override POST requests with PUT/DELETE
app.use(methodOverride("_method"));
// Serve public directory
app.use(express.static(path.join(__dirname, 'public')));
// Session and flash configuration
const sessionConfig = {
  name: 'session',
  secret: "secret",
  resave: false,
  saveUninitialized: true,
  cookie: {
      httpOnly: true,
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // + 7 days in milliseconds
      maxAge: 1000 * 60 * 60 * 24 * 7
  }
}
app.use(session(sessionConfig));
app.use(flash());


// ENDPOINTS & ROUTES //////////////////////////////

// Log the user in
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  // Retrieve the account that matches the credentials if one exists
  const userData = authenticateUser(email, password, users);
  if (userData) {
    // Set a cookie and redirect to /urls
    req.session.userID = userData.id;
    // Flash successful login message
    req.flash("success", "Login successful. Welcome back!");
    res.redirect("/urls");
  } else {
    // If the email/password is invalid, flash an error
    req.flash("danger", "The email/password you entered is invalid.");
    res.redirect("/login")
  }
});

// Log the user out
app.post("/logout", (req, res) => {
  req.session.userID = null;
  req.flash("success", "You've successfully logged out.");
  res.redirect("/");
});

// Form to login to an existing account
app.get("/login", (req, res) => {
  const alerts = req.flash();
  const cookieUserID = req.session.userID;
  const userData = users[cookieUserID];
  // If the user is already logged in, flash a warning and redirect to /urls
  if (userData) {
    req.flash("warning", "You are already logged in");
    res.redirect("/urls");
  } else {
    const templateVars = { userData: userData, alerts };
    res.render("login", templateVars);
  }
});

// Form to register a new account
app.get("/register", (req, res) => {
  const alerts = req.flash();
  const cookieUserID = req.session.userID;
  const userData = users[cookieUserID];
  // If the user is already logged in, redirect to /urls
  if (userData) {
    res.redirect("/urls");
  } else {
    const templateVars = { userData: userData, alerts };
    res.render("register", templateVars);
  }
});

// Create a new account, log the user in, then redirect to home page
app.post("/register", (req, res) => {
  // Retrieve email and password from request body
  const email = req.body.email;
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(password, 10);
  // If an email/password is not provided or the email already exists, flash an error
  if (!email || !password || isExistingUser(email, users)) {
    req.flash("danger", "E-mail is already in use.");
    res.redirect("/register");
  } else {
    // Add data to the database
    const id = generateRandomString(6);
    users[id] = { id, email, password: hashedPassword };
    // Set cookie with new user info and redirect to /urls
    req.session.userID = id;
    res.redirect("/urls");
  }
});

// Redirect valid /u/shortURL requests to its longURL
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

// Form to create a new URL
app.get("/urls/new", (req, res) => {
  const alerts = req.flash();
  const cookieUserID = req.session.userID;
  const userData = users[cookieUserID];
  if (!userData) {
    // If the user is not logged in, flash an error and redirect to login page
    req.flash("warning", "You must be logged in to do that!");
    res.redirect("/login");
  } else {
    const templateVars = { userData: userData, alerts };
    res.render("urls_new", templateVars);
  }
});

// Create a new URL
app.post("/urls", (req, res) => {
  // Add "http://" to the URL if it doesn"t already have it
  const longURL = addHttp(req.body.longURL);
  // Generate a unique shortURL to be added to the database
  let shortURL = generateRandomString(6);
  while (shortURL in urlDatabase) {
    shortURL = generateRandomString(6);
  }
  // Retrieve the user"s ID
  const cookieUserID = req.session.userID;
  const newURL = {
    userID: cookieUserID,
    longURL: longURL
  };
  urlDatabase[shortURL] = newURL;
  // Redirect to the newly created URL"s show page
  res.redirect(`/urls/${shortURL}`);
});

// Delete a URL
app.delete("/urls/:shortURL/delete", (req, res) => {
  const shortURL = req.params.shortURL;
  // Check that the user is logged in and owns the short URL before deleting
  const cookieUserID = req.session.userID;
  const userData = users[cookieUserID];
  if (userData) {
    if (userOwnsURL(cookieUserID, shortURL, urlDatabase)) {
      delete urlDatabase[shortURL];
    } else {
      // If the user doesn't own the URL, flash an error and redirect to home page
      req.flash("danger", "You don't have permission to do that!");
      res.redirect("/");
    }
  } else {
      // If the user is not logged in, flash an error and redirect to login page
      req.flash("warning", "You must be logged in to do that!");
      res.redirect("/login");
  }
  res.redirect("/urls");
});

// Updates a URL
app.put("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  // Check if the user is logged in
  const cookieUserID = req.session.userID;
  const userData = users[cookieUserID];
  if (userData) {
    // Check if the user owns the URL
    if (userOwnsURL(cookieUserID, shortURL, urlDatabase)) {
      // Add "http://" to the new URL if it doesn"t already have it
      const newURL = addHttp(req.body.newURL);
      // Update entry in database
      urlDatabase[shortURL].longURL = newURL;
      // Redirect to index page
      res.redirect(`/urls`);
    } else {
      // If the user doesn't own the URL, flash an error and redirect to home page
      req.flash("danger", "You don't have permission to do that!");
      res.redirect("/");
    }
  } else {
    // If the user is not logged in, flash an error and redirect to login page
    req.flash("warning", "You must be logged in to do that!");
    res.redirect("/login");
  }
});

// Display a URL from the database
app.get("/urls/:shortURL", (req, res) => {
  const alerts = req.flash();
  const cookieUserID = req.session.userID;
  const userData = users[cookieUserID];
  const targetURL = req.params.shortURL;
  // Check if the URL is in the database
  const longURL = urlDatabase[targetURL] ? urlDatabase[targetURL].longURL : false;
  // If the URL does not exist, flash an error and redirect to home page
  if (!longURL) {
    req.flash("danger", "That page doesn't exist!"); // --> Convert to 404 error page, couldn't find what you were looking for
    res.redirect("/");
  } else {
    // If the user is logged in and owns the URL, display the page
    if (userData) {
      if (urlDatabase[targetURL].userID === userData.id) {
      const templateVars = { userData: userData, shortURL: targetURL, longURL: urlDatabase[targetURL].longURL, alerts };
      res.render("urls_show", templateVars);
      } else {
      // If the user doesn't own the URL, flash an error and redirect to home page
      req.flash("danger", "You don't have permission to do that!");
      res.redirect("/");
      }
    } else {
      // If the user is not logged in, flash an error and redirect to login page
      req.flash("warning", "You must be logged in to do that!");
      res.redirect("/login");
    }
  }
});

// Display all URLs in the database
app.get("/urls", (req, res) => {
  const alerts = req.flash();
  const cookieUserID = req.session.userID;
  const userData = users[cookieUserID];
  // If a user is logged in, retrieve their URLs
  let userDB = {};
  if (userData) {
    userDB = urlsForUser(userData.id, urlDatabase);
    const templateVars = { userData: userData, urlDB: userDB, alerts };
    res.render("urls_index", templateVars);
  } else {
    // If the user is not logged in, flash an error and redirect to login page
    req.flash("warning", "You must be logged in to do that!");
    res.redirect("/login");
  }
});

// Home page
app.get("/", (req, res) => {
  const alerts = req.flash();
  console.log(alerts);
  const cookieUserID = req.session.userID;
  const userData = users[cookieUserID];
  const templateVars = { userData, alerts };
  res.render("home", templateVars);
});

////////////////////////////////////////////////////

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
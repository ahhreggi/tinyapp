const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const methodOverride = require("method-override");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");

const bcrypt = require("bcrypt");
const app = express();
const PORT = 8080; // default port 8080

const {
  addHttp,
  generateRandomString,
  isExistingUser,
  authenticateUser,
  urlsForUser,
  userOwnsURL
} = require("./helpers");

// IN-MEMORY DATABASES /////////////////////////////

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

// CONFIGURATIONS & MIDDLEWARE /////////////////////


app.set("view engine", "ejs"); // set the view engine to EJS
app.use(bodyParser.urlencoded({extended: true})); // parse req body
app.use(cookieSession({ // configure cookies
  name: "session",
  keys: ["userID"],
  maxAge: 24 * 60 * 60 * 1000
}));
app.use(methodOverride("_method")); //override POST requests with PUT/DELETE
app.use(express.static(path.join(__dirname, 'public'))); // serve public directory

// Session and flash configuration
const sessionConfig = {
  name: 'session',
  secret: "secret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
};
app.use(session(sessionConfig));
app.use(flash());

// Store flash messages, user data, and current path into local variables on every request
app.use((req, res, next) => {
  const cookieUserID = req.session.userID;
  res.locals.vars = {
    alerts: req.flash(),
    userData: users[cookieUserID],
    currentPage: req.originalUrl
  };
  next();
});

// ENDPOINTS & ROUTES //////////////////////////////

// Log the user in
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  // Retrieve the user account that matches the given credentials (false if none)
  const validUserData = authenticateUser(email, password, users);
  // If a user is found, set a cookie, flash success and redirect
  if (validUserData) {
    req.session.userID = validUserData.id;
    req.flash("success", "Login successful. Welcome back!");
    res.redirect("/urls");
    // Otherwise, flash error
  } else {
    req.flash("danger", "The email/password you entered is invalid.");
    res.redirect("/login");
  }
});

// Log the user out
app.post("/logout", (req, res) => {
  // Destroy session and flash success if user was previously logged in
  if (req.session.userID) {
    req.session.userID = null;
    req.flash("success", "You've successfully logged out.");
  }
  res.redirect("/");
});

// Form to login to an existing account
app.get("/login", (req, res) => {
  const { alerts, userData, currentPage } = res.locals.vars;
  // If the user is already logged in, flash a warning and redirect
  if (userData) {
    req.flash("warning", "You are already logged in");
    res.redirect("/urls");
  } else {
    // Otherwise, display login form
    const templateVars = { alerts, userData, currentPage };
    res.render("login", templateVars);
  }
});

// Form to register a new account
app.get("/register", (req, res) => {
  const { alerts, userData, currentPage } = res.locals.vars;
  // If the user is already logged in, flash a warning and redirect
  if (userData) {
    req.flash("warning", "You are already logged in");
    res.redirect("/urls");
  } else {
    // Otherwise, display registration form
    const templateVars = { alerts, userData, currentPage };
    res.render("register", templateVars);
  }
});

// Create a new account, log the user in, then redirect to home page
app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(password, 10);
  // If an email/password is not provided or the email already exists, flash an error
  if (!email || !password || isExistingUser(email, users)) {
    req.flash("danger", "E-mail is already in use.");
    res.redirect("/register");
  } else {
    // Otherwise, add the new user data to the database
    const id = generateRandomString(6);
    users[id] = { id, email, password: hashedPassword };
    // Set cookie with new user info, flash success and redirect
    req.session.userID = id;
    req.flash("success", "Registration successful. Welcome to tinyapp!");
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
  const { alerts, userData, currentPage } = res.locals.vars;
  // If the user is not logged in, flash an error and redirect
  if (!userData) {
    req.flash("warning", "You must be logged in to do that!");
    res.redirect("/login");
  } else {
    const templateVars = { alerts, userData, currentPage };
    res.render("urls_new", templateVars);
  }
});

// Create a new URL
app.post("/urls", (req, res) => {
  // Add "http://" to the URL if it doesn't already have it
  const longURL = addHttp(req.body.longURL);
  // Generate a unique shortURL to be added to the database
  let shortURL = generateRandomString(6);
  while (shortURL in urlDatabase) {
    shortURL = generateRandomString(6);
  }
  // Retrieve the user's ID and add the new URL to the database with it
  const cookieUserID = req.session.userID;
  const newURL = {
    userID: cookieUserID,
    longURL: longURL
  };
  urlDatabase[shortURL] = newURL;
  // Redirect to the newly created URL's show page
  res.redirect(`/urls/${shortURL}`);
});

// Delete a URL
app.delete("/urls/:shortURL/delete", (req, res) => {
  const { userData } = res.locals.vars;
  const shortURL = req.params.shortURL;
  // If the user is logged in and owns the URL, delete it from the database
  if (userData) {
    if (userOwnsURL(userData.id, shortURL, urlDatabase)) {
      delete urlDatabase[shortURL];
      // Otherwise, flash an error and redirect to home page
    } else {
      req.flash("danger", "You don't have permission to do that!");
      res.redirect("/");
    }
    // If the user is not logged in, flash an error and redirect
  } else {
    req.flash("warning", "You must be logged in to do that!");
    res.redirect("/login");
  }
  res.redirect("/urls");
});

// Updates a URL
app.put("/urls/:shortURL", (req, res) => {
  const { userData } = res.locals.vars;
  const shortURL = req.params.shortURL;
  // If the user is logged in and owns the URL, update the info in the database
  if (userData) {
    if (userOwnsURL(userData.id, shortURL, urlDatabase)) {
      const newURL = addHttp(req.body.newURL);
      urlDatabase[shortURL].longURL = newURL;
      res.redirect(`/urls`);
      // Otherwise, flash an error and redirect
    } else {
      req.flash("danger", "You don't have permission to do that!");
      res.redirect("/");
    }
  } else {
    // If the user is not logged in, flash an error and redirect
    req.flash("warning", "You must be logged in to do that!");
    res.redirect("/login");
  }
});

// Display a URL from the database
app.get("/urls/:shortURL", (req, res) => {
  const { alerts, userData, currentPage } = res.locals.vars;
  const targetURL = req.params.shortURL;
  // Retrieve the longURL from the database if it exists
  const longURL = urlDatabase[targetURL] ? urlDatabase[targetURL].longURL : false;
  // If the URL does not exist, flash an error and redirect
  if (!longURL) {
    req.flash("danger", "That page doesn't exist!"); // --> Convert to 404 error page? ("We couldn't find what you were looking for!")
    res.redirect("/");
  } else {
    // If the user is logged in and owns the URL, display the page
    if (userData) {
      if (urlDatabase[targetURL].userID === userData.id) {
        const templateVars = { alerts, userData, currentPage, shortURL: targetURL, longURL: urlDatabase[targetURL].longURL };
        res.render("urls_show", templateVars);
      } else {
      // Otherwise, flash an error and redirect to home page
        req.flash("danger", "You don't have permission to do that!");
        res.redirect("/");
      }
    } else {
      // If the user is not logged in, flash an error and redirect
      req.flash("warning", "You must be logged in to do that!");
      res.redirect("/login");
    }
  }
});

// Display all URLs in the database
app.get("/urls", (req, res) => {
  const { alerts, userData, currentPage } = res.locals.vars;
  // If a user is logged in, retrieve their URLs from the database
  let userDB = {};
  if (userData) {
    userDB = urlsForUser(userData.id, urlDatabase);
    const templateVars = { alerts, userData, currentPage, urlDB: userDB };
    res.render("urls_index", templateVars);
    // Otherwise, flash an error and redirect to login page
  } else {
    req.flash("warning", "You must be logged in to do that!");
    res.redirect("/login");
  }
});

// Home page
app.get("/", (req, res) => {
  const { alerts, userData, currentPage } = res.locals.vars;
  const templateVars = { alerts, userData, currentPage };
  res.render("home", templateVars);
});

////////////////////////////////////////////////////

app.listen(PORT, () => {
  console.log(`tinyapp listening on port ${PORT}.`);
});
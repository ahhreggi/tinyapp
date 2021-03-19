const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const methodOverride = require("method-override");
const flash = require("connect-flash");
const dayjs = require("dayjs");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
const PORT = 8080;

const {
  addHttp,
  generateRandomString,
  isExistingUser,
  authenticateUser,
  urlsForUser,
  userOwnsURL,
  validateURL,
  getVisits
} = require("./helpers");

// IN-MEMORY DATABASES /////////////////////////////

const urlDatabase = require("./data/urlDatabase");
const userDatabase = require("./data/userDatabase");

// MIDDLEWARE & CONFIGURATIONS /////////////////////

app.set("view engine", "ejs"); // set the view engine to EJS
app.use(bodyParser.urlencoded({extended: true})); // parse req body
app.use(cookieSession({ // configure cookies
  name: "session",
  keys: ["userID", "visitorID"],
  maxAge: 24 * 60 * 60 * 1000
}));
app.use(methodOverride("_method")); // override POST requests
app.use(express.static(path.join(__dirname, "public"))); // serve public directory
app.use(flash()); // enable storage of flash messages

// Initialize local variables on every request
app.use((req, res, next) => {
  if (!req.session.visitorID) {
    req.session.visitorID = generateRandomString(8);
  }
  const visitorID = req.session.visitorID;
  const cookieUserID = req.session.userID;
  const currentDateTime = dayjs().format("YYYY-MM-DD HH:mm:ss");
  res.locals.vars = {
    alerts: req.flash(),
    visitorID,
    userData: userDatabase[cookieUserID],
    currentPage: req.originalUrl,
    currentDateTime
  };
  next();
});

// ENDPOINTS & ROUTES //////////////////////////////

// Log the user in
app.post("/login", (req, res) => {
  const login = req.body.email;
  const password = req.body.password;
  let validUserData = authenticateUser(login, password, userDatabase);
  // ERROR: Incomplete form
  if (!login || !password) {
    req.flash("danger", "Please complete all fields.");
    // ERROR: Credentials are invalid
  } else if (!validUserData) {
    req.flash("danger", "The username/email or password you entered is invalid.");
    res.redirect("/login");

    // SUCCESS: Credentials are valid
  } else {
    req.session.userID = validUserData.id;
    req.flash("success", `Login successful. Welcome back, ${validUserData.username}!`);
    res.redirect("/");
  }
});

// Log the user out
app.post("/logout", (req, res) => {
  // SUCCESS: User is logged in
  if (req.session.userID) {
    req.session.userID = null;
    req.flash("success", "You've successfully logged out.");
  }
  res.redirect("/");
});

// Form to login to an existing account
app.get("/login", (req, res) => {
  const { alerts, userData, currentPage } = res.locals.vars;
  // ERROR: User is already logged in
  if (userData) {
    req.flash("warning", "You are already logged in.");
    res.redirect("/urls");
  } else {
    // SUCCESS: User is not logged in
    const templateVars = { alerts, userData, currentPage };
    res.render("login", templateVars);
  }
});

// Form to register a new account
app.get("/register", (req, res) => {
  const { alerts, userData, currentPage } = res.locals.vars;
  // ERROR User is already logged in
  if (userData) {
    req.flash("warning", "You are already logged in.");
    res.redirect("/urls");
  } else {
    // SUCCESS: User is not logged in
    const templateVars = { alerts, userData, currentPage };
    res.render("register", templateVars);
  }
});

// Create a new account and log the user in
app.post("/register", (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const existingData = isExistingUser(username, email, userDatabase);
  // ERROR: Incomplete form or existing credentials
  if (!username || !email || !password) {
    req.flash("danger", "Please complete all fields.");
    res.redirect("/register");
  } else if (existingData) {
    req.flash("danger", `The ${existingData} you entered is already in use.`);
    res.redirect("/register");
    // SUCCESS: Complete form and nonexistent credentials
  } else {
    const id = generateRandomString(6);
    const hashedPassword = bcrypt.hashSync(password, 10);
    userDatabase[id] = { id, username, email, password: hashedPassword };
    req.session.userID = id;
    req.flash("success", "Registration successful. Welcome to tinyapp!");
    res.redirect("/");
    return;
  }
});

// Redirect valid /u/shortURL requests to its longURL
app.get("/u/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  const urlData = urlDatabase[shortURL];
  // ERROR: URL does not exist
  if (!urlData) {
    res.redirect("/404");
    // SUCCESS: URL exists
  } else {
    const { currentDateTime, visitorID } = res.locals.vars;
    const newVisitor = {
      timestamp: currentDateTime,
      visitorID
    };
    urlDatabase[shortURL].visitorLog.push(newVisitor);
    res.redirect(urlData.longURL);
  }
});

// Form to create a new URL
app.get("/urls/new", (req, res) => {
  const { alerts, userData, currentPage } = res.locals.vars;
  // ERROR: User is not logged in
  if (!userData) {
    req.flash("warning", "You must be logged in to do that!");
    res.redirect("/login");
    // SUCCESS: User is logged in
  } else {
    const templateVars = { alerts, userData, currentPage };
    res.render("urls_new", templateVars);
  }
});

// Create a new URL
app.post("/urls", (req, res) => {
  const { currentDateTime } = res.locals.vars;
  const url = req.body.longURL;
  const longURL = url ? addHttp(url) : "";
  // ERROR: URL is possibly invalid
  if (!validateURL(longURL)) {
    req.flash("danger", "Please enter a valid URL.");
    res.redirect("/urls/new");
    // SUCCESS: URL is possibly valid
  } else {
    // Ensure that a unique shortURL is added to the database
    let shortURL = generateRandomString(6);
    while (shortURL in urlDatabase) {
      shortURL = generateRandomString(6);
    }
    const cookieUserID = req.session.userID;
    const newURL = {
      userID: cookieUserID,
      longURL: longURL,
      created: currentDateTime,
      lastModified: null,
      visitorLog: []
    };
    urlDatabase[shortURL] = newURL;
    req.flash("success", "Link created successfully!");
    res.redirect(`/urls/${shortURL}`);
  }
});

// Delete an existing URL
app.delete("/urls/:shortURL/delete", (req, res) => {
  const { userData } = res.locals.vars;
  const shortURL = req.params.shortURL;
  // ERROR: User is not logged in
  if (!userData) {
    req.flash("warning", "You must be logged in to do that!");
    res.redirect("/login");
  } else {
    // ERROR: User is logged in but does not own the URL
    if (!userOwnsURL(userData.id, shortURL, urlDatabase)) {
      req.flash("danger", "You don't have permission to do that!");
      res.redirect("/");
      // SUCCESS: User is logged in and owns the URL
    } else {
      delete urlDatabase[shortURL];
      res.redirect("/urls");
    }
  }
});

// Update an existing URL
app.put("/urls/:shortURL", (req, res) => {
  const { userData, currentDateTime } = res.locals.vars;
  const shortURL = req.params.shortURL;
  // ERROR: User is not logged in
  if (!userData) {
    req.flash("warning", "You must be logged in to do that!");
    res.redirect("/login");
  } else {
    // ERROR: User is logged in but does not own the URL
    if (!userOwnsURL(userData.id, shortURL, urlDatabase)) {
      req.flash("danger", "You don't have permission to do that!");
      res.redirect("/");
      // SUCCESS: User is logged in and owns the URL
    } else {
      const newURL = addHttp(req.body.newURL);
      // ERROR: URL is possibly invalid
      if (!validateURL(newURL)) {
        req.flash("danger", "Please enter a valid URL.");
        res.redirect(`/urls/${shortURL}`);
      } else {
        // SUCCESS: URL is possibly valid and different from the original
        if (urlDatabase[shortURL].longURL !== newURL) {
          urlDatabase[shortURL].longURL = newURL;
          urlDatabase[shortURL].lastModified = currentDateTime;
          req.flash("success", "Link updated successfully!");
        }
        res.redirect("/urls/");
      }
    }
  }
});

// Display an existing URL
app.get("/urls/:shortURL", (req, res) => {
  const { alerts, userData, currentPage } = res.locals.vars;
  const targetURL = req.params.shortURL;
  const longURL = urlDatabase[targetURL] ? urlDatabase[targetURL].longURL : false;
  // ERROR: URL does not exist
  if (!longURL) {
    res.redirect("/404");
  } else {
    // ERROR: User is not logged in
    if (!userData) {
      req.flash("warning", "You must be logged in to do that!");
      res.redirect("/login");
    } else {
      // ERROR: User is logged in but does not own the URL
      if (urlDatabase[targetURL].userID !== userData.id) {
        req.flash("danger", "You don't have permission to do that!");
        res.redirect("/");
        // SUCCESS: User is logged in and owns the URL
      } else {
        const visitData = getVisits(targetURL, urlDatabase);
        const templateVars = {
          alerts,
          userData,
          currentPage,
          shortURL: targetURL,
          urlData: urlDatabase[targetURL],
          visitData
        };
        res.render("urls_show", templateVars);
      }
    }
  }
});

// Display all existing URLs
app.get("/urls", (req, res) => {
  const { alerts, userData, currentPage } = res.locals.vars;
  // ERROR: User is not logged in
  if (!userData) {
    req.flash("warning", "You must be logged in to do that!");
    res.redirect("/login");
    // SUCCESS: User is logged in
  } else {
    const userURLs = urlsForUser(userData.id, urlDatabase);
    const templateVars = { alerts, userData, currentPage, userURLs };
    res.render("urls_index", templateVars);
  }
});

// Error 404 page
app.get("/404", (req, res) => {
  const { alerts, userData, currentPage } = res.locals.vars;
  const templateVars = { alerts, userData, currentPage };
  res.status(404).render("404", templateVars);
});

// Home page
app.get("/", (req, res) => {
  const { alerts, userData, currentPage } = res.locals.vars;
  const templateVars = { alerts, userData, currentPage };
  res.render("home", templateVars);
});

// Wildcard route
app.get(["/*"], (req, res) => {
  res.redirect("/404");
});

////////////////////////////////////////////////////

app.listen(PORT, () => {
  console.log(`tinyapp listening on port ${PORT}.`);
});
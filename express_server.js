const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const methodOverride = require("method-override");

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
    res.redirect("/urls");
  } else {
    res.status(403).send("Invalid email/password!");
  }
});

// Log the user out
app.post("/logout", (req, res) => {
  req.session.userID = null;
  res.redirect("/urls");
});

// Form to login to an existing account
app.get("/login", (req, res) => {
  const cookieUserID = req.session.userID;
  const userData = users[cookieUserID];
  // If the user is already logged in, redirect to /urls
  if (userData) {
    res.redirect("/urls");
  } else {
    const templateVars = { userData: userData };
    res.render("login", templateVars);
  }
});

// Form to register a new account
app.get("/register", (req, res) => {
  const cookieUserID = req.session.userID;
  const userData = users[cookieUserID];
  // If the user is already logged in, redirect to /urls
  if (userData) {
    res.redirect("/urls");
  } else {
    const templateVars = { userData: userData };
    res.render("register", templateVars);
  }
});

// Create a new account, log the user in, then redirect to home page
app.post("/register", (req, res) => {
  // Retrieve email and password from request body
  const email = req.body.email;
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(password, 10);
  // If an email/password is not provided or an email already exists, respond with a 400 status code
  if (!email || !password || isExistingUser(email, users)) {
    res.status(400).send("You didn't enter an email/password!");
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
  const cookieUserID = req.session.userID;
  const userData = users[cookieUserID];
  // If the user is not logged in, redirect to the login page
  if (!userData) {
    res.redirect("/login");
  } else {
    const templateVars = { userData: userData };
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
      // If the user doesn't own the URL, render an error page
      res.send("You are logged in but you can't delete that URL because you don't own it!");
    }
  } else {
    // If the user is not logged in, render an error page
    res.send("You need to log in before editing a URL!");
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
      // If the user doesn't own the URL, render an error page
      res.send("You are logged in but you don't own that URL!");
    }
  } else {
    // If the user is not logged in, render an error page
    res.send("You need to log in before editing a URL!");
  }
});

// Display a URL from the database
app.get("/urls/:shortURL", (req, res) => {
  const cookieUserID = req.session.userID;
  const userData = users[cookieUserID];
  const targetURL = req.params.shortURL;
  // Check if the URL is in the database
  const longURL = urlDatabase[targetURL].longURL;
  // If the URL does not exist, render an error page
  if (!longURL) {
    res.send("That URL doesn't exist!");
  } else {
    // If the user is logged in and owns the URL, display the page
    if (userData && urlDatabase[targetURL].userID === userData.id) {
      const templateVars = { userData: userData, shortURL: targetURL, longURL: urlDatabase[targetURL].longURL};
      res.render("urls_show", templateVars);
    } else {
      // Otherwise if the user is logged out or does not own the URL, render an error page
      res.send("Either you are not logged in or that URL doesn't belong to you!");
    }
  }
});

// Display all URLs in the database
app.get("/urls", (req, res) => {
  const cookieUserID = req.session.userID;
  const userData = users[cookieUserID];
  // If a user is logged in, retrieve their URLs, otherwise render an error page
  let userDB = {};
  if (userData) {
    userDB = urlsForUser(userData.id, urlDatabase);
    const templateVars = { userData: userData, urlDB: userDB };
    res.render("urls_index", templateVars);
  } else {
    res.send("You need to log in first!"); // -----> replace with error page
  }
});

// Home page
app.get("/", (req, res) => {
  const cookieUserID = req.session.userID;
  const userData = users[cookieUserID];
  // If a user is logged in, redirect to /urls, otherwise /login
  // res.redirect(userData ? "/urls" : "/login");
  const templateVars = { userData };
  res.render("home", templateVars);
});

////////////////////////////////////////////////////

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
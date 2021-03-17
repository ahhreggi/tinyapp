const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");
const app = express();
const PORT = 8080; // default port 8080

// Databases in memory --> will be stored in a real database later!
const urlDatabase = {
  "b2xVn2": {
    userID: "user01",
    longURL: "http://www.lighthouselabs.ca"
  },
  "g93mnV": {
    userID: "user01",
    longURL: "http://www.reddit.com"
  },
  "9sm5xK": {
    userID: "user02",
    longURL: "http://www.google.com"
  }
};
const users = {
  "user01": {
    id: "user01",
    email: "user1@example.com",
    password: "password1"
  },
  "user02": {
    id: "user02",
    email: "user2@example.com",
    password: "password2"
  }
};

// Set the view engine to EJS
app.set("view engine", "ejs");

// MIDDLEWARE //////////////////////////////////////

// Convert the request body from a Buffer into a readable string (req.body)
app.use(bodyParser.urlencoded({extended: true}));
// Parse cookies
app.use(cookieParser());
// Override POST requests with PUT/DELETE
app.use(methodOverride("_method"));

// UTILITY FUNCTIONS ///////////////////////////////

/**
 * Returns a url with an added scheme if it doesn't already have one.
 * @param  {string} url
 *         A url which may or may not include http:// or https://.
 * @return {string}
 *         The resulting url string after adding a scheme (if needed).
 */
const addHttp = (url) => {
  let result = url;
  if (!result.startsWith("http://") && !result.startsWith("https://")) {
    result = "http://" + result;
  }
  return result;
};

/**
 * Returns a random alphanumeric string.
 * @param  {number} length
 *         The desired length of the generated string.
 * @return {string}
 *         A string containing random alphanumeric characters.
 */
const generateRandomString = (length = 6) => {
  const alpha = "abcdefghijklmnopqrstuvwxyz";
  const num = "1234567890";
  const alphaNum = alpha + alpha.toUpperCase() + num;
  let randomStr = "";
  for (let index = 0; index < length; index++) {
    randomStr += alphaNum[Math.floor(Math.random() * alphaNum.length)];
  }
  return randomStr;
};

/**
 * Returns true if an email exists in the database, false otherwise.
 * @param  {string} email
 *         An email to look up in the database.
 * @return {boolean}
 *         A boolean determining whether or not the email exists.
 */
const isExistingUser = (email) => {
  // Get an array of all emails in the user database
  const allEmails = Object.keys(users).map((id) => users[id].email);
  return allEmails.includes(email);
};

/**
 * Returns an object containing a user object from the user database given an email and password.
 * @param  {string} email
 *         A string containing a user's email.
 * @param  {string} password
 *         A string containing a user's password.
 * @return {{id: string, email: string, password: string}}
 */
const getUser = (email, password) => {
  // Return the user object in the user database that has the given email and password
  return Object.values(users).find((user) => user.email === email && user.password === password);
};

// ROUTES //////////////////////////////////////////

// Log the user in
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  // Check if the email/password combination exists
  const userData = getUser(email, password);
  if (userData) {
    res.cookie("user_id", userData.id);
    res.redirect("/urls");
  } else {
    res.status(403).send("Invalid email/password!");
  }
});

// Log the user out
app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
});

// Form to login to an existing account
app.get("/login", (req, res) => {
  const cookieUserID = req.cookies["user_id"];
  const userData = users[cookieUserID];
  const templateVars = { userData: userData };
  res.render("login", templateVars);
});

// Form to register a new account
app.get("/register", (req, res) => {
  const cookieUserID = req.cookies["user_id"];
  const userData = users[cookieUserID];
  const templateVars = { userData: userData };
  res.render("register", templateVars);
});

// Create a new account, log the user in, then redirect to home page
app.post("/register", (req, res) => {
  // Retrieve email and password from request body
  const email = req.body.email;
  const password = req.body.password;
  // If an email/password is not provided or an email already exists, respond with a 400 status code
  if (!email || !password || isExistingUser(email)) {
    res.status(400).send("Something went wrong!");
  } else {
    // Add data to the database
    const id = generateRandomString(6);
    users[id] = { id, email, password };
    // Set cookies with new user info
    res.cookie("user_id", id);
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
  const cookieUserID = req.cookies["user_id"];
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
  // Add "http://" to the URL if it doesn't already have it
  const longURL = addHttp(req.body.longURL);
  // Generate a unique shortURL to be added to the database
  let shortURL = generateRandomString(6);
  while (shortURL in urlDatabase) {
    shortURL = generateRandomString(6);
  }
  // Retrieve the user's ID
  const cookieUserID = req.cookies["user_id"];
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
  const shortURL = req.params.shortURL;
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

// Updates a URL
app.put("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  // Add "http://" to the new URL if it doesn't already have it
  const newURL = addHttp(req.body.newURL);
  // Update entry in database
  urlDatabase[shortURL].longURL = newURL;
  // Redirect to index page
  res.redirect(`/urls`);
});

// Display a URL from the database
app.get("/urls/:shortURL", (req, res) => {
  const cookieUserID = req.cookies["user_id"];
  const userData = users[cookieUserID];
  const url = req.params.shortURL;
  const templateVars = { userData: userData, shortURL: url, longURL: urlDatabase[url].longURL};
  res.render("urls_show", templateVars);
});

// Display all URLs in the database
app.get("/urls", (req, res) => {
  const cookieUserID = req.cookies["user_id"];
  const userData = users[cookieUserID];
  // If a user is logged in, retrieve their URLs, otherwise pass an empty database
  let userDB = {};
  if (userData) {
    // Filter the database for entries belonging to the user ID and populate userDB
    const userShortURLs = Object.keys(urlDatabase).filter(shortURL => urlDatabase[shortURL].userID === userData.id);
    for (const shortURL of userShortURLs) {
      userDB[shortURL] = urlDatabase[shortURL];
    }
  }
  const templateVars = { userData: userData, urlDB: userDB };
  res.render("urls_index", templateVars);
});

// Home page
app.get("/", (req, res) => {
  res.redirect("/urls");
});

////////////////////////////////////////////////////

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
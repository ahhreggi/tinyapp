const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");
const app = express();
const PORT = 8080; // default port 8080

// Database in memory --> will be stored in a real database later!
const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
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

// ROUTES //////////////////////////////////////////

// Log the user in
app.post("/login", (req, res) => {
  const username = req.body.username;
  if (username) {
    res.cookie("username", username);
  }
  res.redirect("/urls");
});

// Log the user out
app.post("/logout", (req, res) => {
  res.clearCookie("username");
  res.redirect("/urls");
});

// Form to register a new account
app.get("/register", (req, res) => {
  const cookieUsername = req.cookies["username"];
  const templateVars = { username: cookieUsername };
  res.render("register", templateVars);
});

// Create a new account, log the user in, then redirect to home page
app.post("/register", (req, res) => {
  const newUsername = req.body.newUsername;
  const newPassword = req.body.newPassword;
  res.cookie("username", newUsername);
  res.redirect("/urls");
});

// Redirect valid /u/shortURL requests to its longURL
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

// Form to create a new URL
app.get("/urls/new", (req, res) => {
  const cookieUsername = req.cookies["username"];
  const templateVars = { username: cookieUsername };
  res.render("urls_new", templateVars);
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
  urlDatabase[shortURL] = longURL;
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
  urlDatabase[shortURL] = newURL;
  // Redirect to index page
  res.redirect(`/urls`);
});

// Display a URL from the database
app.get("/urls/:shortURL", (req, res) => {
  const cookieUsername = req.cookies["username"];
  const shortURL = req.params.shortURL;
  const templateVars = { username: cookieUsername, shortURL, longURL: urlDatabase[shortURL]};
  res.render("urls_show", templateVars);
});

// Display all URLs in the database
app.get("/urls", (req, res) => {
  const cookieUsername = req.cookies["username"];
  const templateVars = { username: cookieUsername, urls: urlDatabase };
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
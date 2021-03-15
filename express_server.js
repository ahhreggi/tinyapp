const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const PORT = 8080; // default port 8080

// Database in memory --> add to a real database later!
const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

// Set the view engine to EJS
app.set("view engine", "ejs");

// Convert the request body from a Buffer into a readable string (req.body)
app.use(bodyParser.urlencoded({extended: true}));

// ROUTES //////////////////////////////////////////

// Form to create a new URL
app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});

// Display a URL from the database
app.get("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  const templateVars = { shortURL: shortURL, longURL: urlDatabase[shortURL]};
  res.render("urls_show", templateVars);
});

// Display all URLs in the database
app.get("/urls", (req, res) => {
  const templateVars = { urls: urlDatabase };
  res.render("urls_index", templateVars);
});

// Home page
app.get("/", (req, res) => {
  res.send("Hello!");
});

////////////////////////////////////////////////////

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
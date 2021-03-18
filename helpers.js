const bcrypt = require("bcrypt");

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
 * @param  {{Object.<id: string, email: string, password: string}} userDB
 *         An object containing user IDs and the corresponding user credentials.
 * @return {boolean}
 *         A boolean representing whether or not the email exists.
 */
const isExistingUser = (email, userDB) => {
  // Get an array of all emails in the user database
  const allEmails = Object.keys(userDB).map((id) => userDB[id].email);
  return allEmails.includes(email);
};

/**
 * Returns an object containing a user object from the user database given an email.
 * @param  {string} email
 *         A string containing a user's email.
 * @param  {{Object.<id: string, email: string, password: string}} userDB
 *         An object containing user IDs and the corresponding user credentials.
 * @return {{id: string, email: string, password: string}|false}
 *         An object containing a single user's credentials or false if none exist.
 */
const getUserByEmail = (email, userDB) => {
  // Find and return the user object in the user database that has the given email
  const userData = Object.values(userDB).find((user) => user.email === email);
  // If an account was found, return the user data, false otherwise
  return userData ? userData : false;
};

/**
 * Returns an object containing a user object from the user database given a username.
 * @param  {string} username
 *         A string containing a user's username.
 * @param  {{Object.<id: string, email: string, password: string}} userDB
 *         An object containing user IDs and the corresponding user credentials.
 * @return {{id: string, email: string, password: string}|false}
 *         An object containing a single user's credentials or false if none exist.
 */
const getUserByUsername = (username, userDB) => {
  // Find and return the user object in the user database that has the given username
  const userData = Object.values(userDB).find((user) => user.username === username);
  // If an account was found, return the user data, false otherwise
  return userData ? userData : false;
};

/**
 * Returns true if the given email and password combination exists in the database.
 * @param  {string} email
 *         A string containing a user's email.
 * @param  {string} password
 *         A string containing a user's password.
 * @param  {{Object.<id: string, email: string, password: string}} userDB
 *         An object containing user IDs and the corresponding user credentials.
 * @param  {boolean} useUsername
 *         A boolean determining whether or not to use a username instead of an email.
 * @return {{id: string, email: string, password: string}|boolean}
 *         An object containing a single user's credentials or false if none exist.
 */
const authenticateUser = (email, password, userDB, useUsername = false) => {
  let userData;
  // Retrieve user info from the database by username/email
  if (useUsername) {
    userData = getUserByUsername(email, userDB);
  } else {
    userData = getUserByEmail(email, userDB);
  }
  // If a user with the username/email exists, check if the credentials are valid
  const valid = userData ? bcrypt.compareSync(password, userData.password) : false;
  // If the credentials are valid, return the user data, false otherwise
  return valid ? userData : false;
};

/**
 * Returns an object containing URLs from the database belonging to the user with the given ID.
 * @param  {string} id
 *         A string containing the user's ID.
 * @param  {{Object.<userID: string, longURL: string>}} urlDB
 *         An object containing all URLs in the database.
 * @return {{Object.<userID: string, longURL: string>}}
 *         An object with URLs from the database belonging to the given ID.
 */
const urlsForUser = (id, urlDB) => {
  const userDB = {};
  // Filter the database for entries belonging to the user ID
  const userShortURLs = Object.keys(urlDB).filter(shortURL => urlDB[shortURL].userID === id);
  // Populate userDB with the data of each short URL, retrieved from the URL database.
  for (const shortURL of userShortURLs) {
    userDB[shortURL] = urlDB[shortURL];
  }
  return userDB;
};

/**
 * Returns true if the given shortURL belongs to the specified user ID.
 * @param  {string} userID
 *         A string containing the ID of a user.
 * @param  {string} shortURL
 *         A string containing the ID of a URL.
 * @param  {{Object.<userID: string, longURL: string>}} urlDB
 *         An object containing all URLs in the database.
 * @return {boolean}
 *         A boolean representing whether or not the URL belongs to the user.
 */
const userOwnsURL = (userID, shortURL, urlDB) => {
  return urlDB[shortURL].userID === userID;
};

/**
 * Returns true if the given URL is possibly valid.
 * @param  {string} url
 *         A string containing a URL.
 * @return {boolean}
 *         A boolean representing whether or not the URL is valid.
 */
const validateURL = (url) => {
  let valid;
  try {
    new URL(url);
    valid = true;
  } catch (err) {
    valid = false;
  }
  return valid;
};

module.exports = {
  addHttp,
  generateRandomString,
  isExistingUser,
  getUserByEmail,
  authenticateUser,
  urlsForUser,
  userOwnsURL,
  validateURL
};
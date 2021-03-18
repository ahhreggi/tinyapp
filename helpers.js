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
const generateRandomString = (length) => {
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
 * Returns true if a username or email exists in the database, false otherwise.
 * @param  {string} username
 *         A username to look up in the database.
 * @param  {string} email
 *         An email to look up in the database.
 * @param  {{Object.<id: string, username: string, email: string, password: string}} userDB
 *         An object containing user IDs and the corresponding user credentials.
 * @return {string|undefined}
 *         A string representing the existing property or undefined if none was found.
 */
const isExistingUser = (username, email, userDB) => {
  let result;
  // For each user in the database
  for (const userID in userDB) {
    if (userDB[userID].username === username) {
      result = "username";
      break;
    } else if (userDB[userID].email === email) {
      result = "email";
      break;
    }
  }
  return result;
};

/**
 * Returns an object containing a user object from the user database given an email.
 * @param  {string} email
 *         A string containing a user's email.
 * @param  {{Object.<id: string, username: string, email: string, password: string}} userDB
 *         An object containing user IDs and the corresponding user credentials.
 * @return {{id: string, email: string, password: string}|false}
 *         An object containing a single user's credentials or false if none exist.
 */
const getUserByEmail = (email, userDB) => {
  const userData = Object.values(userDB).find((user) => user.email === email);
  return userData ? userData : false;
};

/**
 * Returns an object containing a user object from the user database given a username.
 * @param  {string} username
 *         A string containing a user's username.
 * @param  {{Object.<id: string, username: string, email: string, password: string}} userDB
 *         An object containing user IDs and the corresponding user credentials.
 * @return {{id: string, email: string, password: string}|false}
 *         An object containing a single user's credentials or false if none exist.
 */
const getUserByUsername = (username, userDB) => {
  const userData = Object.values(userDB).find((user) => user.username === username);
  return userData ? userData : false;
};

/**
 * Returns true if the given email and password combination exists in the database.
 * @param  {string} email
 *         A string containing a user's email.
 * @param  {string} password
 *         A string containing a user's password.
 * @param  {{Object.<id: string, username: string, email: string, password: string}} userDB
 *         An object containing user IDs and the corresponding user credentials.
 * @param  {boolean} useUsername
 *         A boolean determining whether or not to use a username instead of an email.
 * @return {{id: string, email: string, password: string}|boolean}
 *         An object containing a single user's credentials or false if none exist.
 */
const authenticateUser = (email, password, userDB, useUsername = false) => {
  let userData;
  // Retrieve user info from the database by username or email
  if (useUsername) {
    userData = getUserByUsername(email, userDB);
  } else {
    userData = getUserByEmail(email, userDB);
  }
  // Check if the provided password matches the hashed password in the database
  const valid = userData ? bcrypt.compareSync(password, userData.password) : false;
  return valid ? userData : false;
};

/**
 * Returns an array containing URLs from the database belonging to the user with the given ID.
 * @param    {string} id
 *           A string containing the user's ID.
 * @param    {Object} urlDB
 *           An object containing all URLs in the database.
 * @property {string} urlDB.userID
 *           A string containing the ID of the URL creator.
 * @property {string} urlDB.longURL
 *           A string containing the reference URL.
 * @property {string} urlDB.created
 *           A string containing the timestamp of the URL's creation.
 * @property {string|null} urlDB.lastModified
 *           A string containing the timestamp fo the URL's latest update or null.
 * @property {Array.<{timestamp: string, visitorID: string}>} urlDB.visitorLog
 *           An array of objects containing visitor data.
 * @return {Array.<{shortURL: string, data: {<userID: string, longURL: string>}}>}
 *         An array of objects containing URL IDs and their data belonging to the given ID.
 */
const urlsForUser = (id, urlDB) => {
  const userDB = [];
  // Filter the database for entries belonging to the user ID
  const userShortURLs = Object.keys(urlDB).filter(shortURL => urlDB[shortURL].userID === id);
  for (const shortURL of userShortURLs) {
    const url = {
      shortURL,
      data: urlDB[shortURL]
    };
    userDB.push(url);
  }
  return userDB;
};

/**
 * Returns true if the given shortURL belongs to the specified user ID.
 * @param    {string} userID
 *           A string containing the ID of a user.
 * @param    {string} shortURL
 *           A string containing the ID of a URL.
 * @param    {Object} urlDB
 *           An object containing all URLs in the database.
 * @property {string} urlDB.userID
 *           A string containing the ID of the URL creator.
 * @property {string} urlDB.longURL
 *           A string containing the reference URL.
 * @property {string} urlDB.created
 *           A string containing the timestamp of the URL's creation.
 * @property {string|null} urlDB.lastModified
 *           A string containing the timestamp fo the URL's latest update or null.
 * @property {Array.<{timestamp: string, visitorID: string}>} urlDB.visitorLog
 *           An array of objects containing visitor data.
 * @return   {Array.<{shortURL: string, data: {<userID: string, longURL: string>}}>}
 *           An array of objects containing URL IDs and their data belonging to the given ID.
 * @return   {boolean}
 *           A boolean representing whether or not the URL belongs to the user.
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
  // Attempt to construct a URL with the given string
  try {
    new URL(url);
    valid = true;
    // If an error is thrown, the URL is invalid
  } catch (err) {
    valid = false;
  }
  return valid;
};

/**
 * Returns the total and unique number of visits for a given URL in the database.
 * @param    {string} url
 *           A string containing the ID of a URL.
 * @param    {Object} urlDB
 *           An object containing all URLs in the database.
 * @property {string} urlDB.userID
 *           A string containing the ID of the URL creator.
 * @property {string} urlDB.longURL
 *           A string containing the reference URL.
 * @property {string} urlDB.created
 *           A string containing the timestamp of the URL's creation.
 * @property {string|null} urlDB.lastModified
 *           A string containing the timestamp fo the URL's latest update or null.
 * @property {Array.<{timestamp: string, visitorID: string}>} urlDB.visitorLog
 *           An array of objects containing visitor data.
 * @return   {Array.<{shortURL: string, data: {<userID: string, longURL: string>}}>}
 *           An array of objects containing URL IDs and their data belonging to the given ID.
 * @return   {Object.<{total: number, unique: number}>|boolean}
 *         An object containing the total and unique number of visits to the URL or false if it doesn't exist.
 */
const getVisits = (url, urlDB) => {
  if (!Object.keys(urlDB).includes(url)) {
    return false;
  }
  const visitorLog = urlDB[url].visitorLog;
  // Retrieve an array of all visitor IDs then filter the unique values only
  let uniqueVisitors = visitorLog
    .map(visit => visit.visitorID)
    .filter((visitorID, index, allVisitors) => allVisitors.indexOf(visitorID) === index);
  return { total: visitorLog.length, unique: uniqueVisitors.length };
};

module.exports = {
  addHttp,
  generateRandomString,
  isExistingUser,
  getUserByEmail,
  authenticateUser,
  urlsForUser,
  userOwnsURL,
  validateURL,
  getVisits
};
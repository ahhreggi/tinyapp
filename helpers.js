const bcrypt = require("bcrypt");

/**
 * Returns a URL with an added scheme if it doesn't already have one.
 * @param  {string} url
 *         The URL which may or may not include http:// or https://.
 * @return {string}
 *         The resulting URL after adding a scheme (if needed).
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
 *         A string of random alphanumeric characters.
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
 * Returns a string representing the property that exists in the database, false otherwise.
 * @param  {string} username
 *         The username to look up in the database.
 * @param  {string} email
 *         The email to look up in the database.
 * @param  {{Object.<id: string, username: string, email: string, password: string}} userDB
 *         An object containing user IDs and their associated credentials.
 * @return {string|undefined}
 *         The existing property or undefined if none was found.
 */
const getExistingProperty = (username, email, userDB) => {
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
 * Returns an object containing a user's credentials from database given a username/email.
 * @param  {string} login
 *         The username/email to look up in the database.
 * @param  {{Object.<id: string, username: string, email: string, password: string}} userDB
 *         An object containing user IDs and the corresponding user credentials.
 * @return {{id: string, email: string, password: string}|undefined}
 *         An object containing a single user's credentials or undefined if none was found.
 */
const getUserData = (login, userDB) => {
  const userData = Object.values(userDB).find((user) => {
    return user.username === login || user.email === login;
  });
  return userData;
};

/**
 * Returns true if the given username/email and password combination exists in the database, false otherwise.
 * @param  {string} login
 *         The username/email to look up in the database.
 * @param  {string} password
 *         The password to authenticate credentials with.
 * @param  {{Object.<id: string, username: string, email: string, password: string}} userDB
 *         An object containing user IDs and the corresponding user credentials.
 * @return {{id: string, email: string, password: string}|boolean}
 *         An object containing a single user's credentials or false if none was found.
 */
const authenticateUser = (login, password, userDB) => {
  let userData = getUserData(login, userDB);
  let valid = false;
  // Given a valid login, check if the password matches the hashed password in the database
  if (userData) {
    valid = bcrypt.compareSync(password, userData.password);
  }
  return valid;
};

/**
 * Returns an array containing URLs from the database belonging to the user with the given ID.
 * @param    {string} id
 *           The user's ID.
 * @param    {Object} urlDB
 *           An object containing all URLs in the database.
 * @property {string} urlDB.userID
 *           The ID of the URL creator.
 * @property {string} urlDB.longURL
 *           The referenced URL.
 * @property {string} urlDB.created
 *           The timestamp of the URL's creation.
 * @property {string|null} urlDB.lastModified
 *           The timestamp fo the URL's latest update or null.
 * @property {Array.<{timestamp: string, visitorID: string}>} urlDB.visitorLog
 *           An array of objects containing visitor data.
 * @return   {Array.<{shortURL: string, data: {<userID: string, longURL: string>}}>}
 *           An array of objects containing URL IDs and associated data.
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
 * Returns true if the given shortURL belongs to the specified user ID, false otherwise.
 * @param    {string} userID
 *           The user's ID.
 * @param    {string} shortURL
 *           The ID of a URL.
 * @param    {Object} urlDB
 *           An object containing all URLs in the database.
 * @property {string} urlDB.userID
 *           The ID of the URL creator.
 * @property {string} urlDB.longURL
 *           The referenced URL.
 * @property {string} urlDB.created
 *           The timestamp of the URL's creation.
 * @property {string|null} urlDB.lastModified
 *           The timestamp fo the URL's latest update or null.
 * @property {Array.<{timestamp: string, visitorID: string}>} urlDB.visitorLog
 *           An array of objects containing visitor data.
 * @return   {boolean}
 *           A boolean representing whether or not the URL belongs to the user.
 */
const userOwnsURL = (userID, shortURL, urlDB) => {
  let check = false;
  if (Object.keys(urlDB).includes(shortURL)) {
    check = urlDB[shortURL].userID === userID;
  }
  return check;
};

/**
 * Returns true if the given URL is possibly valid, false otherwise.
 * @param  {string} url
 *         The URL to validate.
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
 *           The ID of a URL.
 * @param    {Object} urlDB
 *           An object containing all URLs in the database.
 * @property {string} urlDB.userID
 *           The ID of the URL creator.
 * @property {string} urlDB.longURL
 *           The referenced URL.
 * @property {string} urlDB.created
 *           The timestamp of the URL's creation.
 * @property {string|null} urlDB.lastModified
 *           The timestamp fo the URL's latest update or null.
 * @property {Array.<{timestamp: string, visitorID: string}>} urlDB.visitorLog
 *           An array of objects containing visitor data.
 * @return   {Object.<{total: number, unique: number}>|boolean}
 *           An object containing the total and unique number of visits to the URL or false if it doesn't exist.
 */
const getVisits = (url, urlDB) => {
  let result;
  if (!Object.keys(urlDB).includes(url)) {
    result = false;
  } else {
    const visitorLog = urlDB[url].visitorLog;
    // Retrieve an array of all visitor IDs then filter the unique values only
    let uniqueVisitors = visitorLog
      .map(visit => visit.visitorID)
      .filter((visitorID, index, allVisitors) => allVisitors.indexOf(visitorID) === index);
    result = {
      total: visitorLog.length,
      unique: uniqueVisitors.length
    };
  }
  return result;
};

module.exports = {
  addHttp,
  generateRandomString,
  getExistingProperty,
  getUserData,
  authenticateUser,
  urlsForUser,
  userOwnsURL,
  validateURL,
  getVisits
};
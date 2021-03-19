const { assert } = require("chai");

const {
  addHttp,
  generateRandomString,
  getExistingProperty,
  getUserData,
  authenticateUser,
  urlsForUser,
  userOwnsURL,
  validateURL,
  getVisits
} = require("../helpers.js");

const urlDatabase = require("../data/urlDatabase");
const userDatabase = require("../data/userDatabase");

describe("addHttp", () => {
  it("should format a URL without a scheme", () => {
    const actual = addHttp("google.ca");
    const expected = "http://google.ca";
    assert.equal(actual, expected);
  });
  it("should format a URL with http://", () => {
    const actual = addHttp("http://google.ca");
    const expected = "http://google.ca";
    assert.equal(actual, expected);
  });
  it("should format a URL with https://", () => {
    const actual = addHttp("https://google.ca");
    const expected = "https://google.ca";
    assert.equal(actual, expected);
  });
});

describe("generateRandomString", () => {
  it("should generate a string of any given length", () => {
    const actual = generateRandomString(6).length;
    const expected = 6;
    assert.equal(actual, expected);
  });
});

describe("getExistingProperty", () => {
  it("should return 'username' if only the username exists in the database", () => {
    const username = "user1";
    const actual = getExistingProperty(username, "fake@email.com", userDatabase);
    const expected = "username";
    assert.equal(actual, expected);
  });
  it("should return 'email' if only the email exists in the database", () => {
    const email = "user1@example.com";
    const actual = getExistingProperty("fakeName", email, userDatabase);
    const expected = "email";
    assert.equal(actual, expected);
  });
  it("should return 'username' if both the username and email exist in the database", () => {
    const username = "user1";
    const email = "user1@example.com";
    const actual = getExistingProperty(username, email, userDatabase);
    const expected = "username";
    assert.equal(actual, expected);
  });
  it("should return undefined if neither the username nor email exist in the database", () => {
    const result = getExistingProperty("newUsername", "new@email.com", userDatabase);
    assert.isUndefined(result);
  });
});

describe("getUserData", () => {
  it("should return the user data if the username exists", () => {
    const username = "user1";
    const actual = getUserData(username, userDatabase);
    const expected = {
      id: "aUA4CE",
      username: "user1",
      email: "user1@example.com",
      password: "$2b$10$Ohnf9u6HTv13.FnN5DPDs.xetN927Id./C90YXXOgREKq/hIQesiq"
    };
    assert.deepEqual(actual, expected);
  });
  it("should return the user data if the email exists", () => {
    const email = "user1@example.com";
    const actual = getUserData(email, userDatabase);
    const expected = {
      id: "aUA4CE",
      username: "user1",
      email: "user1@example.com",
      password: "$2b$10$Ohnf9u6HTv13.FnN5DPDs.xetN927Id./C90YXXOgREKq/hIQesiq"
    };
    assert.deepEqual(actual, expected);
  });
  it("should return undefined if the username/email does not exist", () => {
    const login = "invalid";
    const actual = getUserData(login, userDatabase);
    assert.isUndefined(actual);
  });
});

describe("authenticateUser", () => {
  it("should return the user data if the username and password are correct", () => {
    const username = "user1";
    const password = "password1";
    const actual = authenticateUser(username, password, userDatabase);
    const expected = {
      id: "aUA4CE",
      username: "user1",
      email: "user1@example.com",
      password: "$2b$10$Ohnf9u6HTv13.FnN5DPDs.xetN927Id./C90YXXOgREKq/hIQesiq"
    };
    assert.deepEqual(actual, expected);
  });
  it("should return the user data if the email and password are correct", () => {
    const email = "user1@example.com";
    const password = "password1";
    const actual = authenticateUser(email, password, userDatabase);
    const expected = {
      id: "aUA4CE",
      username: "user1",
      email: "user1@example.com",
      password: "$2b$10$Ohnf9u6HTv13.FnN5DPDs.xetN927Id./C90YXXOgREKq/hIQesiq"
    };
    assert.deepEqual(actual, expected);
  });
  it("should return false for a valid username if the password is incorrect", () => {
    const username = "user1";
    const password = "123";
    const result = authenticateUser(username, password, userDatabase);
    assert.isFalse(result);
  });
  it("should return false for a valid email if the password is incorrect", () => {
    const email = "user1@example.com";
    const password = "123";
    const result = authenticateUser(email, password, userDatabase);
    assert.isFalse(result);
  });
});

describe("urlsForUser", () => {
  it("should return an array of length 2 given a valid user ID associated with 2 URLs", () => {
    const userID = "aUA4CE";
    const actual = urlsForUser(userID, urlDatabase).length;
    const expected = 2;
    assert.equal(actual, expected);
  });
  it("should return an empty array given a valid user ID associated with 0 URLs", () => {
    const userID = "iWYBRD";
    const actual = urlsForUser(userID, urlDatabase).length;
    const expected = 0;
    assert.equal(actual, expected);
  });
  it("should return an empty array given an invalid user ID", () => {
    const userID = "fakeid123";
    const actual = urlsForUser(userID, urlDatabase).length;
    const expected = 0;
    assert.equal(actual, expected);
  });
});

describe("userOwnsURL", () => {
  it("should return true if a valid userID owns a valid URL", () => {
    const userID = "aUA4CE";
    const shortURL = "b2xVn2";
    const result = userOwnsURL(userID, shortURL, urlDatabase);
    assert.isTrue(result);
  });
  it("should return false if a valid userID does not own a valid URL", () => {
    const userID = "aUA4CE";
    const shortURL = "9sm5xK";
    const result = userOwnsURL(userID, shortURL, urlDatabase);
    assert.isFalse(result);
  });
  it("should return false if the userID is invalid and the URL is valid", () => {
    const userID = "NotAUserID";
    const shortURL = "9sm5xK";
    const result = userOwnsURL(userID, shortURL, urlDatabase);
    assert.isFalse(result);
  });
  it("should return false if the userID is valid and the URL is invalid", () => {
    const userID = "aUA4CE";
    const shortURL = "NotAURL";
    const result = userOwnsURL(userID, shortURL, urlDatabase);
    assert.isFalse(result);
  });
});

describe("validateURL", () => {
  it("should return true if the URL is possibly valid", () => {
    const url = "http://google.ca";
    const result = validateURL(url);
    assert.isTrue(result);
  });
  it("should return false if the URL is 'http://'", () => {
    const url = "http://";
    const result = validateURL(url);
    assert.isFalse(result);
  });
  it("should return false if the URL has spaces", () => {
    const url = "http://www.goo gle.ca";
    const result = validateURL(url);
    assert.isFalse(result);
  });
  it("should return false if the URL is empty", () => {
    const url = "";
    const result = validateURL(url);
    assert.isFalse(result);
  });
});

describe("getVisits", () => {
  it("should return the correct number of total visits", () => {
    const url = "b2xVn2";
    const actual = getVisits(url, urlDatabase).total;
    const expected = 4;
    assert.equal(actual, expected);
  });
  it("should return the correct number of unique visits", () => {
    const url = "b2xVn2";
    const actual = getVisits(url, urlDatabase).unique;
    const expected = 2;
    assert.equal(actual, expected);
  });
  it("should return 0 total visits if the URL has no visits", () => {
    const url = "g2hjjs";
    const actual = getVisits(url, urlDatabase).total;
    const expected = 0;
    assert.equal(actual, expected);
  });
  it("should return 0 unique visits if the URL has no visits", () => {
    const url = "g2hjjs";
    const actual = getVisits(url, urlDatabase).total;
    const expected = 0;
    assert.equal(actual, expected);
  });
  it("should return false if the URL does not exist", () => {
    const url = "NotAURL";
    const result = getVisits(url, urlDatabase);
    assert.isFalse(result);
  });
});
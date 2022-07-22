import fetch from "node-fetch";
import express from "express";
import redis from "redis";


const USERNAME_TTL = 3600;
const client = redis.createClient(6379);
const app = express();

// Helper function to set the response
function setResponse(username, repos) {
  return `<h2>${username} has ${repos} Github repos</h2>`;
}

// Cache middleware
function cache(req, res, next) {
  const { username } = req.params;

  client.get(username, (err, data) => {
    if (err) throw err;

    if (data !== null) {
      console.log('Getting Data from Redis...');
      res.send(setResponse(username, data));
    } else {
      console.log('Fetching Data...');
      next();
    }
  });
}

// Make request to Github to get the user data
async function getRepos(req, res, next) {
  try {
    const { username } = req.params;

    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();

    const repos = data.public_repos;

    // Set data to Redis
    client.setex(username, USERNAME_TTL, repos);

    res.send(setResponse(username, repos));
  } catch (err) {
    console.error(err);
    res.status(500);
  }
}

// Route
app.get('/repos/:username', cache, getRepos);

// Starting the application
app.listen(5000, () => {
  console.log(`App listening on port 5000`);
});
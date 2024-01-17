const express = require("express");
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const jwt = require("jsonwebtoken");
const fs = require("fs");

var ffmpeg = [];

const users = [{ id: 1, username: "aldey", password: "password" }];
const secretKey = "your-secret-key";

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

function authenticateToken(req, res, next) {
  const token =
    req.header("Authorization") && req.header("Authorization").split(" ")[1];

  if (!token)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  jwt.verify(token, secretKey, (err, user) => {
    if (err)
      return res.status(403).json({ success: false, message: "Invalid token" });

    req.user = user;
    next();
  });
}

function getCurrentDateTime() {
  const now = new Date();

  const year = now.getFullYear().toString().slice(-2);
  const month = padZero(now.getMonth() + 1);
  const day = padZero(now.getDate());
  const hours = padZero(now.getHours());
  const minutes = padZero(now.getMinutes());
  const seconds = padZero(now.getSeconds());

  const formattedDateTime = `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
  return formattedDateTime;
}

function padZero(value) {
  return value < 10 ? `0${value}` : value;
}

app.post("/link/add", authenticateToken, (req, res) => {
  try {
    const { link, isRecording = false } = req.body;
    const dataToWrite = JSON.stringify({ link, isRecording });

    fs.writeFileSync("link/link.json", dataToWrite);
    res.json({ success: true, message: "Link added successfully." });
  } catch (error) {
    console.error("Error writing to file:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.get("/link/get", (req, res) => {
  try {
    const linkContent = fs.readFileSync("link/link.json", "utf-8");
    const parsedLinkContent = JSON.parse(linkContent);

    res.json({ success: true, linkContent: parsedLinkContent });
  } catch (error) {
    console.error("Error reading file:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.get("/linkcek", function (req, res) {
  const token =
    req.header("Authorization") && req.header("Authorization").split(" ")[1];

  if (!token)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Invalid token" });
    } else {
      return res.status(200).json({ success: true, message: "Berhasil" });
    }
  });
});

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "/login/index.html"));
});

app.get("/link", function (req, res) {
  res.sendFile(path.join(__dirname, "/link/index.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      secretKey,
      { expiresIn: "24h" }
    );
    res.json({ success: true, token });
  } else {
    res.json({ success: false, message: "Invalid credentials" });
  }
});

app.get("/protected", authenticateToken, (req, res) => {
  res.json({ message: "Protected endpoint. User is authenticated." });
});

app.get("/player", function (req, res) {
  res.sendFile(path.join(__dirname, "/player/index.html"));
});

app.post("/updateJson", (req, res) => {
  try {
    const { link, isRecording } = req.body;
    const dataToWrite = JSON.stringify({ link, isRecording });
    fs.writeFileSync("link/link.json", dataToWrite);
    res.json({ success: true, message: "Link added successfully." });
  } catch (e) {
    res.json({ success: false, message: "Failed" });
  }
});

app.post("/record", async (req, res) => {
  try {
    const inputUrl = req.body.inputUrl;
    const currentDateTime = getCurrentDateTime();

    ffmpeg = exec(
      `ffmpeg -i "${inputUrl}" -c copy /var/www/Teather-Recorder/recorded/${currentDateTime}.mp4`
    );

    ffmpeg.stdout.on("data", (data) => {
      wss.clients.forEach((client) => {
        client.send(data.toString());
      });
    });

    ffmpeg.stderr.on("data", (data) => {
      wss.clients.forEach((client) => {
        client.send(data.toString());
      });
    });

    res.json({ success: true, body: "Recording started" });
  } catch (error) {
    console.error("Error Recording:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.post("/record/stop", (req, res) => {
  ffmpeg.stdin.write("q");
  res.json({ success: true, body: "Recording stopped" });
});

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

server.listen(3000, () => {
  console.log("Example app listening on port 3000!");
});

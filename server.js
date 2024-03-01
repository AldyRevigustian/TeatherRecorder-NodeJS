const express = require("express");
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const https = require("https");
const path = require("path");
const app = express();
const fs = require("fs");

var options = {
  key: fs.readFileSync('key-rsa2.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/micna.my.id/fullchain.pem')
};

const server = https.createServer(options, app);
const jwt = require("jsonwebtoken");

const users = [{ id: 1, username: "aldey", password: "password" }];
const secretKey = "your-secret-key";

var ffmpeg = [];
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

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
    const currentDateTime = getCurrentDateTime();
    const { link, isRecording = false, date = currentDateTime } = req.body;
    const dataToWrite = JSON.stringify({ link, isRecording, date });

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

app.get("/playlist", function (req, res) {
  res.sendFile(path.join(__dirname, "/playlist/index.html"));
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
    const { isRecording } = req.body;
    const linkContent = fs.readFileSync("link/link.json", "utf-8");
    const parsedLinkContent = JSON.parse(linkContent);
    const link = parsedLinkContent.link;
    const date = parsedLinkContent.date;

    const dataToWrite = JSON.stringify({ link, isRecording, date });
    fs.writeFileSync("link/link.json", dataToWrite);

    res.json({ success: true, message: "Link added successfully." });
  } catch (e) {
    res.json({ success: false, message: "Failed" });
  }
});

function checkFileExistsSync(filepath) {
  let flag = true;
  try {
    fs.accessSync(filepath, fs.constants.F_OK);
  } catch (e) {
    flag = false;
  }
  return flag;
}

app.get('/log', (req, res) => {
  const linkContent = fs.readFileSync("link/link.json", "utf-8");
  const parsedLinkContent = JSON.parse(linkContent);
  const currentDateTime = parsedLinkContent.date;

  if (parsedLinkContent.isRecording == true) {
    if (checkFileExistsSync(`recorded/${currentDateTime}.log`) == true) {
      const logStream = fs.createReadStream(`recorded/${currentDateTime}.log`);
      logStream.pipe(res);
    }
  } else if (parsedLinkContent.isDone == true) {
    res.send("Selesai Record")
  }
});

app.post("/record", async (req, res) => {
  try {
    const linkContent = fs.readFileSync("link/link.json", "utf-8");
    const parsedLinkContent = JSON.parse(linkContent);

    const inputUrl = parsedLinkContent.link;
    const currentDateTime = parsedLinkContent.date;

    ffmpeg = exec(
      `ffmpeg -i "${inputUrl}" -c copy /var/www/Teather-Recorder/recorded/${currentDateTime}.mp4`
      // `ffmpeg -i "${inputUrl}" -c copy ${currentDateTime}.mp4`
    );

    const logStream = fs.createWriteStream(`recorded/${currentDateTime}.log`, { flags: 'a' });
    ffmpeg.stdout.pipe(logStream);
    ffmpeg.stderr.pipe(logStream);

    ffmpeg.on('close', (code) => {
      if (code == 0) {
        const link = parsedLinkContent.link;
        const date = parsedLinkContent.date;

        const { isRecording = false, isDone = true } = req.body;
        const dataToWrite = JSON.stringify({ link, isRecording, date, isDone });
        fs.writeFileSync("link/link.json", dataToWrite);
      } else {
        console.error(`Streaming finished with error (code ${code}): ${signal}`);
      }
      ffmpeg.stdin.write("q");
      logStream.end();
    });

    ffmpeg.on('exit', (code) => {
      if (code == 0) {
        const link = parsedLinkContent.link;
        const date = parsedLinkContent.date;

        const { isRecording = false, isDone = true } = req.body;
        const dataToWrite = JSON.stringify({ link, isRecording, date, isDone });
        fs.writeFileSync("link/link.json", dataToWrite);
      } else {
        console.error(`Streaming finished with error (code ${code}): ${signal}`);
      }
      ffmpeg.stdin.write("q");
      logStream.end();
    });

    res.json({ success: true, body: "Recording started" });
  } catch (error) {
    console.error("Error Recording:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.post("/record/stop", (req, res) => {
  const linkContent = fs.readFileSync("link/link.json", "utf-8");
  const parsedLinkContent = JSON.parse(linkContent);

  const link = parsedLinkContent.link;
  const date = parsedLinkContent.date;

  const { isRecording = false, isDone = true } = req.body;
  const dataToWrite = JSON.stringify({ link, isRecording, date, isDone });
  fs.writeFileSync("link/link.json", dataToWrite);
  ffmpeg.stdin.write("q");
  res.json({ success: true, body: "Recording stopped" });
});

app.post("/playlist/add", authenticateToken, (req, res) => {
  const { link, name } = req.body;
  fs.readFile('playlist/playlist.json', 'utf8', (err, data) => {
    if (err) {
      var playlist = [];
    } else {
      var playlist = JSON.parse(data);
    }
    playlist.unshift({ name, link });
    console.log(playlist);
    fs.writeFile('playlist/playlist.json', JSON.stringify(playlist), 'utf8', (err) => {
      if (err) {
        console.error('Error writing to playlist.json:', err);
        res.status(500).send('Internal Server Error');
      } else {
        console.log('Playlist updated successfully');
        res.json({ success: true });

      }
    });
  });
});

app.get("/playlist/get", (req, res) => {
  try {
    const playlist = fs.readFileSync("playlist/playlist.json", "utf-8");
    const parsedPlaylist = JSON.parse(playlist);

    res.json({ success: true, playlist: parsedPlaylist });
  } catch (error) {
    console.error("Error reading file:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

server.listen(3000, () => {
  console.log("Example app listening on port 3000!");
});

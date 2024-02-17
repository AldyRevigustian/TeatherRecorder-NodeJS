const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('recorded.sqlite');

db.run(`
  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    isRecording INTEGER DEFAULT 1,
    isUploaded INTEGER DEFAULT 0
  )
`);


const addItem = (name) => {
  db.run('INSERT INTO videos (name) VALUES (?)', [name], (err) => {
    if (err) {
      console.error('Error:', err.message);
      return;
    }
    console.log('Item added successfully');
  });
};

const updateRecording = (name, isRecording) => {
  db.run('UPDATE videos SET isRecording = (?) WHERE name = ?', [isRecording, name], (err) => {
    if (err) {
      console.error('Error:', err.message);
      return;
    }
    console.log('Item updated successfully');
  });
};

const updateUpload = (name) => {
  db.run('UPDATE videos SET isUploaded = 1 WHERE name = ?', [name], (err) => {
    if (err) {
      console.error('Error:', err.message);
      return;
    }
    console.log('Item updated successfully');
  });
};

const getItemByName = (name) => {
  db.get('SELECT * FROM videos WHERE name = ?', [name], (err, row) => {
    if (err) {
      console.error('Error:', err.message);
      return;
    }
    if (row) {
      console.log('Item:', row);
      return true;
    } else {
      console.log('Item not found');
      return false;
    }
  });
};

// const getItemsDone = (name) => {
//   db.all('SELECT * FROM videos WHERE isRecording = 0 AND isUploaded = 0', (err, row) => {
//     if (err) {
//       console.error('Error:', err.message);
//       return false;
//     }
//     if (row) {
//       return row;
//       console.log('Item:', row);
//     } else {
//       return false
//       // console.log('Item not found');
//     }
//   });
// };

const getItemsDone = (callback) => {
  db.all('SELECT * FROM videos WHERE isRecording = 0 AND isUploaded = 0', (err, rows) => {
    if (err) {
      callback(err, null);
    } else {
      if (rows.length > 0) {
        callback(null, rows);
      } else {
        callback(null, []);
      }
    }
  });
};

const deleteItem = (name) => {
  db.run('DELETE FROM videos WHERE name = ?', [name], (err) => {
    if (err) {
      console.error('Error:', err.message);
      return;
    }
    console.log('Item deleted successfully');
  });
};


// addItem('24-01-28-09-57-45.mp4');
// updateRecording('24-01-28-09-57-45.mp4', 0)
// updateUpload('Item 1')
// deleteItem("24-01-28-09-57-45.mp4");

// getItemByName("Item 1")

module.exports = {
  addItem,
  updateRecording,
  updateUpload,
  getItemByName,
  getItemsDone
};

module.exports.db = db;
// db.close();

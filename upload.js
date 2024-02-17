const { upload } = require('youtube-videos-uploader');
const { getItemsDone, db, updateUpload } = require('./database');

// const credentials = { email: 'sdiff8972@gmail.com', pass: 'Akunbaru123*', recoveryemail: 'Your Recovery Email' }
const credentials = { email: 'clippermicha@gmail.com', pass: 'Akunbaru123*', recoveryemail: 'Your Recovery Email' }

const processItems = async () => {
  try {
    const items = await new Promise((resolve, reject) => {
      getItemsDone((err, items) => {
        if (err) {
          console.error('Error:', err.message);
          reject(err);
        } else {
          resolve(items);
        }
      });
    });

    const arr = items.map(item => item.name);

    for (let i = 0; i < arr.length; i++) {
      const element = arr[i];
      console.log(`Uploading video: ${element}`);
      await uploadVideo(element);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
};

const uploadVideo = async (item) => {
  try {
    let onVideoUploadSuccess = (videoUrl) => {
      updateUpload(item);
    }

    let video = { path: `./recorded/${item}`, title: `${item}`, description: '', publishType: 'UNLISTED', isAgeRestriction: false, isNotForKid: true, onProgress: (progress) => { console.log('progress', progress) }, onSuccess: onVideoUploadSuccess }
    // let video = { path: `./recorded/${item}`, title: `${item}`, description: '', playlist: 'Recorded', publishType: 'UNLISTED', isAgeRestriction: false, isNotForKid: true, onProgress: (progress) => { console.log('progress', progress) }, onSuccess: onVideoUploadSuccess }

    await upload(credentials, [video], { headless: true, executablePath: "/usr/bin/google-chrome", args: ['--no-sandbox'] });
    // await upload(credentials, [video], { headless: true, executablePath: "/opt/google/chrome/google-chrome", args: ['--no-sandbox'] });
  } catch (error) {
    console.error(`Error uploading video ${item}:`, error);
  }
};

processItems();

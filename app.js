require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const moment = require('moment');

const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
const rClient = client.readOnly;
const rwClient = client.readWrite;

let mentionsCallRetry = 0;

function generateRandomVideoPath() {
  const path = process.env.MEDIA_PATH || './assets/media';
  const max = fs.readdirSync(path).length -1; //Incluye archivo extra .DS_Store
  const random = Math.floor(Math.random() * max);
  return `./assets/media/${random}.mp4`;
}

function addTextToVideo(videoPath, text, outputPath) {
  return new Promise((resolve, reject) => {
    // Divide el texto en líneas
    const maxLength = 40;
    const lines = [];
    while (text.length > maxLength) {
      const spaceIndex = text.lastIndexOf(' ', maxLength);
      lines.push(text.substring(0, spaceIndex));
      text = text.substring(spaceIndex + 1);
    }
    lines.push(text);

    const textFilter = lines
      .map((line, index) =>
        `drawtext=text='${line}':x=(w/2)-(tw/2):y=(h/2)-(th/2)+(${index*30}):fontcolor=white:fontsize=24:fontfile=./assets/fonts/PermanentMarker-Regular.ttf:borderw=3`
      )
      .join(',');

    ffmpeg(videoPath)
      .outputOptions(['-vf', textFilter])
      .on('end', () => {
        resolve(videoPath);
      })
      .on('error', (err) => {
        reject(err);
      })
      .save(outputPath);
  });
}

async function uploadVideoToTwitter(videoPath) {
  try {
    return await client.v1.uploadMedia(videoPath, { type: 'video/mp4' });
  } catch (error) {
    console.error('Error al subir el vídeo:', error);
  }
}

async function replyToTweet(tweetId, text, mediaId) {
  try {
    const tweet = await rwClient.v1.reply(tweetId, text, { media_ids: mediaId });
  } catch (error) {
    console.error('Error al responder al tweet:', error);
  }
}

async function getMentions( userId = process.env.TWITTER_USER_ID) {
  try {
    const date = moment(new Date()).subtract(1, 'day').format('YYYY-MM-DD');

    const mentions = await rClient.v2.userMentionTimeline(userId, {start_time: date});

    if (!mentions) {
      mentionsCallRetry++;

      if (mentionsCallRetry === 2) {
        console.log('No hay menciones');
        return [];
      }

      getUserId().then((id) => {
        getMentions(id);
      });
    }

    if (mentions) {
      for (const mention of mentions) {
        console.log(mention);
      }

      return mentions;
    }

  } catch (error) {
    console.error('Error al obtener las menciones:', error);
  }

}

async function getUserId() {
  try {
    const username = 'arielGFalcon';
    const user = await rClient.v2.userByUsername(username);

    return user.data.id;
  } catch (error) {
    console.error('Error al obtener el user_id:', error);
  }
}


addTextToVideo(generateRandomVideoPath(), 'Texto de prueba un poco largo como si fuera tweet. Más largo aún el texto con esta nueva línea y "comillas"', './output.mp4')
  .then((videoPath) => {
    console.log(`Video saved to ${videoPath}`);
  }).catch((err) => {
    console.error(err);
  }
);

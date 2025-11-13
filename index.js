const express = require('express');
const bodyParser = require('body-parser');
const db = require('./models');
const { Op } = require('sequelize');
const axios = require('axios');

const IOS_TOP_URL = 'https://wizz-technical-test-dev.s3.eu-west-3.amazonaws.com/ios.top100.json';
const ANDROID_TOP_URL = 'https://wizz-technical-test-dev.s3.eu-west-3.amazonaws.com/android.top100.json';

const app = express();

app.use(bodyParser.json());
app.use(express.static(`${__dirname}/static`));

const pickFirstValue = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== '') {
      return candidate;
    }
  }
  return null;
};

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  if (payload?.games && Array.isArray(payload.games)) return payload.games;
  return [];
};

const mapGamePayload = (game, platform) => {
  const rawStoreId = pickFirstValue(
    game.storeId,
    game.store_id,
    game.app_id,
    game.id,
    game.appId,
    game.package_name,
    game.packageName,
    game.bundle_id,
    game.bundleId
  );

  return {
    publisherId: pickFirstValue(game.publisherId, game.publisher_id)?.toString() || null,
    name: game.name || '',
    platform,
    storeId: rawStoreId !== null ? rawStoreId.toString() : null,
    bundleId: pickFirstValue(game.bundleId, game.bundle_id)?.toString() || null,
    appVersion: pickFirstValue(game.appVersion, game.app_version, game.version)?.toString() || null,
    isPublished: game.isPublished !== undefined ? game.isPublished : true
  };
};

app.get('/api/games', (req, res) => db.Game.findAll()
  .then(games => res.send(games))
  .catch((err) => {
    console.log('There was an error querying games', JSON.stringify(err));
    return res.send(err);
  }));

app.post('/api/games/search', (req, res) => {
  const { name, platform } = req.body;

  const whereClause = {};

  // add platform to where clause if it is provided
  if (platform && platform.trim() !== '') {
    whereClause.platform = platform.trim().toLowerCase();
  }

  // add name to where clause if it is provided
  if (name && name.trim() !== '') {
    whereClause.name = { 
      [Op.like]: `%${name.trim()}%`
    };
  }

  return db.Game.findAll({ where: whereClause })
    .then(games => res.send(games))
    .catch((err) => {
      console.log('There was an error searching games', JSON.stringify(err));
      return res.status(400).send(err);
    });
});

app.post('/api/games', (req, res) => {
  const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
  return db.Game.create({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
    .then(game => res.send(game))
    .catch((err) => {
      console.log('***There was an error creating a game', JSON.stringify(err));
      return res.status(400).send(err);
    });
});

app.delete('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then(game => game.destroy({ force: true }))
    .then(() => res.send({ id }))
    .catch((err) => {
      console.log('***Error deleting game', JSON.stringify(err));
      res.status(400).send(err);
    });
});

app.put('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then((game) => {
      const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
      return game.update({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
        .then(() => res.send(game))
        .catch((err) => {
          console.log('***Error updating game', JSON.stringify(err));
          res.status(400).send(err);
        });
    });
});

app.post('/api/games/populate', async (req, res) => {
  try {
    
    const [iosResponse, androidResponse] = await Promise.all([
      axios.get(IOS_TOP_URL),
      axios.get(ANDROID_TOP_URL)
    ]);

    const iosArray = normalizeArray(iosResponse.data);
    const androidArray = normalizeArray(androidResponse.data);

    // Flatten arrays: if each element is itself an array, extract the objects
    const flattenArray = (arr) => {
      if (arr.length === 0) return arr;
      // If first element is an array, flatten it
      if (Array.isArray(arr[0])) {
        return arr.flat();
      }
      return arr;
    };

    const iosFlattened = flattenArray(iosArray);
    const androidFlattened = flattenArray(androidArray);

    const iosMapped = iosFlattened.map(game => mapGamePayload(game, 'ios'));
    const androidMapped = androidFlattened.map(game => mapGamePayload(game, 'android'));

    const allGames = [...iosMapped, ...androidMapped];
    const validGames = allGames.filter(game => game.storeId);

    if (validGames.length !== allGames.length) {
      console.log('Games skipped due to missing storeId:', allGames.length - validGames.length);
    }

    let createdCount = 0;
    for (const gameData of validGames) {
      const [game, created] = await db.Game.findOrCreate({
        where: {
          storeId: gameData.storeId,
          platform: gameData.platform
        },
        defaults: gameData
      });
      if (created) {
        createdCount += 1;
      }
    }

    return res.send({
      message: 'Successfully populated database',
      totalProcessed: allGames.length,
      validProcessed: validGames.length,
      created: createdCount,
      skipped: validGames.length - createdCount
    });
  } catch (err) {
    console.log('There was an error populating games', err);
    return res.status(500).send({
      error: 'Failed to populate games',
      details: err.message
    });
  }
});


app.listen(3000, () => {
  console.log('Server is up on port 3000');
});

module.exports = app;

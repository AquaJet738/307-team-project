const axios = require("axios");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (fetchFunction, retries = 5, attempt = 0) => {
  try {
    console.log(`Attempt ${attempt + 1}...`);
    const response = await fetchFunction();

    // check if the response contains an error
    if (response && response.status === 429 && attempt < retries) {
      // rate limited
      const retryAfter = response.headers["retry-after"]
        ? parseInt(response.headers["retry-after"], 10) * 1000
        : Math.pow(2, attempt) * 1000; // exponential backoff

      console.warn(`Rate limited. Retrying after ${retryAfter} ms...`);
      await delay(retryAfter);
      return fetchWithRetry(fetchFunction, retries, attempt + 1);
    }

    return response.data;
  } catch (error) {
    const status = error.response ? error.response.status : null;

    if (status === 429 && attempt < retries) {
      // rate limited
      const retryAfter = error.response.headers["retry-after"]
        ? parseInt(error.response.headers["retry-after"], 10) * 1000
        : Math.pow(2, attempt) * 1000; // exponential backoff

      console.warn(`Rate limited. Retrying after ${retryAfter} ms...`);
      await delay(retryAfter);
      return fetchWithRetry(fetchFunction, retries, attempt + 1);
    } else {
      console.error("Error fetching data:", error.message);
      throw error;
    }
  }
};

const getTopNArtists = async (accessToken, maxArtists, time_range) => {
  const limit = 50; // maximum allowed by Spotify API per request
  let allArtists = [];

  console.log("Getting top artists...");

  const fetchArtists = (offset) => {
    const url = `https://api.spotify.com/v1/me/top/artists`;
    return axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        time_range,
        limit,
        offset,
      },
    });
  };

  // fetch the first batch to get the total number of available items
  const firstResponse = await fetchWithRetry(() => fetchArtists(0));

  allArtists = firstResponse.items;
  const totalAvailable = firstResponse.total;

  if (allArtists.length >= maxArtists || totalAvailable <= limit) {
    return allArtists.slice(0, maxArtists);
  }

  // calculate the number of batches needed
  const totalToFetch = Math.min(maxArtists, totalAvailable);
  const batchesNeeded = Math.ceil(totalToFetch / limit);

  // generate an array of offsets for remaining batches
  const offsets = [];
  for (let i = 1; i < batchesNeeded; i++) {
    offsets.push(i * limit);
  }

  // fetch the remaining batches in parallel
  const fetchPromises = offsets.map((offset) =>
    fetchWithRetry(() => fetchArtists(offset))
  );

  const responses = await Promise.all(fetchPromises);

  for (const response of responses) {
    allArtists = allArtists.concat(response.items);
    if (allArtists.length >= maxArtists) {
      break;
    }
  }

  return allArtists.slice(0, maxArtists);
};

const getTopNTracks = async (accessToken, maxTracks, time_range) => {
  const limit = 50; // maximum allowed by Spotify API per request
  let allTracks = [];

  console.log("Getting top tracks...");

  const fetchTracks = (offset) => {
    const url = `https://api.spotify.com/v1/me/top/tracks`;
    return axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        time_range,
        limit,
        offset,
      },
    });
  };

  // fetch the first batch to get the total number of available items
  const firstResponse = await fetchWithRetry(() => fetchTracks(0));

  allTracks = firstResponse.items;
  const totalAvailable = firstResponse.total;

  if (allTracks.length >= maxTracks || totalAvailable <= limit) {
    return allTracks.slice(0, maxTracks);
  }

  // calculate the number of batches needed
  const totalToFetch = Math.min(maxTracks, totalAvailable);
  const batchesNeeded = Math.ceil(totalToFetch / limit);

  // generate an array of offsets for remaining batches
  const offsets = [];
  for (let i = 1; i < batchesNeeded; i++) {
    offsets.push(i * limit);
  }

  // fetch the remaining batches in parallel
  const fetchPromises = offsets.map((offset) =>
    fetchWithRetry(() => fetchTracks(offset))
  );

  const responses = await Promise.all(fetchPromises);

  for (const response of responses) {
    allTracks = allTracks.concat(response.items);
    if (allTracks.length >= maxTracks) {
      break;
    }
  }

  return allTracks.slice(0, maxTracks);
};

const getTopNAlbums = async (accessToken, maxAlbums, tracks) => {
  // get the album IDs from the given tracks
  const albumIds = tracks.map((track) => track.album.id);

  // get the scores (how much the user listened) for each album
  const idScores = albumIds.reduce((acc, id, index) => {
    // albums at the beginning of the list have a higher score
    const score = Math.pow(albumIds.length - index, 5);
    acc[id] = (acc[id] || 0) + score;
    return acc;
  }, {});

  // sort and only take the top N albums
  let sortedIds = Object.keys(idScores).sort(
    (a, b) => idScores[b] - idScores[a]
  );

  sortedIds = sortedIds.slice(0, maxAlbums);

  const uniqueAlbumIds = sortedIds;

  console.log(`Total unique album IDs: ${uniqueAlbumIds.length}`);

  // batch album IDs into groups of up to 20 (Spotify allows max 20 IDs per request)
  const batches = [];
  const batchSize = 20;

  for (let i = 0; i < uniqueAlbumIds.length; i += batchSize) {
    batches.push(uniqueAlbumIds.slice(i, i + batchSize));
  }

  console.log(`Number of batches: ${batches.length}`);

  const fetchAlbums = (ids) => {
    const url = `https://api.spotify.com/v1/albums`;
    return axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        ids: ids.join(","),
      },
    });
  };

  // fetch all batches in parallel
  const fetchPromises = batches.map((batchIds) =>
    fetchWithRetry(() => fetchAlbums(batchIds))
  );

  const responses = await Promise.all(fetchPromises);

  // map album IDs to album objects
  const albumMap = {};
  responses.forEach((response) => {
    response.albums.forEach((album) => {
      albumMap[album.id] = album;
    });
  });

  // reconstruct the sorted album list
  const sortedAlbums = uniqueAlbumIds.map((id) => albumMap[id]);

  // filter albums that are too short (singles basically)
  const filteredAlbums = sortedAlbums.filter(
    (album) => album && album.total_tracks > 2
  );

  return filteredAlbums;
};

const getUsersGeneralGenrePercentage = (artists) => {
  const genreCounts = {};

  artists.forEach((artist) => {
    artist.genres.forEach((genre) => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
  });

  const totalGenres = Object.values(genreCounts).reduce((a, b) => a + b, 0);

  const genrePercentages = Object.keys(genreCounts).map((genre) => ({
    genre,
    percentage: ((genreCounts[genre] / totalGenres) * 100).toFixed(2),
  }));

  // sort genres by percentage in descending order
  genrePercentages.sort((a, b) => b.percentage - a.percentage);

  return genrePercentages;
};

module.exports = {
  getTopNArtists,
  getTopNTracks,
  getTopNAlbums,
  getUsersGeneralGenrePercentage,
};
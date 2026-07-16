import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 60 });

export async function getOrSetCache(key, callback) {
  const cacheData = cache.get(key);

  if (cacheData) {
    console.log("Cache data hit", key);
    return cacheData;
  }

  console.log("Database hit", key);

  const freshData = await callback();

  cache.set(key, freshData);

  return freshData;
}

export function deleteCache(key) {
  cache.del(key);
}

export default cache;

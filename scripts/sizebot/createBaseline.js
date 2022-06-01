import fs from 'fs';

import glob from 'glob';
import { gzipSizeSync } from 'gzip-size';

function calcGzipSize(filePath) {
  try {
    const file = fs.readFileSync(filePath, 'utf8');
    return gzipSizeSync(file);
  } catch (e) {
    console.error('Failed to calc gzip size for ', filePath);
    console.error(e);
  }
}

const createBaseline = async () => {
  glob('dist/**/*.js', {}, function (er, files) {
    const currentSizes = {};

    files.forEach((path) => {
      const size = calcGzipSize(path);

      currentSizes[path.replace('dist/', '')] = size;
    });

    fs.writeFile('./scripts/sizebot/sizebot.json', JSON.stringify(currentSizes), console.error);
  });
};

(async () => {
  await createBaseline();
})();

export default createBaseline;

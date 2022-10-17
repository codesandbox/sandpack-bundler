const fs = require('fs/promises');
const path = require('path');

const removeSolidBabelFromMinimalBabelReactWorker = async () => {
  const files = await fs.readdir(`./dist`);

  files.forEach(async (file) => {
    if (/babel\-minimal\-worker\.min.(.+)\.js/.test(file)) {
      const content = await fs.readFile(path.join('dist', file), 'utf8');
      const toBeRemoved = new RegExp("importScripts('./babel-preset-solid.(.+).js')");

      const newContent = content.replace(toBeRemoved, '');
      await fs.writeFile(path.join('dist', file), newContent);
    }
  });
};

removeSolidBabelFromMinimalBabelReactWorker();

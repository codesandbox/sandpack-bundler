import { Octokit } from '@octokit/rest';
import fetch from 'node-fetch';

import createBaseline from './createBaseline.js';

const octokit = new Octokit({
  auth: process.env.GH_TOKEN,
});

function format(bytes) {
  var sizes = ['bytes', 'kb', 'mb'];
  if (bytes === 0) return '0 byte';
  var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

const ratio = (base, current) => {
  let diff = current - base;
  if (current === base || Math.abs(diff) < 3) return `✅ ${format(0)}`;

  let ratioAmount = (((base - current) / base) * -100).toFixed(2);

  if (current > base) return `⚠️ +${format(diff)} (+${ratioAmount}%)`;

  ratioAmount = (((base - current) / base) * 100).toFixed(2);
  diff = base - current;

  if (current < base) return `🎉 -${format(diff)} (-${ratioAmount}%)`;

  return diff;
};

const findComment = async (parameters) => {
  for await (const { data: comments } of octokit.paginate.iterator(octokit.rest.issues.listComments, parameters)) {
    const comment = comments.find((comment) => comment.body.includes('Size changes'));
    if (comment) return comment;
  }
};

/**
 * Main func
 */
(async () => {
  const currentSizes = await createBaseline();

  const loadBaseFile = async () => {
    const data = await fetch(
      'https://raw.githubusercontent.com/codesandbox/sandpack-bundler/main/scripts/sizebot/sizebot.json'
    );
    return await data.json();
  };
  const baseSizes = await loadBaseFile();

  const removedFiles = Object.keys(baseSizes)
    .map((base) => {
      const fileStillExist = currentSizes[base];
      if (fileStillExist) return undefined;

      return `| \`${base}\` | ${format(baseSizes[base])} | File removed | ⚠️ | \n`;
    })
    .filter(Boolean);

  const tableContent = Object.keys(currentSizes).map((currentName) => {
    const baseFile = baseSizes[currentName];

    if (!baseFile) {
      return `| \`${currentName}\` | New file | ${format(currentSizes[currentName])} | ⚠️ | \n`;
    }

    const baseSize = baseSizes[currentName];
    const currentFormat = format(currentSizes[currentName]);
    const baseFormat = format(baseSize);
    const ratioFormat = ratio(baseSize, currentSizes[currentName]);

    return `| \`${currentName}\` | ${baseFormat} | ${currentFormat} |  ${ratioFormat} | \n`;
  });

  const sumBase = Object.values(baseSizes).reduce((p, c) => p + c, 0);
  const sumCurrent = Object.values(currentSizes).reduce((p, c) => p + c, 0);

  const baseFormat = format(sumBase);
  const currentFormat = format(sumCurrent);

  // Future usage
  //   <details>
  //   <summary>Details</summary>
  //  | Dependency name / file | Base | Current | +/- |
  //  | - | - | - | - |
  //  ${removedFiles.join('')}${tableContent.join('')} \n\n
  //  </details>

  const content = `## Size changes

  | Total base (gzip) | Total current (gzip) | +/- |
  | - | - | - |
  | ${baseFormat} | ${currentFormat} | ${ratio(sumBase, sumCurrent)} |
`;

  /**
   * Creating comment
   */
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
  const issue_number = process.env.GITHUB_REF.split('refs/pull/')[1].split('/')[0];

  const comment = await findComment({ owner, repo, issue_number });

  if (comment) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: comment.id,
      body: content,
    });
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body: content,
    });
  }
})();

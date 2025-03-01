const { fetchWithRetry } = require('./lib/fetch-retry');
const { createReadlineInterfaceFromResponse } = require('./lib/fetch-remote-text-by-line');
const path = require('path');
const { isIPv4, isIPv6 } = require('net');
const { withBannerArray } = require('./lib/with-banner');
const { processLine } = require('./lib/process-line');
const { compareAndWriteFile } = require('./lib/string-array-compare');

(async () => {
  console.time('Total Time - build-telegram-cidr');

  /** @type {Response} */
  const resp = await fetchWithRetry('https://core.telegram.org/resources/cidr.txt');
  const lastModified = resp.headers.get('last-modified');
  const date = lastModified ? new Date(lastModified) : new Date();

  /** @type {string[]} */
  const results = [];

  for await (const line of createReadlineInterfaceFromResponse(resp)) {
    const cidr = processLine(line);
    if (cidr) {
      const [subnet] = cidr.split('/');
      if (isIPv4(subnet)) {
        results.push(`IP-CIDR,${cidr},no-resolve`);
      }
      if (isIPv6(subnet)) {
        results.push(`IP-CIDR6,${cidr},no-resolve`);
      }
    }
  }

  if (results.length === 0) {
    throw new Error('Failed to fetch data!');
  }

  await compareAndWriteFile(
    withBannerArray(
      'Sukka\'s Surge Rules - Telegram IP CIDR',
      [
        'License: AGPL 3.0',
        'Homepage: https://ruleset.skk.moe',
        'GitHub: https://github.com/SukkaW/Surge',
        'Data from:',
        ' - https://core.telegram.org/resources/cidr.txt'
      ],
      date,
      results
    ),
    path.resolve(__dirname, '../List/ip/telegram.conf')
  );

  console.timeEnd('Total Time - build-telegram-cidr');
})();

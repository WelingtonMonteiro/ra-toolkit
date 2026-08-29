/**
 * Console id to name/icon lookup for game rows.
 */

export function getConsoleInfo(consoleId) {
  var entry = consoleIdMap[consoleId];
  if (entry) {
    return {
      shortName: entry.s,
      iconUrl: 'https://static.retroachievements.org/assets/images/system/' + entry.i + '.png'
    };
  }
  return { shortName: '', iconUrl: 'https://static.retroachievements.org/assets/images/system/unknown.png' };
}

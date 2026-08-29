/**
 * Formatting speedrun times and turning video links into embeds.
 */

export function parseIso8601(time) {
  var parsed = "";
  let regex = /(-)?P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/;
  let groups = regex.exec(time);
  if (groups[6] != undefined) parsed += groups[6] + "h ";
  if (groups[7] != undefined) parsed += groups[7] + "m ";
  if (groups[8] != undefined) parsed += groups[8] + "s ";
  return parsed;
}

export function toEmbedUrl(url) {
  if (url.includes("twitch") || url.includes("youtu")) {
    var regexYoutube = /(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)?([^\s&]+)/;
    var regexTwitch = /(?:https?:\/{2})?www\.twitch\.tv\/(?:[\S]+\/)?([\]?)?\/([\d]+)/;
    if (url.match(regexYoutube) != undefined) {
      return "https://www.youtube.com/embed/" + url.match(regexYoutube)[1];
    } else if (url.match(regexTwitch) != undefined) {
      return "https://player.twitch.tv/?video=" + url.match(regexTwitch)[2] + "&parent=retroachievements.org&autoplay=false";
    }
  }
  return "";
}

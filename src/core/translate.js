/**
 * MyMemory translation with a daily character budget.
 */

import { gmFetch } from './gm.js';

// =========================================
//   MyMemory Translation with Rate Limiter
// =========================================
export var TRANSLATE_DAILY_LIMIT = 5000; // MyMemory free tier: 5000 chars/day

export function getTodayKey() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function getTranslateUsage() {
  return Promise.resolve(GM_getValue('translateUsage', null)).then(function (val) {
    if (val && val.date === getTodayKey()) return val;
    return { date: getTodayKey(), chars: 0 };
  });
}

export function addTranslateUsage(charCount) {
  return getTranslateUsage().then(function (usage) {
    usage.chars += charCount;
    GM_setValue('translateUsage', usage);
    return usage;
  });
}

export function translateWithRateLimit(text, targetLang) {
  return getTranslateUsage().then(function (usage) {
    var remaining = TRANSLATE_DAILY_LIMIT - usage.chars;
    if (remaining <= 0) {
      return Promise.reject(new Error('RATE_LIMIT: Daily translation limit reached (' + TRANSLATE_DAILY_LIMIT + ' chars). Resets tomorrow.'));
    }
    if (text.length > remaining) {
      return Promise.reject(new Error('RATE_LIMIT: Text too long (' + text.length + ' chars). Only ' + remaining + ' chars remaining today.'));
    }
    var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=en|' + encodeURIComponent(targetLang.split('-')[0]);
    return gmFetch(url, 10000).then(function (resp) {
      var data = JSON.parse(resp.responseText);
      if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
        addTranslateUsage(text.length);
        return data.responseData.translatedText;
      }
      throw new Error(data.responseDetails || 'Translation failed');
    });
  });
}

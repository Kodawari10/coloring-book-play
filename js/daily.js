/* Today's page and the little streak of days you come back.
   Pure helpers. The book stores the days on the same save as the coloring. */
(function () {
  'use strict';

  var DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function isDate(date) {
    return !!date && typeof date.getTime === 'function' && typeof date.getFullYear === 'function' && !isNaN(date.getTime());
  }

  function key(date) {
    if (!isDate(date)) return '';
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function realDay(text) {
    var m = DAY_RE.exec(text);
    if (!m) return false;
    var y = Number(m[1]);
    var mo = Number(m[2]);
    var d = Number(m[3]);
    var dt = new Date(y, mo - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
  }

  function asKey(date) {
    if (typeof date === 'string') return realDay(date) ? date : '';
    return key(date);
  }

  function hash(text) {
    var n = 5381;
    for (var i = 0; i < text.length; i++) n = ((n * 33) ^ text.charCodeAt(i)) >>> 0;
    return n;
  }

  function page(pages, date) {
    if (!pages || !pages.length) return null;
    var k = asKey(date);
    if (!k) return pages[0];
    return pages[hash(k) % pages.length];
  }

  function clean(raw, limit) {
    var cap = typeof limit === 'number' && limit > 0 ? Math.floor(limit) : 60;
    var set = [];
    var seen = {};
    if (raw && typeof raw.length === 'number') {
      for (var i = 0; i < raw.length; i++) {
        var item = raw[i];
        if (typeof item !== 'string' || !realDay(item) || seen[item]) continue;
        seen[item] = true;
        set.push(item);
      }
    }
    set.sort();
    if (set.length > cap) set = set.slice(set.length - cap);
    return set;
  }

  function remember(days, date, limit) {
    var k = asKey(date);
    var list = [];
    if (days && typeof days.length === 'number') {
      for (var i = 0; i < days.length; i++) list.push(days[i]);
    }
    if (k) list.push(k);
    return clean(list, limit);
  }

  /* An older save has no days, or a few strings that are not dates. Keep the real ones and add today. */
  function adopt(saved, date, limit) {
    return remember(clean(saved, limit), date, limit);
  }

  function cursorFrom(date) {
    if (typeof date === 'string') {
      if (!realDay(date)) return null;
      var m = DAY_RE.exec(date);
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    if (isDate(date)) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    return null;
  }

  function streak(days, date) {
    var kept = clean(days, 400);
    var have = {};
    for (var i = 0; i < kept.length; i++) have[kept[i]] = true;
    var cursor = cursorFrom(date);
    if (!cursor) return 0;
    var n = 0;
    while (n < 400 && have[key(cursor)]) {
      n += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return n;
  }

  function streakLabel(n) {
    var days = typeof n === 'number' && n > 1 ? Math.floor(n) : 1;
    if (days <= 1) return 'Day 1 with the book';
    return days + ' days in a row';
  }

  function note(name, finished, isToday) {
    var who = name || 'This page';
    var n = typeof finished === 'number' && finished > 0 ? Math.floor(finished) : 0;
    if (isToday) {
      if (n <= 1) return who + " was today's friend, and the first gold star.";
      return who + " was today's friend. All colored!";
    }
    if (n <= 1) return who + ' got the first gold star.';
    if (n === 2) return 'Two pictures done. ' + who + ' looks so cozy.';
    if (n < 5) return who + ' is glowing.';
    if (n < 10) return n + ' pictures done. The book is smiling.';
    return n + ' pictures finished. ' + who + ' joined them.';
  }

  window.CB_DAY = {
    key: key,
    page: page,
    clean: clean,
    remember: remember,
    adopt: adopt,
    streak: streak,
    streakLabel: streakLabel,
    note: note,
  };
})();

import { beforeEach, describe, expect, it } from 'vitest';

import { commentList } from './fixtures/raweb.js';
import { currentVersion, flush, loadToolkit, navigate, waitFor } from './helpers/harness.js';

/**
 * Comments are rendered by CommentList/CommentListItem.tsx: a
 * `ul.highlighted-list` of `li`s whose body is a `<p style="word-break: ...">`.
 * The legacy Blade wall (components/comment/list.blade.php) uses
 * `.commentscomponent tr.comment` instead, so both shapes are covered.
 */

let api;
let store;

function legacyWall(body) {
  return (
    '<div class="commentscomponent"><table><tbody>' +
    '<tr class="comment group"><td class="w-full">' +
    '<div><span class="smalldate">2 days ago</span></div>' +
    `<div style="word-break: break-word;">${body}</div>` +
    '</td></tr></tbody></table></div>'
  );
}

beforeEach(() => {
  store = { lastSeenVersion: currentVersion(), translateLang: 'pt-BR' };
  ({ api } = loadToolkit({
    url: 'https://retroachievements.org/user/Welington',
    store,
    respond: (options) =>
      options.url.includes('mymemory')
        ? {
            status: 200,
            responseText: JSON.stringify({
              responseStatus: 200,
              responseData: { translatedText: 'Olá mundo' },
            }),
          }
        : null,
  }));
});

describe('linkify', () => {
  async function linkify(html, path = '/user/Welington') {
    document.body.innerHTML = `<main>${html}</main>`;
    navigate(path);
    api.initWallLinkify();
    await waitFor(() => document.querySelector('[data-enhanced-linkified]'), { timeout: 3000 });
  }

  it('turns bare URLs into links on the React comment list', async () => {
    await linkify(commentList(['Guide here: https://example.com/guide']));

    const link = document.querySelector('a.enhanced-wall-link');
    expect(link).not.toBeNull();
    expect(link.href).toBe('https://example.com/guide');
    expect(link.target).toBe('_blank');
  });

  it('works on the legacy Blade wall too', async () => {
    await linkify(legacyWall('See https://retroachievements.org/game/1'));

    expect(document.querySelector('a.enhanced-wall-link')).not.toBeNull();
  });

  it('embeds YouTube links', async () => {
    await linkify(commentList(['https://www.youtube.com/watch?v=dQw4w9WgXcQ']));

    const embed = document.querySelector('.enhanced-yt-embed iframe');
    expect(embed).not.toBeNull();
    expect(embed.src).toContain('dQw4w9WgXcQ');
  });

  it('embeds youtu.be short links', async () => {
    await linkify(commentList(['clip: https://youtu.be/dQw4w9WgXcQ']));

    expect(document.querySelector('.enhanced-yt-embed iframe').src).toContain('dQw4w9WgXcQ');
  });

  it('previews image links', async () => {
    await linkify(commentList(['https://media.retroachievements.org/Images/1.png']));

    const preview = document.querySelector('img.enhanced-img-preview');
    expect(preview).not.toBeNull();
    expect(preview.src).toContain('/Images/1.png');
  });

  it('leaves plain comments untouched', async () => {
    await linkify(commentList(['no links here']));

    expect(document.querySelector('a.enhanced-wall-link')).toBeNull();
    expect(document.querySelector('li p').textContent).toBe('no links here');
  });

  it('processes each comment only once', async () => {
    await linkify(commentList(['https://example.com/a']));
    api.initWallLinkify();
    await flush(30);

    expect(document.querySelectorAll('a.enhanced-wall-link')).toHaveLength(1);
  });

  it('also runs on achievement pages', async () => {
    await linkify(commentList(['https://example.com/a']), '/achievement/42');

    expect(document.querySelector('a.enhanced-wall-link')).not.toBeNull();
  });

  it('stays off unrelated pages', async () => {
    document.body.innerHTML = `<main>${commentList(['https://example.com/a'])}</main>`;
    navigate('/game/1');

    api.initWallLinkify();
    await flush(50);

    expect(document.querySelector('a.enhanced-wall-link')).toBeNull();
  });
});

describe('comment translation', () => {
  async function renderWall(html = commentList(['Hello world'])) {
    document.body.innerHTML = `<main>${html}</main>`;
    navigate('/user/Welington');
    const pending = api.initWallTranslation();
    await waitFor(() => document.querySelector('.enhanced-wall-translate-btn'), { timeout: 3000 });
    await pending;
  }

  it('adds a translate button after each comment body', async () => {
    await renderWall();

    const button = document.querySelector('.enhanced-wall-translate-btn');
    expect(button).not.toBeNull();
    expect(button.previousElementSibling.tagName).toBe('P');
    expect(button.title).toContain('pt-BR');
  });

  it('translates on click and toggles back to the original', async () => {
    await renderWall();
    const button = document.querySelector('.enhanced-wall-translate-btn');
    const body = document.querySelector('li p');

    button.click();
    await waitFor(() => body.textContent === 'Olá mundo');
    expect(button.innerHTML).toContain('Original');

    button.click();
    expect(body.textContent).toBe('Hello world');
  });

  it('counts translated characters against the daily budget', async () => {
    await renderWall();

    document.querySelector('.enhanced-wall-translate-btn').click();
    await waitFor(() => store.translateUsage?.chars === 'Hello world'.length);
  });

  it('refuses to translate comments over the 500 character limit', async () => {
    await renderWall(commentList(['x'.repeat(501)]));

    const button = document.querySelector('.enhanced-wall-translate-btn');
    expect(button.className).toContain('disabled');
    expect(button.innerHTML).toContain('Too long');
  });
});

// Simulated DOM integration.
// GPU, green sampling, native reconnect, analysis and licensing are mocks.

import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { IDBFactory } from 'fake-indexeddb';
import * as T from '../src/timeline.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function until(check) {
  for (let n = 0; n < 200; n++) {
    if (check()) return;
    await sleep(20);
  }
  throw Error('Workflow condition timed out');
}

test(
  'Styles, cut transition picker, track volume and Auto Edit save-copy flow work together',
  async () => {
    let p = T.emptyProject();
    p.name = 'Original';
    p.media = [
      { id: 'main', type: 'video', name: 'Main.mp4', duration: 10 },
      { id: 'bg', type: 'image', name: 'Street.png', duration: 10 },
      { id: 'music', type: 'audio', name: 'Music.wav', duration: 10 },
      { id: 'logo', type: 'image', name: 'Logo.png', duration: 10 },
    ].map(m => ({
      ...m,
      sourcePath: '/mock/' + m.name,
      size: 100,
    }));

    p = T.addMediaClip(p, 'main', 'V1', 0);
    p = T.splitClips(p, p.clips[0].id, 5);

    const db = new IDBFactory();

    await new Promise((resolve, reject) => {
      const request = db.open('rancut-projects', 2);

      request.onupgradeneeded = () => {
        request.result.createObjectStore('catalog');
        request.result.createObjectStore('projects');
      };

      request.onsuccess = () => {
        const tx = request.result.transaction('catalog', 'readwrite');
        tx.objectStore('catalog').put(
          {
            id: 'original',
            name: 'Original',
            project: p,
            backups: [],
            createdAt: 1,
            updatedAt: 1,
          },
          'original',
        );

        tx.oncomplete = () => {
          request.result.close();
          resolve();
        };

        tx.onerror = () => reject(tx.error);
      };

      request.onerror = () => reject(request.error);
    });

    const bundled = await build({
      entryPoints: ['src/main.jsx'],
      bundle: true,
      write: false,
      outdir: 'unused',
      format: 'iife',
      logLevel: 'silent',
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      plugins: [
        {
          name: 'mock-platform',
          setup(b) {
            b.onLoad({ filter: /renderer\.js$/ }, () => ({
              loader: 'js',
              contents: `
                export class Renderer {
                  gpuInfo() { return { renderer: "Mock" }; }
                  pause() {}
                  resetMedia() {}
                  dispose() {}
                  draw() { return Promise.resolve(); }
                  meter() { return -60; }
                }
              `,
            }));

            b.onLoad({ filter: /auto-edit\.js$/ }, async args => ({
              loader: 'js',
              contents:
                (await readFile(args.path, 'utf8')).split(
                  'export async function sampleGreen',
                )[0] +
                'export async function sampleGreen(){return "#147014";}',
            }));
          },
        },
      ],
    });

    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => errors.push(error.message));

    const dom = new JSDOM('<div id="root"></div>', {
      url: 'http://127.0.0.1:5174',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      virtualConsole,
    });

    const w = dom.window;
    const d = w.document;

    w.HTMLMediaElement.prototype.load = function () {};

    const analysis = {
      levels: Array.from(
        { length: 200 },
        (_, i) => (i >= 60 && i < 100 ? -65 : -25),
      ),
      windowSec: 0.05,
      peaks: [-0.1, 0.1],
      peakStep: 0.005,
    };

    let trialRequests = 0;

    const jsonResponse = data => ({
      ok: true,
      status: 200,
      json: async () => data,
    });

    // All requests stay mocked. This test never contacts Supabase.
    const mockFetch = async (url, options = {}) => {
      const address = String(url);

      if (address.includes('/functions/v1/license-api')) {
        const body = JSON.parse(options.body || '{}');

        if (body.action === 'consume_trial') {
          trialRequests += 1;

          assert.equal(
            trialRequests,
            1,
            'Only creating the Auto Edit copy should consume a trial use',
          );

          return jsonResponse({
            ok: true,
            allowed: true,
            used: 1,
            remaining: 1,
            monthStart: '2026-09-01',
          });
        }

        if (body.action === 'license_status') {
          return jsonResponse({
            ok: true,
            active: false,
            plan: null,
            expiresAt: null,
          });
        }

        throw Error('Unexpected mocked license action: ' + body.action);
      }

      if (address.includes('analyse')) {
        return jsonResponse(analysis);
      }

      return jsonResponse({
        directory: '/exports',
        ffmpeg: true,
      });
    };

    Object.assign(w, {
      indexedDB: db,
      structuredClone,
      TextEncoder,
      TextDecoder,
      AbortSignal,
      ResizeObserver: class {
        observe() {}
        disconnect() {}
      },
      confirm: () => true,
      fetch: mockFetch,
      rancut: {
        desktop: true,
        onPrepareClose: () => () => {},
        onSuspend: () => () => {},
        reconnect: async items =>
          items.map(m => ({
            mediaId: m.id,
            id: 'server_' + m.id,
            url: 'http://127.0.0.1:5174/mock/' + m.id,
          })),
      },
    });

    w.HTMLCanvasElement.prototype.getContext = () => ({
      drawImage() {},
      scale() {},
      clearRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
    });

    w.HTMLCanvasElement.prototype.toDataURL = () => '';

    w.HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };

    w.HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };

    w.URL.createObjectURL = () => 'blob:mock';
    w.URL.revokeObjectURL = () => {};

    const click = (text, root = d) => {
      const button = [...root.querySelectorAll('button')].find(
        b => b.textContent.trim() === text,
      );
      assert(button, 'Missing ' + text);
      assert(!button.disabled, 'Disabled ' + text);
      button.click();
    };

    const set = (label, value) => {
      const element = d.querySelector('[aria-label="' + label + '"]');
      assert(element, label);

      const proto =
        element.tagName === 'SELECT'
          ? w.HTMLSelectElement.prototype
          : w.HTMLInputElement.prototype;

      Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value);

      element.dispatchEvent(
        new w.Event(element.tagName === 'SELECT' ? 'change' : 'input', {
          bubbles: true,
        }),
      );
    };

    try {
      w.eval(
        bundled.outputFiles.find(file => file.path.endsWith('.js')).text,
      );

      await until(() => d.querySelector('.projectCover'));
      d.querySelector('.projectCover').click();

      await until(
        () => !d.querySelector('.projectHome') && d.querySelector('.clipBox'),
      );
      await sleep(100);

      assert.equal(d.querySelector('.timelineMore'), null);

      const bar = d.querySelector('.editBtns');

      for (const title of [
        'Repeat to end',
        'Extend to end',
        'Close gap',
        'Close all gaps',
        'Select all',
      ]) {
        assert(
          [...bar.querySelectorAll('button')].some(
            button => button.textContent === title,
          ),
          title,
        );
      }

      assert(
        [...bar.querySelectorAll('button')].some(button =>
          button.textContent.includes('From clip'),
        ),
        'From clip to end',
      );

      assert(
        ![...bar.querySelectorAll('button')].some(button =>
          ['Delete', 'Clear'].includes(button.textContent),
        ),
      );

      assert(d.querySelector('[aria-label="Resize media panel"]'));
      assert(d.querySelector('[aria-label="Resize inspector panel"]'));

      const divider = d.querySelector('[aria-label="Resize timeline"]');
      const grid = d.querySelector('.editorGrid');
      const beforeRows = grid.style.gridTemplateRows;

      divider.dispatchEvent(
        new w.MouseEvent('pointerdown', {
          bubbles: true,
          clientY: 450,
        }),
      );

      w.dispatchEvent(new w.MouseEvent('pointermove', { clientY: 390 }));
      w.dispatchEvent(new w.MouseEvent('pointerup'));

      await sleep(20);

      assert.notEqual(grid.style.gridTemplateRows, beforeRows);
      assert(grid.style.gridTemplateRows.includes('370px'));

      click('Styles');
      await until(() => d.querySelectorAll('.stylePreset').length === 2);

      click('Edit', d.querySelector('.stylePreset'));
      await until(() => d.querySelector('.styleEditor'));

      click('Reset to default');
      await sleep(20);
      click('Save style');

      await until(() => !d.querySelector('.styleEditor'));

      click('Apply', d.querySelector('.stylePreset'));
      await until(() => d.querySelectorAll('.clipBox.adjustment').length === 2);

      d.querySelector('.cutTarget').click();
      await until(() => d.querySelector('.workflowDialog[open]'));

      assert(
        d.querySelector('.workflowDialog').textContent.includes('This cut only'),
      );

      set('Transition scope', 'all');
      d.querySelector('[aria-label="Include transition sound"]').click();
      await sleep(30);

      click('Apply transition');
      await until(() => !d.querySelector('.workflowDialog'));

      assert.equal(d.querySelectorAll('.cutTarget.hasTransition').length, 1);
      assert.equal(d.querySelectorAll('.trackLabel').length, 3);

      d.querySelector('[title="Adjust full-track volume"]').click();
      await until(() => d.querySelector('[aria-label="Scoped gain"]'));

      set('Scoped gain', '5');
      await sleep(20);
      click('Apply volume');

      await until(() =>
        d
          .querySelector('.trackName[title="Adjust full-track volume"]')
          .textContent.includes('5 dB'),
      );

      click('Done', d.querySelector('dialog'));
      await until(() => !d.querySelector('dialog'));

      click('\u2726 Auto Edit');
      await until(() => d.querySelector('.autoWizard'));

      click('Next');
      await sleep(20);
      click('Next');
      await sleep(20);

      set('Background', 'bg');
      set('Logo image', 'logo');
      set('Auto Edit style', 'dynamic');
      set('Auto Edit transition', 'whoosh');
      await sleep(20);

      click('Next');
      await sleep(20);

      set('Background music', 'music');
      await sleep(20);

      click('Next');
      await sleep(20);

      click('Analyse & prepare edit');
      await until(() => d.querySelector('.autoSummary'));

      assert(
        d.querySelector('.autoSummary').textContent.includes('2 main clips'),
      );

      click('Generate editable project copy');
      await until(() => !d.querySelector('.autoWizard'));

      assert(d.querySelector('.saveBadge').textContent.includes('Auto Edit'));
      assert.equal(d.querySelectorAll('.trackLabel').length, 6);
      assert.equal(trialRequests, 1);

      click('\u2726 Auto Edit');
      await until(() => d.querySelector('.autoWizard'));

      click('3. Look', d.querySelector('.autoWizard'));
      await sleep(20);

      assert.equal(
        d.querySelector('[aria-label="Auto Edit style"]').value,
        'dynamic',
      );

      d.querySelector('[aria-label="Close Auto Edit"]').click();
      await until(() => !d.querySelector('.autoWizard'));

      d.querySelector('[title="Remove track (keeps original media)"]').click();
      await until(() => d.querySelectorAll('.trackLabel').length === 5);

      d.querySelector('[title="Undo"]').click();
      await until(() => d.querySelectorAll('.trackLabel').length === 6);

      const clipIds = [...d.querySelectorAll('[data-clip]')].map(
        element => element.dataset.clip,
      );

      click('\u2726 Auto Edit');
      await until(() => d.querySelector('.autoWizard'));

      click('4. Sound & cuts', d.querySelector('.autoWizard'));
      await sleep(20);

      set('BGM level (dB)', '-18');
      await sleep(20);

      click('Apply changes');
      await until(() => !d.querySelector('.autoWizard'));

      assert.deepEqual(
        [...d.querySelectorAll('[data-clip]')].map(
          element => element.dataset.clip,
        ),
        clipIds,
      );

      assert(d.body.textContent.includes('BGM \u00b7 -18 dB'));
      assert.equal(
        trialRequests,
        1,
        'Refining an existing Auto Edit must not consume another trial use',
      );

      click('Projects');
      await until(() => d.querySelectorAll('.projectCard').length === 2);

      assert(
        d
          .querySelector('.projectHome')
          .textContent.includes('Original \u2014 Auto Edit'),
      );

      assert.deepEqual(errors, []);
    } catch (error) {
      throw Error(
        error.message +
          '; errors=' +
          JSON.stringify(errors) +
          '; ui=' +
          d.body.textContent.slice(-2000),
      );
    } finally {
      dom.window.close();
    }
  },
);

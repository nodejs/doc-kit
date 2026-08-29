import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolvePipeline } from '../pipeline.mjs';

// Specifiers are deliberately not shorthand names, so they resolve to
// themselves.
const generators = definitions =>
  new Map(
    Object.entries(definitions).map(([name, generator]) => [
      name,
      { name, ...generator },
    ])
  );

const web = {
  source: {},
  parse: { dependsOn: 'source' },
  render: { dependsOn: 'parse' },
  site: { dependsOn: 'render' },
};

describe('resolvePipeline', () => {
  it('reads each generator from its dependency by default', () => {
    const { targets, inputOf } = resolvePipeline(['site'], generators(web));

    assert.deepEqual(targets, ['site']);
    assert.deepEqual(
      [...inputOf],
      [
        ['source', undefined],
        ['parse', 'source'],
        ['render', 'parse'],
        ['site', 'render'],
      ]
    );
  });

  it('splices a generator in front of the consumer of its own input', () => {
    const { targets, inputOf } = resolvePipeline(
      ['splice'],
      generators({
        ...web,
        splice: { dependsOn: 'parse', dependent: 'site' },
      })
    );

    // The run delivers `splice` through `site`
    assert.deepEqual(targets, ['site']);
    assert.equal(inputOf.get('splice'), 'parse');
    assert.equal(inputOf.get('render'), 'splice');
    assert.equal(inputOf.get('site'), 'render');
  });

  it('collects a dependent only once when it is also requested', () => {
    const { targets } = resolvePipeline(
      ['site', 'splice'],
      generators({
        ...web,
        splice: { dependsOn: 'parse', dependent: 'site' },
      })
    );

    assert.deepEqual(targets, ['site']);
  });

  it('chains several generators splicing at the same point', () => {
    const { inputOf } = resolvePipeline(
      ['first', 'second'],
      generators({
        ...web,
        first: { dependsOn: 'parse', dependent: 'site' },
        second: { dependsOn: 'parse', dependent: 'site' },
      })
    );

    assert.equal(inputOf.get('render'), 'first');
    assert.equal(inputOf.get('first'), 'second');
    assert.equal(inputOf.get('second'), 'parse');
  });

  it('can splice a source generator in front of the pipeline root', () => {
    const { inputOf } = resolvePipeline(
      ['feed'],
      generators({ ...web, feed: { dependent: 'site' } })
    );

    assert.equal(inputOf.get('source'), 'feed');
    assert.equal(inputOf.get('feed'), undefined);
  });

  it('leaves unrelated pipelines untouched', () => {
    const { inputOf } = resolvePipeline(
      ['splice', 'other'],
      generators({
        ...web,
        other: { dependsOn: 'parse' },
        splice: { dependsOn: 'parse', dependent: 'site' },
      })
    );

    assert.equal(inputOf.get('other'), 'parse');
  });

  it('delivers through every dependent when none is part of the run', () => {
    const { targets, inputOf } = resolvePipeline(
      ['splice'],
      generators({
        ...web,
        map: { dependsOn: 'parse' },
        splice: { dependsOn: 'parse', dependent: ['site', 'map'] },
      })
    );

    assert.deepEqual(targets, ['site', 'map']);
    assert.equal(inputOf.get('render'), 'splice');
    assert.equal(inputOf.get('map'), 'splice');
  });

  it('delivers only through the dependents already part of the run', () => {
    const { targets, inputOf } = resolvePipeline(
      ['site', 'splice'],
      generators({
        ...web,
        map: { dependsOn: 'parse' },
        splice: { dependsOn: 'parse', dependent: ['site', 'map'] },
      })
    );

    assert.deepEqual(targets, ['site']);
    // The splice still applies to `map`, should anything run it
    assert.equal(inputOf.get('map'), 'splice');
  });

  it('throws when the dependent pipeline never consumes the input', () => {
    assert.throws(
      () =>
        resolvePipeline(
          ['splice'],
          generators({
            ...web,
            aside: {},
            splice: { dependsOn: 'aside', dependent: 'site' },
          })
        ),
      /nothing in that pipeline consumes "aside"/
    );
  });
});

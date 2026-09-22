import test from 'node:test';
import assert from 'node:assert/strict';
import * as m from './model.mjs';
test('workflow invariants and boundary cases',()=>{
for(const preset of ['Original','Performance','League Start','Barebones'])assert.ok(m.plan(m.defaults.assets,preset).changes.filter(a=>a.protected).every(a=>a.after));assert.equal(m.plan(m.defaults.assets,'Original').disabled,0);assert.deepEqual(m.plan(m.defaults.assets,'Barebones').restore,m.defaults.assets.map(({id,enabled})=>({id,enabled})));
});

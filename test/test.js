
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import xmldom from 'xmldom';
import omml2mathml from '../src';

describe('omml2mathml conversion', () => {
  it('converts all the test documents', () => {
    let baseDir = path.join(__dirname, 'fixtures')
      , name = []
      , omml = []
      , html = []
    ;
    fs.readdirSync(baseDir)
      .forEach(f => {
        let abs = path.join(baseDir, f);
        if (/\.omml$/.test(f)) {
          omml.push(fs.readFileSync(abs, 'utf8'));
          name.push(f);
        }
        if (/\.html$/.test(f)) html.push(fs.readFileSync(abs, 'utf8').replace(/ xmlns=".*?"/, ''));
      })
    ;
    omml.forEach((om, idx) => {
      let n = name[idx]
        , doc = new xmldom.DOMParser().parseFromString(om)
        , math = omml2mathml(doc)
      ;
      console.log(`### ${n}`);
      console.log(`math=${math.outerHTML}`);
      console.log(`html=${html[idx]}`);
      assert.equal(html[idx], math.outerHTML, `successful mapping of ${n}`);
    });
  });
});

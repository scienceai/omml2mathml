
let fs = require('fs')
  , path = require('path')
  , assert = require('assert')
  , xmldom = require('xmldom')
  , omml2mathml = require('..')
;

describe('omml2mathml conversion', function () {
  this.timeout(5 * 1000);
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
      assert.equal(cleanup(html[idx]), cleanup(math.outerHTML), `successful mapping of ${n}`);
    });
  });
});

function cleanup (str) {
  return (str || '').replace(/^\s+$/gm, '').replace(/\s+$/gm, '');
}


import Marcheur from 'marcheur';
import nodal from 'marcheur/lib/nodal';
import Matcher from 'marcheur/lib/matcher';
// import Matcher from './matcher';
import dom from 'get-dom';
import xpath from 'xpath';

const nsMap = {
        m:  'http://schemas.openxmlformats.org/officeDocument/2006/math',
      }
    , select = xpath.useNamespaces(nsMap)
;

export default function omml2mathml (omml) {
  let m = new Matcher(nsMap)
    , walker = new Marcheur()
    , el
    , amap
  ;
  return walker
    // #document
    .match(m.document(),
      (src, out, w) => {
        let doc = dom.implementation().createHTMLDocument('')
          , nod = nodal(doc, {}, nsMap)
        ;
        el = nod.el;
        amap = nod.amap;
        w.result(doc);
        w.walk(doc.body);
      }
    )
    // graphics & media
    // .match(
    //   [m.el('graphic'), m.el('media')],
    //   (src, out, w) => {
    //     let type = src.getAttribute('mimetype')
    //       , elName
    //     ;
    //     if (type === 'video') elName = 'video';
    //     else if (type === 'audio') elName = 'audio';
    //     else if (type === 'image') elName = 'img';
    //     else if (!type) elName = (src.localName === 'graphic') ? 'img' : 'iframe';
    //     else elName = 'iframe';
    //     if (src.hasChildNodes()) {
    //       let div = el('div', { class: 'graphic'}, out)
    //         , img = el(elName, amap(src), div)
    //       ;
    //       convertXLink(img, 'src');
    //       w.walk(div);
    //     }
    //     else {
    //       let img = el(elName, amap(src), out);
    //       convertXLink(img, 'src');
    //     }
    //   }
    // )
    .run(omml)
  ;
}

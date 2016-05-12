
import Marcheur from 'marcheur';
import nodal from 'marcheur/lib/nodal';
import qname from 'marcheur/lib/qname';
import Matcher from 'marcheur/lib/matcher';
import dom from 'get-dom';
import xpath from 'xpath';
import { oprx } from './operators';

let MATH_NS = 'http://www.w3.org/1998/Math/MathML'
  , nsMap = {
      m:  'http://schemas.openxmlformats.org/officeDocument/2006/math',
    }
  , select = xpath.useNamespaces(nsMap)
  , selectAttr = (path, attr, ctx, onlyDef = false) => {
      let el = select(path, ctx)[0];
      if (!el) return onlyDef ? undefined : '';
      let atn = qname(attr, nsMap);
      if (atn.ns) return el.getAttributeNS(atn.ns, atn.ln);
      return el.getAttribute(atn.qn);
    }
  , el
;

export default function omml2mathml (omml) {
  let m = new Matcher(nsMap)
    , walker = new Marcheur()
  ;
  return walker
    // #document
    .match(m.document(),
      (src, out, w) => {
        let doc = dom.implementation().createHTMLDocument('')
          , nod = nodal(doc, {}, nsMap)
          , math = doc.createElementNS(MATH_NS, 'math')
        ;
        math.setAttribute('display', 'inline');
        el = nod.el;
        w.result(math);
        w.walk(math);
      }
    )
    .match(
      m.el('m:oMathPara'),
      (src, out, w) => {
        w.res.setAttribute('display', 'block');
        w.walk(out);
      }
    )
    .match(
      m.el('m:oMath'),
      (src, out, w) => w.walk(out)
    )
    .match(
      m.el('m:f'),
      (src, out, w) => {
        let type = (selectAttr('./m:fPr[last()]/m:type', 'm:val', src) || '').toLowerCase()
          , outer = (type === 'lin')
                      ? el('mrow', {}, out)
                      : el('mfrac', fracProp(type), out)
        ;
        let numRow = el('mrow', {}, outer);
        w.walk(numRow, select('m:num[1]', src));
        if (type === 'lin') {
          let mo = el('mo', {}, outer);
          mo.textContent = '/';
        }
        let denRow = el('mrow', {}, outer);
        w.walk(denRow, select('m:den[1]', src));
      }
    )
    .match(
      m.el('m:r'),
      (src, out) => {
        let nor = selectAttr('m:rPr[last()]/m:nor', 'm:val', src) || false;
        if (nor) nor = forceFalse(nor);
        if (nor) {
          let mtext = el('mtext', {}, out);
          mtext.textContent = nbsp(select('.//m:t', src)
                                      .map(mt => mt.textContent)
                                      .join(''))
          ;
        }
        else {
          select('.//m:t', src)
            .forEach(mt => {
              parseMT(src, out, {
                toParse:  select('./text()', mt).map(t => t.toString()).join(''),
                scr:      selectAttr('../m:rPr[last()]/m:scr', 'm:val', mt),
                sty:      selectAttr('../m:rPr[last()]/m:sty', 'm:val', mt),
                nor:      false,
              });
            })
          ;
        }
      }
    )
    .match(
      m.el('m:limLow'),
      (src, out, w) => {
        let outer = el('munder', {}, out)
          , row1 = el('mrow', {}, outer)
          , row2 = el('mrow', {}, outer)
        ;
        w.walk(row1, select('m:e[1]', src));
        w.walk(row2, select('m:lim[1]', src));
      }
    )
    .match(
      m.el('m:limUpp'),
      (src, out, w) => {
        let outer = el('mover', {}, out)
          , row1 = el('mrow', {}, outer)
          , row2 = el('mrow', {}, outer)
        ;
        w.walk(row1, select('m:e[1]', src));
        w.walk(row2, select('m:lim[1]', src));
      }
    )
    .match(
      m.el('m:sSub'),
      (src, out, w) => {
        let outer = el('msub', {}, out)
          , row1 = el('mrow', {}, outer)
          , row2 = el('mrow', {}, outer)
        ;
        w.walk(row1, select('m:e[1]', src));
        w.walk(row2, select('m:sub[1]', src));
      }
    )
    .match(
      m.el('m:sSup'),
      (src, out, w) => {
        let outer = el('msup', {}, out)
          , row1 = el('mrow', {}, outer)
          , row2 = el('mrow', {}, outer)
        ;
        w.walk(row1, select('m:e[1]', src));
        w.walk(row2, select('m:sup[1]', src));
      }
    )
    .match(
      m.el('m:sSubSup'),
      (src, out, w) => {
        let outer = el('msubsup', {}, out)
          , row1 = el('mrow', {}, outer)
          , row2 = el('mrow', {}, outer)
          , row3 = el('mrow', {}, outer)
        ;
        w.walk(row1, select('m:e[1]', src));
        w.walk(row2, select('m:sub[1]', src));
        w.walk(row3, select('m:sup[1]', src));
      }
    )
    .match(
      m.el('m:sPre'),
      (src, out, w) => {
        let outer = el('mmultiscripts', {}, out)
          , row = el('mrow', {}, outer)
        ;
        w.walk(row, select('m:e[1]', src));
        el('mprescripts', {}, outer);
        outputScript(w, outer, select('m:sub[1]', src));
        outputScript(w, outer, select('m:sup[1]', src));
      }
    )
    .match(
      m.el('m:m'),
      (src, out, w) => {
        let mcjc = selectAttr('m:mPr[last()]/m:mcs/m:mc/m:mcPr[last()]/m:mcJc/', 'm:val', src)
          , outer = el('mtable', mcjc ? { columnalign: mcjc } : {}, out)
        ;
        select('./m:mr', src)
          .forEach(mr => {
            let mtr = el('mtr', {}, outer);
            select('./m:me', mr)
              .forEach(me => {
                let mtd = el('mtd', {}, mtr);
                w.walk(mtd, me);
              })
            ;
          })
        ;
      }
    )
    .match(
      m.el('m:rad'),
      (src, out, w) => {
        let degHide = selectAttr('m:radPr[last()]/m:degHide', 'm:val', src) || false;
        if (degHide) degHide = forceFalse(degHide);
        if (degHide) {
          let msqrt = el('msqrt', {}, out);
          w.walk(msqrt, select('m:e[1]', src));
        }
        else {
          let outer = el('mroot', {}, out)
            , row1 = el('mrow', {}, outer)
            , row2 = el('mrow', {}, outer)
          ;
          w.walk(row1, select('m:e[1]', src));
          w.walk(row2, select('m:deg[1]', src));
        }
      }
    )
    .match(
      m.el('m:nary'),
      (src, out, w) => {
        let subHide = selectAttr('m:naryPr[last()]/m:subHide', 'm:val', src) || false;
        if (subHide) subHide = forceFalse(subHide);
        let supHide = selectAttr('m:naryPr[last()]/m:supHide', 'm:val', src) || false;
        if (supHide) supHide = forceFalse(supHide);
        let limLocSubSup = selectAttr('m:naryPr[last()]/m:limLoc', 'm:val', src).toLowerCase();
        limLocSubSup = (limLocSubSup === '' || limLocSubSup === 'subsup');
        let grow = selectAttr('m:naryPr[last()]/m:grow', 'm:val', src) || false;
        if (grow) grow = forceFalse(grow);

        let mrow = el('mrow', {}, out);
        if (supHide && subHide) {
          outputNAryMO(src, mrow, src, grow);
        }
        else if (subHide) {
          let outer = el(limLocSubSup ? 'msup' : 'mover', {}, mrow);
          outputNAryMO(src, outer, src, grow);
          let subrow = el('mrow', {}, outer);
          w.walk(subrow, select('m:sup[1]', src));
        }
        else if (supHide) {
          let outer = el(limLocSubSup ? 'msub' : 'munder', {}, mrow);
          outputNAryMO(src, outer, src, grow);
          let subrow = el('mrow', {}, outer);
          w.walk(subrow, select('m:sub[1]', src));
        }
        else {
          let outer = el(limLocSubSup ? 'msubsup' : 'munderover', {}, mrow);
          outputNAryMO(src, outer, src, grow);
          let subrow1 = el('mrow', {}, outer)
            , subrow2 = el('mrow', {}, outer)
          ;
          w.walk(subrow1, select('m:sub[1]', src));
          w.walk(subrow2, select('m:sup[1]', src));
        }
        let erow = el('mrow', {}, mrow);
        w.walk(erow, select('m:e[1]', src));
      }
    )
    .match(
      m.el('m:d'),
      (src, out, w) => {
        let attr = {}
          , begChr = selectAttr('m:dPr[1]/m:begChr', 'm:val', src, true)
          , endChr = selectAttr('m:dPr[1]/m:endChr', 'm:val', src, true)
          , sepChr = selectAttr('m:dPr[1]/m:sepChr', 'm:val', src) || '|'
        ;
        if (typeof begChr !== 'undefined' && begChr !== '(') attr.open = begChr;
        if (typeof endChr !== 'undefined' && endChr !== ')') attr.close = endChr;
        if (sepChr !== ',') attr.separators = sepChr;
        let mfenced = el('mfenced', attr, out);
        select('m:e', src).forEach(me => {
          let row = el('mrow', {}, mfenced);
          w.walk(row, me);
        });
      }
    )
    .match(
      m.el('m:eqArr'),
      (src, out, w) => {
        let mtable = el('mtable', {}, out);
        select('m:e', src)
          .forEach(me => {
            let mtr = el('mtr', {}, mtable)
              , mtd = el('mtd', {}, mtr)
              , scrLvl = selectAttr('m:argPr[last()]/m:scrLvl', 'm:val', me)
              , outer
            ;
            if (scrLvl !== '0' || !scrLvl) outer = el('mrow', {}, mtd);
            else outer = el('mstyle', { scriptlevel: scrLvl }, mtd);
            el('maligngroup', {}, outer);
            createEqArrRow(w, src, outer, 1, select('*[1]', me)[0]);
          })
        ;
      }
    )
    .match(
      m.el('m:func'),
      (src, out, w) => {
        let outer = el('mrow', {}, out)
          , row1 = el('mrow', {}, outer)
        ;
        select('m:fName', src).forEach(fn => w.walk(row1, fn));
        let mo = el('mo', {}, outer);
        mo.textContent = '\u2061';
        let row2 = el('mrow', {}, outer);
        w.walk(row2, select('m:e', src));
      }
    )
    .match(
      m.el('m:acc'),
      (src, out, w) => {
        let mover = el('mover', { accent: 'true' }, out)
          , row = el('mrow', {}, mover)
          , acc = selectAttr('m:accPr/m:chr', 'm:val', src).substr(0, 1) || '\u0302'
          , nonComb = toNonCombining(acc)
        ;
        w.walk(row, select('m:e[1]', src));
        if (acc.length === 0) {
          el('mo', {}, mover);
        }
        else {
          let nor = selectAttr('m:rPr[last()]/m:nor', 'm:val', src) || false;
          if (nor) nor = forceFalse(nor);
          parseMT(src, mover, {
            toParse:  nonComb,
            scr:      selectAttr('m:e[1]/*/m:rPr[last()]/m:scr', 'm:val', src),
            sty:      selectAttr('m:e[1]/*/m:rPr[last()]/m:sty', 'm:val', src),
            nor,
          });
        }
      }
    )
    .match(
      m.el('m:groupChr'),
      (src, out, w) => {
        let lastGroupChrPr = select('m:groupChrPr[last()]', src)[0]
          , pos = selectAttr('m:pos', 'm:val', lastGroupChrPr).toLowerCase()
          , vertJc = selectAttr('m:vertJc', 'm:val', lastGroupChrPr).toLowerCase()
          , lastChrVal = selectAttr('m:chr', 'm:val', lastGroupChrPr)
          , chr = lastChrVal ? lastChrVal.substr(0, 1) : '\u23DF'
          , mkMrow = (parent) => {
              let mrow = el('mrow', {}, parent);
              w.walk(mrow, select('m:e[1]', src));
            }
          , mkMo = (parent) => {
              let mo = el('mo', {}, parent);
              mo.textContent = chr;
            }
        ;
        if (pos === 'top') {
          if (vertJc === 'bot') {
            let outer = el('mover', { accent: 'false' }, out);
            mkMrow(outer);
            mkMo(outer);
          }
          else {
            let outer = el('munder', { accentunder: 'false' }, out);
            mkMo(outer);
            mkMrow(outer);
          }
        }
        else {
          if (vertJc === 'bot') {
            let outer = el('mover', { accent: 'false' }, out);
            mkMo(outer);
            mkMrow(outer);
          }
          else {
            let outer = el('munder', { accentunder: 'false' }, out);
            mkMrow(outer);
            mkMo(outer);
          }
        }
      }
    )

    .run(omml)
  ;
}

function fracProp (type) {
  if (type === 'skw' || type === 'lin') return { bevelled: 'true' };
  if (type === 'nobar') return { linethickness: '0pt' };
  return {};
  // TODO: the original XSLT had traces of trying to set `numalign` on both numerator and
  // denominator, but the variables were never properly defined and could absolutely not match
}

function nbsp (str) {
  if (!str) return;
  return str.replace(/\s/g, '\u00a0');
}

function tf (str) {
  if (str == null) return;
  str = str.toLowerCase();
  if (str === 'on' || str === '1' || str === 'true') return true;
  if (str === 'off' || str === '0' || str === 'false') return false;
}

function forceFalse (str) {
  let res = tf(str);
  if (res === false) return false;
  return true;
}

// function forceTrue (str) {
//   return tf(str) || false;
// }

function parseMT (ctx, out, { toParse = '', scr, sty, nor }) {
  if (!toParse.length) return;
  let firstOper = rxIndexOf(toParse, oprx)
    , firstNum = rxIndexOf(toParse, /\d/)
    , startsWithOper = (firstOper === 1)
    , startsWithNum = (firstNum === 1)
  ;
  if (!startsWithOper && !startsWithNum) {
    let charToPrint;
    if (select('ancestor::m:fName', ctx)[0]) {
      if (!firstOper && !firstNum) charToPrint = toParse.length;
      else charToPrint = Math.min(firstOper || Number.MAX_VALUE, firstNum || Number.MAX_VALUE);
    }
    else charToPrint = 1;
    let mi = el('mi', tokenAttributes({ scr, sty, nor, charToPrint, tokenType: 'mi' }), out);
    mi.textContent = nbsp(toParse.substr(0, charToPrint));
    parseMT(ctx, out, { toParse: toParse.substr(charToPrint), scr, sty, nor });
  }
  else if (startsWithOper) {
    let mo = el('mo', tokenAttributes({ nor, tokenType: 'mo' }), out);
    mo.textContent = toParse.substr(0, 1);
    parseMT(ctx, out, { toParse: toParse.substr(1), scr, sty, nor });
  }
  else {
    let num = numStart(toParse)
      , mn = el('mn', tokenAttributes({ scr, sty: 'p', nor, tokenType: 'mn' }), out)
    ;
    mn.textContent = num;
    parseMT(ctx, out, { toParse: toParse.substr(num.length), scr, sty, nor });
  }
}

function parseEqArrMr (ctx, out, { toParse = '', scr, sty, nor, align }) {
  if (!toParse.length) return;
  if (toParse[0] === '&') {
    el(align ? 'malignmark' : 'maligngroup', {}, out);
    parseEqArrMr(ctx, out, {
      toParse:  toParse.substr(1),
      align:    !align,
      scr, sty, nor,
    });
  }
  else {
    let firstOper = rxIndexOf(toParse, oprx)
      , firstNum = rxIndexOf(toParse, /\d/)
      , startsWithOper = (firstOper === 1)
      , startsWithNum = (firstNum === 1)
    ;
    if (!startsWithOper && !startsWithNum) {
      if (!nor) {
        let mi = el('mi', tokenAttributes({ scr, sty, nor, charToPrint: 1, tokenType: 'mi' }), out);
        mi.textContent = nbsp(toParse.substr(0, 1));
      }
      else {
        let mt = el('mtext', {}, out);
        mt.textContent = nbsp(toParse.substr(0, 1));
      }
      parseEqArrMr(ctx, out, { toParse: toParse.substr(1), scr, sty, nor, align });
    }
    else if (startsWithOper) {
      if (!nor) {
        let mo = el('mo', tokenAttributes({ nor, charToPrint: 1, tokenType: 'mo' }), out);
        mo.textContent = toParse.substr(0, 1);
      }
      else {
        let mt = el('mtext', {}, out);
        mt.textContent = toParse.substr(0, 1);
      }
      parseEqArrMr(ctx, out, { toParse: toParse.substr(1), scr, sty, nor, align });
    }
    else {
      let num = numStart(toParse);
      if (!nor) {
        let mn = el('mN', tokenAttributes({ sty: 'p', nor, charToPrint: 1, tokenType: 'mn' }), out);
        mn.textContent = toParse.substr(0, num.length);
      }
      else {
        let mt = el('mtext', {}, out);
        mt.textContent = toParse.substr(0, num.length);
      }
      parseEqArrMr(ctx, out, { toParse: toParse.substr(num.length), scr, sty, nor, align });
    }
  }
}

function rxIndexOf (str, rx) {
  let re = rx.exec(str);
  if (!re) return 0;
  return re.index + 1;
}

function tokenAttributes ({ scr, sty, nor, charToPrint = 0, tokenType }) {
  let attr = {};
  if (nor) attr.mathvariant = 'normal';
  else {
    let mathvariant
      , fontweight = (sty === 'b' || sty === 'bi') ? 'bold' : 'normal'
      , fontstyle = (sty === 'b' || sty === 'p') ? 'normal' : 'italic'
    ;
    if (tokenType !== 'mn') {
      if (scr === 'monospace') mathvariant = 'monospace';
      else if (scr === 'sans-serif' && sty === 'i') mathvariant = 'sans-serif-italic';
      else if (scr === 'sans-serif' && sty === 'b') mathvariant = 'bold-sans-serif';
      else if (scr === 'sans-serif' && sty === 'bi') mathvariant = 'sans-serif-bold-italic';
      else if (scr === 'sans-serif') mathvariant = 'sans-serif';
      else if (scr === 'fraktur' && (sty === 'b' || sty === 'i')) mathvariant = 'bold-fraktur';
      else if (scr === 'fraktur') mathvariant = 'fraktur';
      else if (scr === 'double-struck') mathvariant = 'double-struck';
      else if (scr === 'script' && (sty === 'b' || sty === 'i')) mathvariant = 'bold-script';
      else if (scr === 'script') mathvariant = 'script';
      else if (scr === 'roman' || !scr) {
        if (sty === 'b') mathvariant = 'bold';
        else if (sty === 'i') mathvariant = 'italic';
        else if (sty === 'p') mathvariant = 'normal';
        else if (sty === 'bi') mathvariant = 'bold-italic';
      }
    }
    if (tokenType === 'mo' && mathvariant !== 'normal') return attr;
    if (tokenType === 'mi' && charToPrint === 1 && (mathvariant === 'italic' || !mathvariant)) {
      return attr;
    }
    if (tokenType === 'mi' && charToPrint > 1 && (mathvariant === 'italic' || !mathvariant)) {
      attr.mathvariant = 'italic';
    }
    else if (mathvariant && mathvariant !== 'italic') {
      attr.mathvariant = mathvariant;
    }
    else {
      if (fontstyle === 'italic' && !(tokenType === 'mi' && charToPrint === 1)) {
        attr.fontstyle = 'italic';
      }
      if (fontweight === 'bold') attr.fontweight = 'bold';
    }
  }
  return attr;
}

function numStart (str) {
  if (!str) return '';
  let ret = '';
  str.replace(/^(\d+)/, (_, m) => {
    ret = m;
  });
  return ret;
}

function outputScript (w, out, cur) {
  if (cur && cur.length) {
    let row = el('mrow', {}, out);
    w.walk(row, cur);
  }
  else el('none', {}, out);
}

function outputNAryMO (src, out, cur, grow = false) {
  let mo = el('mo', { stretchy: grow ? 'true' : 'false' }, out)
    , val = selectAttr('./m:naryPr[last()]/m:chr', 'm:val', src)
  ;
  mo.textContent = val || '\u222b';
}

function createEqArrRow (w, src, out, align, cur) {
  let allMt = select('m:t', cur).map(mt => mt.textContent).join('');
  if (select('self::m:r', cur)[0]) {
    let nor = selectAttr('m:rPr[last()]/m:nor', 'm:val', src) || false;
    if (nor) nor = forceFalse(nor);
    parseEqArrMr(src, out, {
      toParse:  allMt,
      scr:      selectAttr('../m:rPr[last()]/m:scr', 'm:val', src),
      sty:      selectAttr('../m:rPr[last()]/m:sty', 'm:val', src),
      nor,
      align,
    });
  }
  else {
    w.walk(out, cur);
  }
  if (select('following-sibling::*', cur).length) {
    let amp = countAmp(allMt);
    createEqArrRow(w, src, out, (align + (amp % 2)) % 2, select('following-sibling::*', cur)[0]);
  }
}

function countAmp (allMt) {
  return (allMt || '').match(/&/g).length;
}

let combiMap = {
  '\u0306': '\u02D8',
  '\u032e': '\u02D8',
  '\u0312': '\u00B8',
  '\u0327': '\u00B8',
  '\u0300': '\u0060',
  '\u0316': '\u0060',
  '\u0305': '\u002D',
  '\u0332': '\u002D',
  '\u0323': '\u002E',
  '\u0307': '\u02D9',
  '\u030B': '\u02DD',
  '\u0317': '\u00B4',
  '\u0301': '\u00B4',
  '\u0330': '\u007E',
  '\u0303': '\u007E',
  '\u0324': '\u00A8',
  '\u0308': '\u00A8',
  '\u032C': '\u02C7',
  '\u030C': '\u02C7',
  '\u0302': '\u005E',
  '\u032D': '\u005E',
  '\u20D7': '\u2192',
  '\u20EF': '\u2192',
  '\u20D6': '\u2190',
  '\u20EE': '\u2190',
};
function toNonCombining (ch) {
  return combiMap[ch] || ch;
}

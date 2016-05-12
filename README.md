
# omml2mathml

Small utility to convert from Microsoft's OMML to MathML.

This is by and large a port of the the `omml2mathml.xsl` XSLT that Microsoft ships with Office and
that is in relatively wide use, with a few bugs fixed. This implementation does not require an
XSLT processor (I built it because I became tired of XSLT processors that crash)

## Installation

    npm install omml2mathml

## API

The API is very simple: there is only one function to know, it takes one input, runs synchronously,
and returns one output.

```js
import omml2mathml from 'omml2mathml';
let mathmlElement = omml2mathml(oMathElement);
```

The input should be an `m:oMath` or `m:oMathPara` element. Note that you can always use the former
even if it has an `m:oMathPara` parent and the module will correctly set `display="block"` all the
same.

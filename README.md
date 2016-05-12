
# omml2mathml

Small utility to convert from Microsoft's OMML to MathML.

This is by and large a port of the the `omml2mathml.xsl` XSLT that Microsoft ships with Office and
that is in relatively wide use, with a few bugs fixed. This implementation does not require an
XSLT processor (I built it because I became tired of XSLT processors that crash)

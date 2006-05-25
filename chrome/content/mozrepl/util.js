function helpUrlFor(thing) {
    function xulPlanetXpcomClassUrl(classID) {
        return 'http://xulplanet.com/references/xpcomref/comps/c_' +
            classID.replace(/^@mozilla.org\//, '').replace(/[;\?\/=]/g, '') + '.html';
    }
    function xulPlanetXulElementUrl(element) {
        return 'http://xulplanet.com/references/elemref/ref_' +
            element.nodeName + '.html';
    }

    if(typeof(thing) == 'string') {
        if(thing.match(/^@mozilla.org\//)) 
            return xulPlanetXpcomClassUrl(thing);

    } else if(thing.QueryInterface &&
              (function() {
                  const NS_NOINTERFACE = 0x80004002;
                  try {
                      thing.QueryInterface(Components.interfaces.nsIDOMXULElement);
                      return true;
                  } catch(e if e.result == NS_NOINTERFACE) {}
              })()) {
        return xulPlanetXulElementUrl(thing);
    }
}

function docFor(thing) {
    var printout = '';
    printout += 'TYPE: ' + (typeof(thing)) + '\n';
    if(thing.name)
        printout += 'NAME: ' + thing.name + '\n';
    else if(thing.nodeName)
        printout += 'NODENAME: ' + thing.nodeName + '\n';

    if(typeof(thing) == 'function') {
        var list = argList(thing);
        printout += 'ARGS: ' + (list.length == 0 ?
                                '[none declared]' :
                                list.join(', ')) + '\n';
    }

    if(thing.doc && typeof(thing.doc) == 'string') 
        printout += '\n' + thing.doc + '\n';

    return printout;
}

function argList(fn) {
    var match;
    var rx = new RegExp('^function (\\w+)?\\(([^\\)]*)?\\) {');

    match = fn.toString().match(rx);
    if(match[2])
        return match[2].split(', ');
    else
        return [];
}

function xulPlanetCss(document) {
    var cssLink = document.createElementNS(
        'http://www.w3.org/1999/xhtml', 'link');
    cssLink.rel = 'stylesheet';
    cssLink.type = 'text/css';
    cssLink.href = 'data:text/css,#sidebar, #header, #navigatebar, ' +
        '.navlinks-pnc { display: none; } ' +
        '#content { margin-left: 0; }';
    document.getElementsByTagName('head')[0].appendChild(cssLink);
}


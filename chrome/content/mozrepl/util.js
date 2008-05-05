/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is MozRepl.
 *
 * The Initial Developer of the Original Code is
 * Massimiliano Mirra <bard [at] hyperstruct [dot] net>.
 * Portions created by the Initial Developer are Copyright (C) 2006-2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Massimiliano Mirra <bard [at] hyperstruct [dot] net>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */


function helpUrlFor(thing) {
    function xulPlanetXpcomClassUrl(classID) {
        return 'http://xulplanet.com/references/xpcomref/comps/c_' +
            classID.replace(/^@mozilla.org\//, '').replace(/[;\?\/=\-]/g, '') + '.html';
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


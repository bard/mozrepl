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


var Specification = mozlab.mozunit.Specification;
var assert = mozlab.mozunit.assertions;
var spec = new Specification('REPL Utilities');

var module = new ModuleManager(['chrome://mozlab/content/mozrepl']);
var util = module.require('package', 'util');

spec.stateThat = {
    'Retrieve XULPlanet help for XPCOM component ClassID': function() {
        assert.equals(
            'http://xulplanet.com/references/xpcomref/comps/c_networksocket1typesocks.html',
            util.helpUrlFor('@mozilla.org/network/socket;1?type=socks'));
    },

    'Retrieve XULPlanet help for XUL element': function() {
        var button = document.createElement('button');
        assert.equals(
            'http://xulplanet.com/references/elemref/ref_button.html',
            util.helpUrlFor(button));        
    },

    'Extract argument list from function decompiled source': function() {
        var list;
        list = util.argList(function() {});
        assert.equals(0, list.length);

        list = util.argList(function(a, b) {});
        assert.equals(2, list.length);
        assert.equals('a,b', list.join(','));
    }
};

spec.verify();
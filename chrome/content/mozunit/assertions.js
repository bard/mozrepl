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
 * The Original Code is MozUnit.
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


function equals(x, y) {
    if(y != x)
        throw new AssertionFailed(
            'Expected ' + x + ', got ' + y + '.',
            Components.stack.caller);
}

function notEquals(x, y) {
    if(y == x)
        throw new AssertionFailed(
            'Expected ' + x + ' and ' + y + ' to be different, but they are equal.',
            Components.stack.caller);
}

function isTrue(x) {
    if(!x)
        throw new AssertionFailed(
            'Expected true or equivalent, got ' + x,
            Components.stack.caller);
}

function isDefined(x) {
    if(x == null ||
       x == undefined)
        throw new AssertionFailed(
            'Expected value to be defined, was undefined',
            Components.stack.caller);
}

function isUndefined(x) {
    if(x != undefined)
        throw new AssertionFailed(
            'Expected value to be undefined, was defined',
            Components.stack.caller);
}

function isFalse(x) {
    if(x)
        throw new AssertionFailed(
            'Expected false or equivalent, got ' + x,
            Components.stack.caller);
}

function isNull(x) {
    if(x != null)
        throw new AssertionFailed(
            'Expected null, got ' + x,
            Components.stack.caller);
}

function raises(exception, code, context) {
    var raised = false;
    try {
        code.call(context);
    } catch(e if e == exception) {
        raised = true;
    } catch(e if e.name == exception) {
        raised = true;
    }
    if(!raised)
        throw new AssertionFailed(
            'Expected to raise ' + exception + ', not raised',
            Components.stack.caller);
}

function matches(pattern, string) {
    if(!(string.match(pattern)))
        throw new AssertionFailed(
            'Expected something matching ' + pattern + ', got "' + string + '"',
            Components.stack.caller);
}

function fail(message) {
    throw new AssertionFailed(message, Components.stack.caller);
}

function AssertionFailed(message, caller) {
    this.name = 'AssertionFailed';
    this.message = message;
    this.stack += '()@' + caller.filename + ':' + caller.lineNumber + '\n';
}
AssertionFailed.prototype = new Error();

// Copyright (C) 2006 by Massimiliano Mirra
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301 USA
//
// Author: Massimiliano Mirra, <bard [at] hyperstruct [dot] net>

var Assert = {
    equals: function(x, y) {
        if(y != x)
            throw new AssertionFailed('Expected ' + x + ', got ' + y + '.');
    },

    notEquals: function(x, y) {
        if(y == x)
            throw new AssertionFailed('Expected ' + x + ' and ' + y + ' to be different, but they are equal.');
    },

    isTrue: function(x) {
        if(!x)
            throw new AssertionFailed('Expected true or equivalent, got ' + x);
    },

    isDefined: function(x) {
        if(x == null ||
           x == undefined)
            throw new AssertionFailed('Expected value to be defined, was undefined');
    },

    isFalse: function(x) {
        if(x)
            throw new AssertionFailed('Expected false or equivalent, got ' + x);
    },

    isNull: function(x) {
        if(x != null)
            throw new AssertionFailed('Expected null, got ' + x);
    },

    raises: function(exception, code, context) {
        var raised = false;
        try {
            code.call(context);
        } catch(e if e == exception) {
            raised = true;
        } catch(e if e.name == exception) {
            raised = true;
        }
        if(!raised)
            throw new AssertionFailed('Expected to raise ' + exception + ', not raised');
    },

    matches: function(pattern, string) {
        if(!(string.match(pattern)))
            throw new AssertionFailed('Expected something matching ' + pattern + ', got "' + string + '"');
    },

    fail:  function(message) {
        throw new AssertionFailed(message);
    }
};

function AssertionFailed(message) {
    this.message = message;
    this.name = 'AssertionFailed';
}
AssertionFailed.prototype = new Error();

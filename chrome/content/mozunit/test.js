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

// Playground for interactive development with MozRepl

{
    var spec = new Specification();
        
    spec.stateThat = {
        given: function() {
            this.a = 10;
        },

        tearDown: function() {
            this.tearDownCalled = true;
        },

        'Check for equal instance variables': function() {
            Assert.equals(10, this.a);
        },

        'This test should report a failure': function() {
            Assert.equals(2, 1);
        },

        'This test should report an error and a stack trace': function() {
            Assert.isTrue(foo);
        },

        'Code can be checked for thrown exceptions': function() {
            Assert.raises('BadThingHappened',
                          function() {
                              throw 'BadThingHappened';
                          });
        },

        'This test should complain about an expected yet unthrown exception': function() {
            Assert.raises('BadThingHappened',
                          function() {
                              return 'Everything went well';
                          });
        }
    };

    spec.verify();
}
 

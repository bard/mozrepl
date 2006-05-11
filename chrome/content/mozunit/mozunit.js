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

function TestSuite() {
    this.__tests = {}
}

TestSuite.prototype = {
    setUp: function(fn) {
        this.__setUp = fn;
    },
    
    tearDown: function(fn) {
        this.__tearDown = fn;
    },

    test: function(desc, fn) {
        this.__tests[desc] = fn;
    },

    set tests(value) {
        this.setTests(hash);        
    },

    setTests: function(hash) {
        // should probably clear our __tests hash and copy over, instead
        // of modifying parameter

        if(hash.setUp) {
            this.__setUp = hash.setUp;
            delete hash.setUp;
        }

        if(hash.given) {
            this.__setUp = hash.given;
            delete hash.given;
        }

        if(hash.tearDown) {
            this.__tearDown = hash.tearDown;
            delete hash.tearDown;
        }

        this.__tests = hash;
    },

    testResult: function(eventType, eventLocation, message) {
        if(eventType != 'SUCCESS')
            this.__output(eventType + ' in <' + eventLocation + '>\n' + (message || '') + '\n');
    },

    testSummary: function(summary) {
        this.__output('\nTest run summary\n' +
                      '  Successes: ' + summary.successes + '\n' +
                      '  Failures:  ' + summary.failures + '\n' + 
                      '  Errors:    ' + summary.errors + '\n\n');
    },

    __output: function(string) {
        if(this.__outputter)
            this.__outputter(string);
        else if(typeof(MozRepl_Server) == 'object' &&
                MozRepl_Server.isActive())
            MozRepl_dump(string);
        else
            dump(string);
    },
    
    get outputter() {
        return this.__outputter;
    },

    set outputter(fn) {
        this.__outputter = fn;
    },

    run: function() {
        var summary = {
            successes: 0,
            failures: 0,
            errors: 0
        };

        for(desc in this.__tests) {
            var context = {};

            try {
                if(this.__setUp)
                    this.__setUp.call(context);

                this.__tests[desc].call(context);

                summary.successes += 1;
                this.testResult('SUCCESS', desc);
            } catch(exception if exception.name == 'AssertionFailed') {
                summary.failures += 1;

                var message = '\t' + (exception.message || exception) + '\n';

                this.testResult('FAILURE', desc, message);
            } catch(exception){ 
                summary.errors += 1;
                var trace = '';
                
                if(exception.stack) {
                    var calls = exception.stack.split('\n');
                    for each (call in calls) {
                        if(call.length > 0) {
                            call = call.replace(/\\n/g, '\n');
                            
                            if(call.length > 200)
                                call = call.substr(0, 200) + '[...]\n'
                            
                            trace += call.replace(/^/mg, '\t') + '\n';
                        }
                    }
                } 

                trace = '\t' + exception.toString() + '\n' + trace;
                this.testResult('ERROR', desc, trace);
            }

            if(this.__tearDown)
                this.__tearDown.call(context);
        }
        this.testSummary(summary);
    },

    describe: function() {
        this.__output('Specification\n\n')
        for(desc in this.__tests)
            this.__output('  * ' + desc + '\n\n');
    },

    /*
     * The following aliases, together with the other name for
     * TestSuite (Specification) encourage a more behavour-oriented
     * (as opposed to test-oriented) frame of mind.
     *
     * Example:
     *
     *     var spec = new Specification();
     *     
     *     spec.stateThat = {
     *         given: function() {
     *             this.a = 3;
     *         },
     *     
     *         'adding 1 and 2 is 3': function() {
     *             Assert.equals(3, 1 + 2);
     *         },
     *     
     *         'adding 3 and 4 is 7': function() {
     *             Assert.equals(7, 3 + 4);
     *         },
     *     }
     *     
     *     spec.verify();
     * 
     */

    given: function(fn) {
        this.setUp(fn);
    },

    states: function(desc, fn) {
        this.test(desc, fn);
    },

    verify: function() {
        this.run();
    },

    set stateThat(hash) {
        this.setTests(hash);
    }
};

Specification = TestSuite;
    

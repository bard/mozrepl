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

function constructor(opts) {
    opts = opts || {};

    this._runStrategy = opts.runStrategy;
    this._tests = [];

    this.__defineSetter__(
        'tests', function(value) {
            this.setTests(hash);
        });

    this.__defineGetter__(
        'outputter', function() {
            return this.__outputter;
        });

    this.__defineSetter__(
        'outputter', function(fn) {
            this.__outputter = fn;
        });

    this.__defineSetter__(
        'stateThat', function(hash) {
            this.setTests(hash);
        });
}

function setUp(fn) {
    this._setUp = fn;
}

function tearDown(fn) {
    this._tearDown = fn;
}

function test(desc, code) {
    this._tests.push([desc, code]);
}

function setTests(hash) {
    for(var desc in hash) 
        if(desc == 'setUp' || desc == 'given')
            this._setUp = hash[desc];
        else if(desc == 'tearDown')
            this._tearDown = hash[desc];
        else
            this._tests.push({
                desc: desc,
                code: hash[desc]});
}

function testResult(eventType, eventLocation, message) {
    if(eventType != 'SUCCESS')
        this._output(eventType + ' in <' + eventLocation + '>\n' + (message || '') + '\n');
}

function testSummary(summary) {
    this._output('\nTest run summary\n' +
                 '  Successes: ' + summary.successes + '\n' +
                 '  Failures:  ' + summary.failures + '\n' +
                 '  Errors:    ' + summary.errors + '\n\n');
}

function _output(string) {
    if(this._outputter)
        this._outputter(string);
    else if(typeof(devbox.mozrepl.server) == 'object' &&
            devbox.mozrepl.server.isActive() &&
            devbox.mozrepl.dump)
        devbox.mozrepl.dump(string);
    else
        dump(string);
}

function _formatStackTrace1(exception) {
    var trace = '';
    if(exception.stack) {
        var calls = exception.stack.split('\n');
        for each(var call in calls) {
            if(call.length > 0) {
                call = call.replace(/\\n/g, '\n');

                if(call.length > 200)
                    call = call.substr(0, 200) + '[...]\n';

                trace += call.replace(/^/mg, '\t') + '\n';
            }
        }
    }
    return trace;
}

function _exec1(code, setUp, tearDown, context) {
    var result = {
        type:    undefined,
        message: undefined
    };

    try {
        if(setUp)
            setUp.call(context);

        code.call(context);

        if(tearDown)
            tearDown.call(context);

        result.type = 'SUCCESS';
        result.message = null;
    } catch(exception if exception.name == 'AssertionFailed') {
        result.type = 'FAILURE';
        result.message = '\t' + (exception.message || exception) + '\n';
    } catch(exception){
        trace = '\t' + exception.toString() + '\n' + _formatStackTrace1(exception);
        result.type = 'ERROR';
        result.message = trace;
    }

    return result;
}

function _updateSummary(summary, resultType) {
    switch(resultType) {
    case 'SUCCESS':
        summary.successes += 1;
        break;
    case 'FAILURE':
        summary.failures += 1;
        break;
    case 'ERROR':
        summary.errors += 1;
        break;
    }
}

function _asyncRun1(tests, setUp, tearDown, resultOutputter, onTestRunFinished) {
    var fsm = Module.require('package', 'lib/fsm');
    var testIndex = 0;
    var context;
    var summary = {
        successes: 0,
        failures: 0,
        errors: 0
    };

    var stateTransitions = {
        start:    { ok: 'doSetUp' },
        doSetUp:  { ok: 'doTest' },
        doTest:   { ok: 'nextTest' },
        nextTest: { ok: 'doSetUp', ko: 'finished' },
        finished: { }
    }

    var stateHandlers = {
        start: function(continuation) {
            continuation('ok')
        },
        doSetUp: function(continuation) {
            context = {};
            setUp.call(context, continuation);
        },
        doTest: function(continuation) {
            var test = tests[testIndex];
            var result = _exec1(
                test.code, null, tearDown, context);
            _updateSummary(summary, result.type);
            resultOutputter(result.type, test.desc, result.message);
            continuation('ok');
        },
        nextTest: function(continuation) {
            testIndex += 1;
            tests[testIndex] ? continuation('ok') : continuation('ko');
        },
        finished: function(continuation) {
            onTestRunFinished(summary);
        }
    }

    fsm.go('start', {}, stateHandlers, stateTransitions, []);
}

function _syncRun1(tests, setUp, tearDown, resultOutputter) {
    var summary = {
        successes: 0,
        failures: 0,
        errors: 0
    };

    for each(var test in tests) {
        var context = {};
        var result = _exec1(
            test.code, setUp, tearDown, context);

        _updateSummary(summary, result.type);
        resultOutputter(result.type, test.desc, result.message);
    }
    
    return summary;
}

function run() {
    var _this = this;
    if(this._runStrategy == 'async') 
        this._asyncRun1(
            this._tests, this._setUp, this._tearDown, this.testResult,
            function(summary) {
                _this.testSummary(summary);
            });        
    else 
        this.testSummary(
            this._syncRun1(this._tests, this._setUp, this._tearDown, this.testResult));
}

function describe() {
    this._output('Specification\n\n')
        for each(var test in this._tests)
            this._output('  * ' + test.desc + '\n\n');
}

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

function given(fn) {
    this.setUp(fn);
}

function states(desc, fn) {
    this.test(desc, fn);
}

function verify() {
    this.run();
}


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

const fsm = Module.require('package', 'lib/fsm');

/*
 * Invocation:
 *     var suite = new TestSuite();
 *     var suite = new TestSuite({runStrategy: 'async'});
 *
 * Use async run strategy when test cases mustn't be run immediately
 * after test setup, for example when during setup a document is
 * loaded into the browser and the browser will signal when the
 * document has finished loading through a callback.
 *
 * Alias:
 *     var spec = new Specification();
 *
 */

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

/*
 * Define test cases, optionally with setup and teardown.
 *
 *     var suite = new TestSuite();
 *     suite.tests = {
 *         setUp: function() {
 *             this.plusFactor = 4;
 *         },
 *     
 *         testOperation: function() {
 *             assert.equals(8, 2+2+this.plusFactor);
 *         },
 *     
 *         tearDown: function() {
 *             // release resources if necessary
 *         }
 *     }
 *
 * Every test is run in a context created ex-novo and accessible via
 * the 'this' identifier.
 *
 * Aliases: setTests(), stateThat.  'setUp' is also aliased to
 * 'given'.  The latter two allow a more Behaviour-Driven Development
 * style.
 *
 *     var spec = new Specification();
 *     spec.stateThat = {
 *         given: function() {
 *             this.plusFactor = 4;
 *         },
 *
 *         'Adding two and two and plus factor yields eight': function() {
 *             assert.equals(8, 2+2+this.plusFactor);
 *         },
 *
 *         tearDown: function() {
 *             // release resources if necessary
 *         }
 *
 */

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

/*
 * Runs tests with strategy defined at construction time.
 *
 *    var suite = new TestSuite();
 *    suite.tests = { ... };
 *    suite.run();
 *
 * Alias: verify();
 *
 *    var spec = new Specification();
 *    spec.stateThat = { ... };
 *    spec.verify();
 *
 */

function run() {
    var _this = this;

    function resultOutputter(eventType, eventLocation, message) {
        if(eventType != 'SUCCESS')
            _this._output(eventType + ' in <' + eventLocation + '>\n' + (message || '') + '\n');
    }
    
    if(this._runStrategy == 'async') 
        this._asyncRun1(
            this._tests, this._setUp, this._tearDown, resultOutputter,
            function(summary) {
                _this.testSummary(summary);
            });        
    else 
        this.testSummary(
            this._syncRun1(this._tests, this._setUp, this._tearDown, resultOutputter));
}

function verify() {
    this.run();
}

/*
 * Outputs a human-readable of test descriptions.  Useful if you named
 * test with long strings.
 *
 */

function describe() {
    this._output('Specification\n\n')
        for each(var test in this._tests)
            this._output('  * ' + test.desc + '\n\n');
}

/*
 * Alternative style for defining setup.
 *
 */

function setUp(fn) {
    this._setUp = fn;
}

function given(fn) {
    this.setUp(fn);
}

/*
 * Alternative style for defining teardown.
 *
 */

function tearDown(fn) {
    this._tearDown = fn;
}

/*
 * Alternative style for defining tests.  Can be called multiple
 * times.
 *
 */

function test(desc, code) {
    this._tests.push([desc, code]);
}

function states(desc, fn) {
    this.test(desc, fn);
}

/* Undocumented - and in need of refactoring/rethinking */

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

/* Side effect-free functions. They're the ones who do the real job. :-) */

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

function _asyncRun1(tests, setUp, tearDown, resultOutputter, onTestRunFinished) {
    var testIndex = 0;
    var context;
    var summary = {
        successes: 0,
        failures: 0,
        errors: 0
    };

    var stateTransitions = {
        start:      { ok: 'doSetUp' },
        doSetUp:    { ok: 'doTest', ko: 'doTearDown' },
        doTest:     { ok: 'doTearDown' },
        doTearDown: { ok: 'nextTest', ko: 'nextTest' },
        nextTest:   { ok: 'doSetUp', ko: 'finished' },
        finished:   { }
    }

    var stateHandlers = {
        start: function(continuation) {
            continuation('ok')
        },
        doSetUp: function(continuation) {
            context = {};
            try {
                setUp.call(context, continuation);
            } catch(e) {
                continuation('ko');
            }
        },
        doTest: function(continuation) {
            var test = tests[testIndex];
            var result = _exec1(
                test.code, null, null, context);
            _updateSummary(summary, result.type);
            resultOutputter(result.type, test.desc, result.message);
            continuation('ok');
        },
        doTearDown: function(continuation) { // exceptions in setup/teardown are not reported correctly
            try {
                // perhaps should pass continuation to tearDown as well
                tearDown.call(context); 
                continuation('ok');
            } catch(e) {
                continuation('ko');
            }
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

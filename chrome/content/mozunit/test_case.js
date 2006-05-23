/**
 * Copyright (C) 2006 by Massimiliano Mirra
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301 USA
 *
 * Author: Massimiliano Mirra, <bard [at] hyperstruct [dot] net>
 *
 */

const fsm = module.require('package', 'lib/fsm');

/**
 * Invocation:
 *     var case = new TestCase();
 *     var case = new TestCase({runStrategy: 'async'});
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
    this._reportHandler = _defaultReportHandler;

    this.__defineSetter__(
        'tests', function(value) {
            this.setTests(hash);
        });

    this.__defineSetter__(
        'stateThat', function(hash) {
            this.setTests(hash);
        });

    this.__defineSetter__(
        'reportHandler', function(callback) {
            this._reportHandler = callback;
        });
}

/**
 * Define test cases, optionally with setup and teardown.
 *
 *     var case = new TestCase();
 *     case.tests = {
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
 * Every test is run in a context created ex-novo and accessible from
 * the test itself via the 'this' identifier.
 *
 * Aliases: setTests(), 'stateThat'.  'setUp' is also aliased to
 * 'given'.  'stateThat' and 'given' allow a more Behaviour-Driven
 * Development style.
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

/**
 * Runs tests with strategy defined at construction time.
 *
 *    var case = new TestCase();
 *    case.tests = { ... };
 *    case.run();
 *
 */

function run() {
    this[this._runStrategy == 'async' ? '_asyncRun1' : '_syncRun1'](
        this._tests, this._setUp, this._tearDown, this._reportHandler);
}

/**
 * BDD-style alias for run().
 *
 *    var spec = new Specification();
 *    spec.stateThat = { ... };
 *    spec.verify();
 *
 */

function verify() {
    this.run();
}

/**
 * Alternative style for defining setup.
 *
 */

function setUp(fn) {
    this._setUp = fn;
}

/**
 * BDD-alias for setUp().
 *
 */

function given(fn) {
    this.setUp(fn);
}

/**
 * Alternative style for defining teardown.
 *
 */

function tearDown(fn) {
    this._tearDown = fn;
}

/**
 * Alternative style for defining tests.  Can be called multiple
 * times.
 *
 */

function test(desc, code) {
    this._tests.push([desc, code]);
}

/**
 * BDD-style alias for test().
 *
 */

function states(desc, fn) {
    this.test(desc, fn);
}

/*  Side effect-free functions. They're the ones who do the real job. :-) */
  

function _formatStackTrace1(exception) {
    function comesFromFramework(call) {
        return (call.match(/@chrome:\/\/mozlab\/content\/lib\/fsm\.js:/) ||
                call.match(/@chrome:\/\/mozlab\/content\/mozunit\/test_case\.js:/) ||
                // Following is VERY kludgy
                call.match(/\(function \(exitResult\) \{if \(eventHandlers/))
    }
    
    var trace = '';
    if(exception.stack) {
        var calls = exception.stack.split('\n');
        for each(var call in calls) {
            if(call.length > 0 && !comesFromFramework(call)) {
                call = call.replace(/\\n/g, '\n');

                if(call.length > 200)
                    call =
                        call.substr(0, 100) + ' [...] ' +
                        call.substr(call.length - 100) + '\n';

                trace += call + '\n';
            }
        }
    }
    return trace;
}

function _exec1(code, setUp, tearDown, context) {
    var report = {
        result:         undefined,
        additionalInfo: undefined,
        stackTrace:     undefined,        
    };

    try {
        if(setUp)
            setUp.call(context);

        code.call(context);

        if(tearDown)
            tearDown.call(context);

        report.result = 'success';
    } catch(exception if exception.name == 'AssertionFailed') {
        report.result = 'failure';
        report.additionalInfo = (exception.message || exception);
    } catch(exception){
        report.result = 'error';
        report.additionalInfo = exception.toString();
        report.stackTrace = _formatStackTrace1(exception);
    }

    return report;
}

function _syncRun1(tests, setUp, tearDown, reportHandler) {
    var test, context, report;
    for(var i=0, l=tests.length; i<l; i++) {
        test = tests[i];
        context = {};
        report = _exec1(test.code, setUp, tearDown, context);
        report.testDescription = test.desc;
        report.testIndex = i+1;
        report.testCount = l;
        reportHandler(report);
    }
}

function _asyncRun1(tests, setUp, tearDown, reportHandler, onTestRunFinished) {
    var testIndex = 0;
    var context;

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
            var test, report;
            test = tests[testIndex];
            report = _exec1(test.code, null, null, context);
            report.testDescription = test.desc;
            report.testIndex = testIndex + 1;
            report.testCount = tests.length;
            reportHandler(report);
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
            if(onTestRunFinished)
                onTestRunFinished();
        }
    }

    fsm.go('start', {}, stateHandlers, stateTransitions, []);
}

function _defaultReportHandler(report) {
    if(report.result == 'success')
        return;
        
    var printout = '';
    printout += 'Test ' + report.testIndex + '/' + report.testCount + ': ';
    printout += report.testDescription + '\n';
        
    printout += report.result.toUpperCase();
    if(report.additionalInfo)
        printout += ': ' + report.additionalInfo;
    printout += '\n';
        
    if(report.result == 'error')
        printout += report.stackTrace.replace(/^/mg, '\t') + '\n';

    if(typeof(repl) == 'object')
        repl.print(printout);
    else
        dump(printout);
}
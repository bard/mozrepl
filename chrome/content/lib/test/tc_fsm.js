
var spec = new mozlab.mozunit.Specification('Finite State Machine Driver');
var assert = mozlab.mozunit.assertions;
assert.equalsArray = function(x, y) {
    // Warning! Hackish, will only work for arrays of non-objects
    if(x.toSource() != y.toSource())
        throw new AssertionFailed('Expected array ' + y + ' to be equal to ' + y);
    
};

var module = new ModuleManager(['chrome://mozlab/content']);
var fsm = module.require('package', 'lib/fsm');

spec.stateThat = {
    'Machine follows state transitions': function() {
        var statesSeen = [];
        
        var stateTransitions = {
            connect:      { ok: 'authenticate', ko: 'failure' },
            authenticate: { ok: 'success',      ko: 'failure' }
        }

        var stateHandlers = {
            connect: function(continuation) {
                statesSeen.push('connect');
                continuation('ok');
            },
            authenticate: function(continuation) {
                statesSeen.push('authenticate');
                continuation('ok');
            },
            success: function() {
                statesSeen.push('success');
            },
            failure: function() {
                statesSeen.push('failure');
            }
        }

        fsm.go('connect', {}, stateHandlers, stateTransitions, []);

        assert.equalsArray(
            ['connect', 'authenticate', 'success'],
            statesSeen);

    },

    'State handlers are run within (i.e. with "this" assigned to) the given context object': function() {
        var context = { message: '' };

        var stateTransitions = {
            connect:      { ok: 'authenticate', ko: 'failure' },
            authenticate: { ok: 'success',      ko: 'failure' }
        }

        var stateHandlers = {
            connect: function(continuation) {
                this.message = 'Hello, please type username and password'
                continuation('ok');
            },
            authenticate: function(continuation) {
                continuation('ok');
            },
            success: function() {},
            failure: function() {}
        }

        fsm.go('connect', context, stateHandlers, stateTransitions, []);

        assert.equals(
            'Hello, please type username and password',
            context.message);        
    },

    'Events are fired upon state entering and exiting': function() {
        var eventTraces = [];
        
        var eventHandlers = {
            'state/enter': [
                function(stateName) {
                    eventTraces.push('Entering ' + stateName);
                }],
            'state/exit': [
                function(stateName) {
                    eventTraces.push('Exiting ' + stateName);
                }]
        }

        var stateTransitions = {
            connect:      { ok: 'authenticate', ko: 'failure' },
            authenticate: { ok: 'success',      ko: 'failure' }
        }

        var stateHandlers = {
            connect:      function(continuation) { continuation('ok'); },
            authenticate: function(continuation) { continuation('ok'); },
            success: function() {},
            failure: function() {}
        }

        fsm.go('connect', {}, stateHandlers, stateTransitions, eventHandlers);
        
        assert.equalsArray(
            ['Entering connect',
             'Exiting connect',
             'Entering authenticate', 
             'Exiting authenticate',
             'Entering success'],
            eventTraces);
    },

    'Machine can be used through an object-oriented interface': function() {
        var client = {
            state: 'offline',

            transitions: {
                connect:      { ok: 'authenticate', ko: 'failure' },
                authenticate: { ok: 'success',      ko: 'failure' },
                success:      { },
                failure:      { }
            },

            connect: function(continuation) {
                continuation('ok');
            },
            authenticate: function(continuation) {
                continuation('ok');
            },
            success: function() { this.state = 'online' },
            failure: function() { },

            start: function() {
                var machine = new fsm.FSM();
                machine.context = this;
                machine.stateHandlers = this;
                machine.stateTransitions = this.transitions;
                machine.on(
                    'state/enter',
                    function() {
                    });
                machine.go('connect');
            }
        };

        assert.equals('offline', client.state);
        client.start();
        assert.equals('online', client.state);
    }
}

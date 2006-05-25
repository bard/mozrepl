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
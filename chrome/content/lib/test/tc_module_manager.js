var Specification = mozlab.mozunit.Specification;
var assert = mozlab.mozunit.assertions;

var spec = new Specification('Module Manager');

spec.stateThat = {
    'Can load package with path relative to requester\'s directory': function() {
        var module = new ModuleManager();
        var m = module.require('package', 'mock_module_1');
        assert.isDefined(m.sampleVariable);
        assert.isDefined(m.sampleFunction);
    }
};


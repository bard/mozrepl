repl.print('started loading package A');

repl.print('requiring package B from A');
module.require('package', 'circPkgB');

repl.print('finished loading package A');
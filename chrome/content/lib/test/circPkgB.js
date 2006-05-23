repl.print('started loading package B');

repl.print('requiring package A from B');
module.require('package', 'circPkgA');

repl.print('finished loading package B');
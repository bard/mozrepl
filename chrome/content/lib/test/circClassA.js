repl.print('started loading class A');

repl.print('requiring class B from A');
module.require('class', 'circClassB');

repl.print('finished loading class A');
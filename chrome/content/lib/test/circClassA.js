devbox.mozrepl.dump('started loading class A\n');

devbox.mozrepl.dump('requiring class B from A\n');
Module.require('class', 'circClassB');

devbox.mozrepl.dump('finished loading class A\n');
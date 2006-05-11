devbox.mozrepl.dump('started loading package B\n');

devbox.mozrepl.dump('requiring package A from B\n');
Module.require('package', 'circPkgA');

devbox.mozrepl.dump('finished loading package B\n');
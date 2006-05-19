/*
  Copyright (C) 2005-2006 by Massimiliano Mirra

  This program is free software; you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation; either version 2 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301 USA

  Author: Massimiliano Mirra, <bard [at] hyperstruct [dot] net>
*/

var devbox = (new ModuleHelper(['chrome://devbox/content'])).require('package', 'package');

(function(){
    devbox.mozrepl.server = new devbox.mozrepl.Server();
    devbox.mozrepl.ui = new devbox.mozrepl.Interface(devbox.mozrepl.server);
    devbox.mozrepl.dump = function(text) {
        devbox.mozrepl.server.getSession(0).output(text);
    }    
})();

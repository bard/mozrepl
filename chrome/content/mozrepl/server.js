/*
  Copyright (C) 2006 by Massimiliano Mirra

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

Components.classes['@mozilla.org/moz/jssubscript-loader;1']
.getService(Components.interfaces.mozIJSSubScriptLoader)
    .loadSubScript('chrome://mozlab/content/lib/module_manager.js');

const module = new ModuleManager(['chrome://mozlab/content']);
const REPL = module.require('class', 'repl');
const pref = Components
    .classes['@mozilla.org/preferences-service;1']
    .getService(Components.interfaces.nsIPrefService)
    .getBranch('extensions.mozlab.mozrepl.');

function init() {
    if(pref.getBoolPref('autoStart'))
        this.start(pref.getIntPref('port'));
}

function start(port) {
    var server = this;

    var socketListener = {
        onSocketAccepted: function(serv, transport) {
            try {
                var outstream = transport.openOutputStream(0, 0, 0);
                var stream = transport.openInputStream(0, 0, 0);
                var instream = Components
                .classes['@mozilla.org/scriptableinputstream;1']
                .createInstance(Components.interfaces.nsIScriptableInputStream);

                instream.init(stream);
            } catch(e) {
                dump('MozRepl: Error: ' + e + '\n');
            }
            dump('MozRepl: Accepted connection.\n');

            var window = Components
            .classes["@mozilla.org/appshell/window-mediator;1"]
            .getService(Components.interfaces.nsIWindowMediator)
            .getMostRecentWindow("navigator:browser");

            var session = new REPL(instream, outstream, server, window);

            var pump = Components
            .classes['@mozilla.org/network/input-stream-pump;1']
            .createInstance(Components.interfaces.nsIInputStreamPump);

            pump.init(stream, -1, -1, 0, 0, false);
            pump.asyncRead(session._networkListener, null);
            server.addSession(session);
        },
        onStopListening: function(serv, status) {
            
        }
    };

    this._sessions = [];
    try {
        this._serv = Components
            .classes['@mozilla.org/network/server-socket;1']
            .createInstance(Components.interfaces.nsIServerSocket);
        this._serv.init(port, true, -1);
        this._serv.asyncListen(socketListener);
        dump('MozRepl: Listening...\n');
    } catch(e) {
        dump('MozRepl: Exception: ' + e);
    }    
}

function stop() {
    dump('MozRepl: Closing...\n');
    this._serv.close();
    for each(var session in this._sessions)
        session.close();
    this._sessions.splice(0, this._sessions.length);

    delete this._serv;
}
 
function isActive() {
    if(this._serv)
        return true;
}
 
function addSession(session) {
    this._sessions.push(session);
}

function removeSession(session) {
    var index = this._sessions.indexOf(session);
    if(index != -1)
        this._sessions.splice(index, 1);
}

function getSession(index) {
    return this._sessions[index];
}

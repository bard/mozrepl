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

var Interactor = Module.require('class', 'interactor');

function constructor() {}

function start(port) {
    if(!port)
        port = 4242;
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

            var interactor = new Interactor(instream, outstream, server)
            interactor.name = (new Date()).getTime();

            var pump = Components
            .classes['@mozilla.org/network/input-stream-pump;1']
            .createInstance(Components.interfaces.nsIInputStreamPump);

            pump.init(stream, -1, -1, 0, 0, false);
            pump.asyncRead(interactor, null);
            server.addInteractor(interactor, interactor.name);
        },

        onStopListening: function(serv, status) {
        }
    };

    this._interactors = {};
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
    for(var interactorName in this._interactors) {
        this._interactors[interactorName].close();
        this.removeInteractor(interactorName);
    }
    delete this._serv;
}
 
function isActive() {
    if(this._serv)
        return true;
}
 
function addInteractor(interactor, name) {
    if(!this._interactors[name])
        this._interactors[name] = interactor;
}

function renameInteractor(oldName, newName) {
    this._interactors[newName] = this._interactors[oldName];
    delete this._interactors[oldName];
}

function removeInteractor(name) {
    delete this._interactors[name];
}

function getInteractor(name) {
    return this._interactors[name];
}
    
function getFirstInteractor() {
    for(name in this._interactors)
        return this._interactors[name];
    return null;
}

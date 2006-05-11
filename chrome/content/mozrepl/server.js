// Copyright (C) 2006 by Massimiliano Mirra
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301 USA
//
// Author: Massimiliano Mirra, <bard [at] hyperstruct [dot] net>

var MozRepl_Server = {
    Port: 4242,

    socketListener: {
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

            var pump = Components
            .classes['@mozilla.org/network/input-stream-pump;1']
            .createInstance(Components.interfaces.nsIInputStreamPump);
            pump.init(stream, -1, -1, 0, 0, false);
            pump.asyncRead(new MozRepl_Interactor(instream, outstream), null);
        }
    },

    start: function() {
        this.__interactors = {};
        try {
            this.__serv = Components
                .classes['@mozilla.org/network/server-socket;1']
                .createInstance(Components.interfaces.nsIServerSocket);
            this.__serv.init(this.Port, true, -1);
            this.__serv.asyncListen(this.socketListener);
            dump('MozRepl: Listening...\n');
        } catch(e) {
            dump('MozRepl: Exception: ' + e);
        }
    },

    stop: function() {
        dump('MozRepl: Closing...\n');
        this.__serv.close();
        delete this.__serv;
        delete this.__interactors;
    },
    
    isActive: function() {
        if(this.__serv)
            return true;
    },
    
    addInteractor: function(interactor, name) {
        if(!this.__interactors[name])
            this.__interactors[name] = interactor;
    },

    renameInteractor: function(oldName, newName) {
        this.__interactors[newName] = this.__interactors[oldName];
        delete this.__interactors[oldName];
    },

    removeInteractor: function(name) {
        delete this.__interactors[name];
    },

    getInteractor: function(name) {
        return this.__interactors[name];
    },

    getFirstInteractor: function() {
        for(name in this.__interactors)
            return this.__interactors[name];
        return null;
    }
};

// ----------------------------------------------------------------------

function MozRepl_dump(text, interactorName) {
    var inteactor;
    if(interactorName)
        interactor = MozRepl_Server.getInteractor(interactorName);
    else
        interactor = MozRepl_Server.getFirstInteractor();

    interactor.output(text);
}

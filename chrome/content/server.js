/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is MozRepl.
 *
 * The Initial Developer of the Original Code is
 * Massimiliano Mirra <bard [at] hyperstruct [dot] net>.
 * Portions created by the Initial Developer are Copyright (C) 2006-2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Massimiliano Mirra <bard [at] hyperstruct [dot] net>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */


// GLOBAL DEFINITIONS
// ----------------------------------------------------------------------

const Cc = Components.classes;
const Ci = Components.interfaces;
const loader = Cc['@mozilla.org/moz/jssubscript-loader;1']
    .getService(Ci.mozIJSSubScriptLoader);
const srvPref = Cc['@mozilla.org/preferences-service;1']
    .getService(Ci.nsIPrefService);
const srvObserver = Cc['@mozilla.org/observer-service;1']
    .getService(Ci.nsIObserverService);
const pref = srvPref.getBranch('extensions.mozrepl.');


function REPL() {};
loader.loadSubScript('chrome://mozrepl/content/repl.js', REPL.prototype);


// STATE
// ----------------------------------------------------------------------

var serv;


// CODE
// ----------------------------------------------------------------------

var sessions = {
    _list: [],

    add: function(session) {
        this._list.push(session);
    },

    remove: function(session) {
        var index = this._list.indexOf(session);
        if(index != -1)
            this._list.splice(index, 1);
    },

    get: function(index) {
        return this._list[index];
    },

    quit: function() {
        this._list.forEach(
            function(session) { session.quit; });
        this._list.splice(0, this._list.length);
    }
};


function start(port) {
    try {
        serv = Cc['@mozilla.org/network/server-socket;1']
            .createInstance(Ci.nsIServerSocket);
        serv.init(port, pref.getBoolPref('loopbackOnly'), -1);
        serv.asyncListen(this);
        log('MozRepl: Listening...');
        pref.setBoolPref('started', true);
    } catch(e) {
        log('MozRepl: Exception: ' + e);
    }
}

function onSocketAccepted(serv, transport) {
    try {
        var outstream = transport.openOutputStream(Ci.nsITransport.OPEN_BLOCKING , 0, 0);
        var outstreamutf8 = Cc['@mozilla.org/intl/converter-output-stream;1']
            .createInstance(Ci.nsIConverterOutputStream);
        outstreamutf8.init(outstream, 'UTF-8', 0, 0);

        var instream = transport.openInputStream(0, 0, 0);
        var instreamutf8 = Cc['@mozilla.org/intl/converter-input-stream;1']
            .createInstance(Ci.nsIConverterInputStream);
        instreamutf8.init(instream, 'UTF-8', 1024, 0);
    } catch(e) {
        log('MozRepl: Error: ' + e);
    }
    log('MozRepl: Accepted connection.');

    var window = Cc['@mozilla.org/appshell/window-mediator;1']
        .getService(Ci.nsIWindowMediator)
        .getMostRecentWindow('');

    var session = new REPL();
    session.onOutput = function(string) {
        outstreamutf8.writeString(string);
    };
    session.onQuit = function() {
        instream.close();
        outstream.close();
        sessions.remove(session);
    };
    session.init(window);

    var pump = Cc['@mozilla.org/network/input-stream-pump;1']
        .createInstance(Ci.nsIInputStreamPump);
    pump.init(instream, -1, -1, 0, 0, false);
    pump.asyncRead({
        onStartRequest: function(request, context) {},
        onStopRequest: function(request, context, status) {
                session.quit();
            },
        onDataAvailable: function(request, context, inputStream, offset, count) {
            var str = {}
            instreamutf8.readString(count, str)
            session.receive(str.value);
            }
        }, null);

    sessions.add(session);
}

function onStopListening(serv, status) {
}


function stop() {
    log('MozRepl: Closing...');
    serv.close();
    sessions.quit();
    pref.setBoolPref('started', false);
    serv = undefined;
}

function isActive() {
    if(serv)
        return true;
}

function observe(subject, topic, data) {
    /**
       NOTE:
       On Gecko 1.9.2 we're observing app-startup and then profile-after-change

       On Gecko 2.0 we're observing only profile-after-change 

       (See https://developer.mozilla.org/en/XPCOM/XPCOM_changes_in_Gecko_2.0)
     */
    switch(topic) {
    case 'app-startup': // Gecko 1.9.2 only
	srvObserver.addObserver(this, 'profile-after-change', false);
        break;
    case 'profile-after-change': // Gecko 1.9.2 and Gecko 2.0 
        srvObserver.addObserver(this, 'network:offline-status-changed', false);
        if(srvPref.getBranch('network.').getBoolPref('online') &&
           pref.getBoolPref('autoStart'))
            this.start(pref.getIntPref('port'));

        break;
    case 'network:offline-status-changed':
        switch(data) {
        case 'online':
            if(pref.getBoolPref('autoStart'))
                this.start(pref.getIntPref('port'));
            break;
        case 'offline':
            if(isActive())
                this.stop();
            break;
        }
        break;
    case 'quit-application-granted':
	this.stop();
    }
}

// UTILITIES
// ----------------------------------------------------------------------

function log(msg) {
    dump(msg + '\n');
}


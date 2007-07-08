/*
  Copyright (C) 2006,2007 by Massimiliano Mirra

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

const Ci = Components.interfaces;
const Cc = Components.classes;
const pref = Cc['@mozilla.org/preferences-service;1']
    .getService(Ci.nsIPrefService)
    .getBranch('extensions.mozlab.mozrepl.');


function initOverlay() {
    this._server = Components
        .classes['@hyperstruct.net/mozlab/mozrepl;1']
        .getService(Ci.nsIMozRepl);

    var server = this._server;
    window.addEventListener(
        'load', function(event) {
            document
                .getElementById('mozrepl-command-toggle')
                .setAttribute('label',
                              server.isActive() ? 'Stop Repl' : 'Start Repl');
        }, false);
}

function toggleServer(sourceCommand) {
    var port = pref.getIntPref('port');
    
    if(this._server.isActive())
        this._server.stop();        
    else
        this._server.start(port);
}

function togglePref(prefName) {
    pref.setBoolPref(prefName, !pref.getBoolPref(prefName));
}

function updateMenu(xulPopup) {
    document.getElementById('mozrepl-command-toggle')
        .setAttribute('label', this._server.isActive() ? 'Stop' : 'Start');
    document.getElementById('mozrepl-command-listen-external')
        .setAttribute('checked', !pref.getBoolPref('loopbackOnly'));
    document.getElementById('mozrepl-command-autostart')
        .setAttribute('checked', pref.getBoolPref('autoStart'));
}

function changePort() {
    var value = window.prompt('Choose listening port', pref.getIntPref('port'));
    if(value)
        pref.setIntPref('port', value);
}    

function openURL(url) {
    function hostAppIsBrowser() {
        return (Cc['@mozilla.org/xre/app-info;1']
                .getService(Ci.nsIXULAppInfo)
                .ID == '{ec8030f7-c20a-464f-9b0e-13a3a9e97384}');
    }

    function openExternally(url) {
        Cc['@mozilla.org/uriloader/external-protocol-service;1']
            .getService(Ci.nsIExternalProtocolService)
            .loadUrl(Cc['@mozilla.org/network/io-service;1']
                     .getService(Ci.nsIIOService)
                     .newURI(url, null, null));
    }

    function openInternally(url, newTab) {
        if(newTab)
            getBrowser().selectedTab = getBrowser().addTab(url);
        else
            getBrowser().loadURI(url);
    }

    if(hostAppIsBrowser())
        openInternally(url, true);
    else
        openExternally(url);
}

function openHelp() {
    openURL('http://dev.hyperstruct.net/mozlab/wiki/MozRepl');
}

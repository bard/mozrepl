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

const Ci = Components.interfaces;
const Cc = Components.classes;
const pref = Cc['@mozilla.org/preferences-service;1']
    .getService(Ci.nsIPrefService)
    .getBranch('extensions.mozrepl.');


// GLOBAL STATE
// ----------------------------------------------------------------------

var server;


// INITIALIZATION
// ----------------------------------------------------------------------

function initOverlay() {
    server = Cc['@hyperstruct.net/mozlab/mozrepl;1'].getService(Ci.nsIMozRepl);

    // upgradeCheck(
    //     'mozrepl@hyperstruct.net',
    //     'extensions.mozrepl.version', {
    //         onFirstInstall: function() {
    //             openURL('http://hyperstruct.net/projects/mozlab/news');
    //         },

    //         onUpgrade: function() {
    //             openURL('http://hyperstruct.net/projects/mozlab/news');
    //         }
    //     });
}

function togglePref(prefName) {
    pref.setBoolPref(prefName, !pref.getBoolPref(prefName));
}

function toggleServer(sourceCommand) {
    var port = pref.getIntPref('port');

    if(server.isActive())
        server.stop();
    else
        server.start(port);

    pref.setBoolPref('started', server.isActive());
}

function updatePreferences(prefWin) {
    if(server) {
	document.getElementById('startstop')
	    .setAttribute('label', server.isActive() ? 'Stop' : 'Start');
    }
    else {
	document.getElementById('startstop')
	    .setAttribute('label', pref.getBoolPref("started") ? 'Stop' : 'Start');
    }
}

function updateMenu(xulPopup) {
    document.getElementById('mozrepl-command-toggle')
        .setAttribute('label', server.isActive() ? 'Stop' : 'Start');
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

function openHelp() {
    openURL('http://github.com/bard/mozrepl/wikis/home');
}

function openURL(url) {
    if(typeof(getBrowser().addTab) == 'function')
        // XXX bard: apparently needed otherwise it won't have any
        // effect when called from an onload handler
        setTimeout(function() {
            getBrowser().selectedTab = getBrowser().addTab(url)
        }, 500);
    else
        Cc['@mozilla.org/uriloader/external-protocol-service;1']
            .getService(Ci.nsIExternalProtocolService)
            .loadUrl(Cc['@mozilla.org/network/io-service;1']
                     .getService(Ci.nsIIOService)
                     .newURI(url, null, null));
}

function upgradeCheck(id, versionPref, actions) {
    const pref = Cc['@mozilla.org/preferences-service;1']
    .getService(Ci.nsIPrefService);

    function getExtensionVersion(id) {
        return Cc['@mozilla.org/extensions/manager;1']
        .getService(Ci.nsIExtensionManager)
        .getItemForID(id).version;
    }

    function compareVersions(a, b) {
        return Cc['@mozilla.org/xpcom/version-comparator;1']
        .getService(Ci.nsIVersionComparator)
        .compare(curVersion, prevVersion);
    }

    var curVersion = getExtensionVersion(id);
    if(curVersion) {
        var prevVersion = pref.getCharPref(versionPref);
        if(prevVersion == '') {
            if(typeof(actions.onFirstInstall) == 'function')
                actions.onFirstInstall();
        } else {
            if(compareVersions(curVersion, prevVersion) > 0)
                if(typeof(actions.onUpgrade) == 'function')
                    actions.onUpgrade();
        }

        pref.setCharPref(versionPref, curVersion);
    }
}

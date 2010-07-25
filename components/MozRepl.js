/* ---------------------------------------------------------------------- */
/*                      Component specific code                           */

const CLASS_ID = Components.ID('{57f4284b-1f9b-4990-8525-9ed5cbb23e01}');
const CLASS_NAME = 'MozRepl Server XPCOM';
const CONTRACT_ID = '@hyperstruct.net/mozlab/mozrepl;1';
const SOURCE = 'chrome://mozrepl/content/server.js';
const INTERFACE = Components.interfaces.nsIMozRepl;

/* ---------------------------------------------------------------------- */
/*                           Template code                                */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;
const loader = Cc['@mozilla.org/moz/jssubscript-loader;1']
    .getService(Ci.mozIJSSubScriptLoader);

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function MozRepl() {
    this.wrappedJSObject = this;
}

MozRepl.prototype = {
  classDescription: CLASS_NAME,
  classID: CLASS_ID,
  contactID: CONTRACT_ID,
  QueryInterface: XPCOMUtils.generateQI([
    INTERFACE,
    Ci.nsISupports,  
    Ci.nsIObserver
  ]),

  reload: function() {
    loader.loadSubScript(SOURCE, this.__proto__);
  }
};
loader.loadSubScript(SOURCE, MozRepl.prototype);

/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([MozRepl]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([MozRepl]);
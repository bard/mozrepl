const CATEGORY = 'c-mozrepl';
const CONTRACT_ID = '@mozilla.org/commandlinehandler/general-startup;1?type=repl';


const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const CLASS_ID = Components.ID('{f62cbe68-ee70-4264-8586-66df185244f5}');

const INTERFACE = Ci.nsICommandLineHandler;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function MozReplCommandLineHandler() {

}

MozReplCommandLineHandler.prototype = {
  classDescription: "MozREPL command line handler",
  classID: CLASS_ID,
  contactID: CONTRACT_ID,
  QueryInterface: XPCOMUtils.generateQI([
    Ci.nsICommandLineHandler
  ]),

  handle: function(cmdLine) {
    var uri;
    try {
      uri = cmdLine.handleFlagWithParam('repl', false);
    } catch (e) {
    }

    if(uri || cmdLine.handleFlag('repl', false))
      Cc['@hyperstruct.net/mozlab/mozrepl;1']
      .getService(Ci.nsIMozRepl)
      .start(uri ? parseInt(uri) : 4242);
  },

  helpInfo: '-repl              Start REPL.\n'
};

/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([MozReplCommandLineHandler]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([MozReplCommandLineHandler]);
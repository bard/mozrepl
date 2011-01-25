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
if (XPCOMUtils.generateNSGetFactory) /* Gecko 2 */
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([MozReplCommandLineHandler]);
else { /* Gecko 1.9.2 */
    // The following line, contrary to what the documentation says,
    // does not appear to work, so we use the old verbiage.
    //
    // var NSGetModule = XPCOMUtils.generateNSGetModule([MozReplCommandLineHandler]);
    var Handler = {
	QueryInterface: function(iid) {
            if(iid.equals(Ci.nsICommandLineHandler) ||
               iid.equals(Ci.nsIFactory) ||
               iid.equals(Ci.nsISupports))
		return this;

            throw Cr.NS_ERROR_NO_INTERFACE;
	},

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
	
	helpInfo: '-repl              Start REPL.\n',

	createInstance: function(outer, iid) {
            if(outer != null)
		throw Cr.NS_ERROR_NO_AGGREGATION;
	    
            return this.QueryInterface(iid);
	},

	lockFactory: function(lock) {
            /* no-op */
	}
    };


    var Module = {
	QueryInterface: function(iid) {
            if(iid.equals(Ci.nsIModule) ||
               iid.equals(Ci.nsISupports))
		return this;
	    
            throw Cr.NS_ERROR_NO_INTERFACE;
	},

	getClassObject: function(compMgr, cid, iid) {
            if(cid.equals(CLASS_ID))
		return Handler.QueryInterface(iid);
	    
            throw Cr.NS_ERROR_NOT_REGISTERED;
	},

	registerSelf: function(compMgr, fileSpec, location, type) {
            compMgr.QueryInterface(Ci.nsIComponentRegistrar);
            compMgr.registerFactoryLocation(CLASS_ID, 'Handler', CONTRACT_ID, fileSpec, location, type);

            var catMan = Cc['@mozilla.org/categorymanager;1'].getService(Ci.nsICategoryManager);
            catMan.addCategoryEntry('command-line-handler', CATEGORY, CONTRACT_ID, true, true);
	},

	unregisterSelf: function mod_unreg(compMgr, location, type) {
            compMgr.QueryInterface(Ci.nsIComponentRegistrar);
            compMgr.unregisterFactoryLocation(CLASS_ID, location);
	    
            var catMan = Cc['@mozilla.org/categorymanager;1'].getService(Ci.nsICategoryManager);
            catMan.deleteCategoryEntry('command-line-handler', CATEGORY);
	},
	
	canUnload: function (compMgr) {
            return true;
	}
    };
    
    var NSGetModule = function (comMgr, fileSpec) { return Module; }
}
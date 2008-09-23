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

function Component() {
    this.wrappedJSObject = this;
}

Component.prototype = {
    reload: function() {
        loader.loadSubScript(SOURCE, this.__proto__);
    },

    QueryInterface: function(aIID) {
        if(!aIID.equals(INTERFACE) &&
           !aIID.equals(Ci.nsISupports) &&
           !aIID.equals(Ci.nsIObserver))
            throw Cr.NS_ERROR_NO_INTERFACE;
        return this;
    }
};
loader.loadSubScript(SOURCE, Component.prototype);

var Factory = {
    createInstance: function(aOuter, aIID) {
        if(aOuter != null)
            throw Cr.NS_ERROR_NO_AGGREGATION;
        var component = new Component();

        return component.QueryInterface(aIID);
    }
};

var Module = {
    _firstTime: true,

    registerSelf: function(aCompMgr, aFileSpec, aLocation, aType) {
        if (this._firstTime) {
            this._firstTime = false;
            throw Components.results.NS_ERROR_FACTORY_REGISTER_AGAIN;
        };

        aCompMgr = aCompMgr.QueryInterface(Ci.nsIComponentRegistrar);
        aCompMgr.registerFactoryLocation(
            CLASS_ID, CLASS_NAME, CONTRACT_ID, aFileSpec, aLocation, aType);

        var catMan = Cc['@mozilla.org/categorymanager;1'].
            getService(Ci.nsICategoryManager);
        catMan.addCategoryEntry('app-startup', 'MozRepl', 'service,' + CONTRACT_ID, true, true);
    },

    unregisterSelf: function(aCompMgr, aLocation, aType) {pp
        aCompMgr = aCompMgr.QueryInterface(Ci.nsIComponentRegistrar);
        aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);

        var catMan = Cc['@mozilla.org/categorymanager;1'].
            getService(Ci.nsICategoryManager);
        catMan.deleteCategoryEntry('app-startup', 'service,' + CONTRACT_ID, true);
    },

    getClassObject: function(aCompMgr, aCID, aIID) {
        if (!aIID.equals(Ci.nsIFactory))
            throw Cr.NS_ERROR_NOT_IMPLEMENTED;

        if (aCID.equals(CLASS_ID))
            return Factory;

        throw Cr.NS_ERROR_NO_INTERFACE;        
    },

    canUnload: function(aCompMgr) { return true; }
};

function NSGetModule(aCompMgr, aFileSpec) { return Module; }
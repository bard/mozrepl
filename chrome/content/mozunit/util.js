function fileToFileUrl(file) {
    return Components
        .classes['@mozilla.org/network/io-service;1']
        .getService(Components.interfaces.nsIIOService)
        .getProtocolHandler('file')
        .QueryInterface(Components.interfaces.nsIFileProtocolHandler)
        .getURLSpecFromFile(file); 
}

function fileUrlToPath(fileUrl) {
    return Components
        .classes['@mozilla.org/network/io-service;1'] 
        .getService(Components.interfaces.nsIIOService)
        .getProtocolHandler('file')
        .QueryInterface(Components.interfaces.nsIFileProtocolHandler)
        .getFileFromURLSpec(fileUrl)
        .path;
}

function removeChildrenOf(element) {
    while(element.lastChild)
        element.removeChild(element.lastChild);
}

function padLeft(thing, width, padder) {
    var paddedString = '';
    var string = thing.toString();
    return (string.length < width) ?
        (function() {
            for(var i=0, l=width-string.length; i<l; i++)
                paddedString += padder;
            return paddedString + string;
        })() :
        string;
}


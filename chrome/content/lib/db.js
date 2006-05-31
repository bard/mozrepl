
function DB() {
    this._storage = [];
    this._watches = [];
}

DB.prototype = {
    put: function(object) {
        _put1(object, this._storage);
        _handle1(object, this._watches, _match1);
        return object;
    },

    get: function(pattern, count) {
        //'all' not tested
        return _get1(count, pattern, this._storage, _match1);
    },

    on: function(pattern, handler) {
        this._watches.push({pattern: pattern, handler: handler});
    },

    dump: function() {
        _dump1(this._storage);
    }
};

// *** Side effect free functions ***

function _put1(object, storage, indices) {
    // if(object.id) would choke on id=0 which is false! write test against this
    if(object.id != undefined)
        storage[object.id] = object;
    else 
        object.id = storage.push(object) - 1;
}

function _handle1(object, watches, matcher) {
    for each(var watch in watches) {
        if(matcher(object, watch.pattern))
            watch.handler(object);
    }
}

function _get1(count, template, storage, matcher) {
    var results = [];

    for each(var object in storage) {
        if(matcher(object, template))
            if(count == 'all')
                results.push(object);
            else 
                return object;
    }

    if(count == 'all')
        return results;
}

function _match1(object, template) {
    var pattern, value;
    for(var member in template) {
        value = object[member];
        pattern = template[member];
        
        if(pattern === undefined)
            ;
        else if(pattern && typeof(pattern) == 'function') {
            if(!pattern(value))
                return false;
        }
        else if(pattern && typeof(pattern.test) == 'function') {
            if(!pattern.test(value))
                return false;
        }
        else if(pattern && pattern.id) {
            if(pattern.id != value.id)
                return false;
        }
        else if(pattern != value)
            return false;
    } 

    return true;
}

function _dump1(storage) {
    var dump = [];
    for(var i=0, l=storage.length; i<l; i++)
        dump.push(i + ':\t' + storage[i].toSource());
    return dump.join('\n');
}
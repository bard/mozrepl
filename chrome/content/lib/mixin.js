function forward(source, messageName, destination) {
    source[messageName] = function() {
        // TODO: leave option to choose in which context the
        // forwarded method will run
        return destination[messageName].apply(destination, arguments) 
    }
}


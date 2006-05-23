//if(typeof(module) == 'object')
//module.declare('package');

function go(stateName, context, stateHandlers, stateTransitions, eventHandlers) {
    if(eventHandlers['state/enter'])
        for each(var eventHandler in eventHandlers['state/enter'])
            eventHandler.call(context, stateName);
            
    stateHandlers[stateName].call(
        context, function(exitResult) {
            if(eventHandlers['state/exit'])
                for each(var eventHandler in eventHandlers['state/exit']) 
                    eventHandler.call(context, stateName)
                
            var nextState = stateTransitions[stateName][exitResult];
            if(nextState)
                go(nextState, context, stateHandlers, stateTransitions, eventHandlers);
        });
}

function FSM() {
    this._eventHandlers = {};
}

FSM.prototype = {
    set context(val) {
        this._context = val;
    },

    set stateHandlers(val) {
        this._stateHandlers = val;
    },

    set stateTransitions(val) {
        this._stateTransitions = val;
    },

    on: function() {
        var eventName, eventHandler;
        for(var i=0, l=arguments.length; i<l; i+=2) {
            eventName = arguments[i];
            eventHandler = arguments[i+1];

            if(!this._eventHandlers[eventName])
                this._eventHandlers[eventName] = [];
            this._eventHandlers[eventName].push(eventHandler);
        }        
    },

    go: function(stateName) {
        go(
            stateName,
            this._context,
            this._stateHandlers,
            this._stateTransitions,
            this._eventHandlers);
    }
};